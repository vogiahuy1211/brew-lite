import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { order_status, item_size, user_role } from '@prisma/client';
import { assertTransition } from './order-state-machine';

// Phụ thu theo Size
const SIZE_SURCHARGE: Record<item_size, number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    // Thực hiện trong một Database Transaction với Optimistic Locking
    return this.prisma.$transaction(async (tx) => {
      if (typeof tx.$executeRaw === 'function') {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
      }

      // 0. Lấy danh sách sản phẩm từ Giỏ hàng trong Database (trừ khi là luồng Buy Now)
      let cartIdToUpdate: string | null = null;
      const orderedCartItemIds: string[] = [];
      let sourceItems: Array<{
        cartItemId?: string;
        productId: string;
        size: item_size;
        qty: number;
        toppingIds?: string[];
      }> = [];

      if (!dto.buyNow) {
        const userCart = await tx.carts?.findUnique({
          where: { user_id: userId },
          include: {
            CartItems: {
              orderBy: { created_at: 'asc' },
              include: {
                CartItemToppings: true,
              },
            },
          },
        });

        if (userCart && userCart.CartItems && userCart.CartItems.length > 0) {
          cartIdToUpdate = userCart.id;
          for (const ci of userCart.CartItems) {
            orderedCartItemIds.push(ci.id);
            sourceItems.push({
              cartItemId: ci.id,
              productId: ci.product_id,
              size: ci.size,
              qty: ci.quantity,
              toppingIds: ci.CartItemToppings.map((t: any) => t.topping_id),
            });
          }
        }
      }

      // Nếu giỏ hàng DB trống và có truyền dto.items (ví dụ luồng Buy Now hoặc test trực tiếp)
      if (sourceItems.length === 0 && dto.items && dto.items.length > 0) {
        sourceItems = dto.items.map((i) => ({
          productId: i.productId,
          size: i.size,
          qty: i.qty,
          toppingIds: i.toppingIds,
        }));
      }

      if (sourceItems.length === 0) {
        throw new BadRequestException('Giỏ hàng không có sản phẩm nào');
      }

      let subtotal = 0;
      const orderItemsToCreate: Array<{
        product_id: string;
        size: item_size;
        qty: number;
        unit_price: number;
        line_total: number;
        toppings: Array<{ topping_id: string; price: number }>;
      }> = [];

      // Tổng hợp cầu nguyên liệu trên toàn đơn hàng để kiểm tra chính xác khi có nhiều món dùng chung nguyên liệu
      const cumulativeIngredientDemand = new Map<
        string,
        { name: string; stock: number; needed: number }
      >();

      for (const item of sourceItems) {
        if (!Number.isInteger(item.qty) || item.qty <= 0) {
          throw new BadRequestException('Số lượng sản phẩm trong đơn hàng không hợp lệ');
        }

        // 1. Kiểm tra tồn kho và version sản phẩm cùng định mức nguyên liệu
        const product = await tx.products.findUnique({
          where: { id: item.productId },
          include: {
            RecipeItems: {
              include: { Ingredients: true },
            },
          },
        });

        if (!product) {
          throw new NotFoundException(`Sản phẩm với ID ${item.productId} không tồn tại`);
        }

        // Kiểm tra nguyên liệu trong kho theo định mức RecipeItems
        if (product.RecipeItems && product.RecipeItems.length > 0) {
          const matchingRecipes = product.RecipeItems.filter(
            (r: any) => !r.size || r.size === item.size,
          );
          for (const r of matchingRecipes) {
            const needed = Number(r.amount_needed) * item.qty;
            const current = cumulativeIngredientDemand.get(r.ingredient_id) || {
              name: r.Ingredients.name,
              stock: Number(r.Ingredients.stock_quantity),
              needed: 0,
            };
            current.needed += needed;
            cumulativeIngredientDemand.set(r.ingredient_id, current);

            if (current.needed > current.stock) {
              throw new ConflictException(
                `Nguyên liệu "${r.Ingredients.name}" trong kho không đủ để pha chế món "${product.name}"`,
              );
            }
          }
        }

        if (product.stock < item.qty) {
          throw new ConflictException(
            `Sản phẩm "${product.name}" không đủ tồn kho (còn ${product.stock}, yêu cầu ${item.qty})`,
          );
        }

        // 2. Trừ tồn kho bằng Optimistic Locking (WHERE version = product.version)
        const updateResult = await tx.products.updateMany({
          where: {
            id: item.productId,
            version: product.version,
            stock: { gte: item.qty },
          },
          data: {
            stock: { decrement: item.qty },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            `Xung đột khi đặt món "${product.name}", có người đã đặt trước. Vui lòng thử lại!`,
          );
        }

        // 3. Tính tiền theo size và toppings (luôn lấy giá từ Database)
        const basePrice = Number(product.price);
        const sizeSurcharge = SIZE_SURCHARGE[item.size] || 0;
        let toppingsPrice = 0;
        const itemToppingsList: Array<{ topping_id: string; price: number }> = [];

        if (item.toppingIds && item.toppingIds.length > 0) {
          const uniqueToppingIds = Array.from(new Set(item.toppingIds));
          const toppings = await tx.toppings.findMany({
            where: { id: { in: uniqueToppingIds } },
          });

          if (toppings.length !== uniqueToppingIds.length) {
            throw new NotFoundException('Một hoặc nhiều topping không tồn tại');
          }

          for (const top of toppings) {
            const topPrice = Number(top.price);
            toppingsPrice += topPrice;
            itemToppingsList.push({ topping_id: top.id, price: topPrice });
          }
        }

        const unitPrice = basePrice + sizeSurcharge + toppingsPrice;
        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;

        orderItemsToCreate.push({
          product_id: item.productId,
          size: item.size,
          qty: item.qty,
          unit_price: unitPrice,
          line_total: lineTotal,
          toppings: itemToppingsList,
        });
      }

      // 4. Áp mã khuyến mãi nếu có
      let discountAmount = 0;
      let promoId: string | null = null;

      if (dto.promoCode) {
        const promo = await tx.promotions.findUnique({
          where: { code: dto.promoCode.toUpperCase() },
        });

        if (promo && promo.is_active) {
          const now = new Date();
          const isStarted = !promo.start_at || promo.start_at <= now;
          const isNotExpired = !promo.end_at || promo.end_at >= now;

          if (isStarted && isNotExpired) {
            discountAmount = Number(promo.discount_amount);
            promoId = promo.id;
          }
        }
      }

      const finalAmount = Math.max(0, subtotal - discountAmount);

      // 5. Tạo đơn hàng với trạng thái PENDING
      const order = await tx.orders.create({
        data: {
          user_id: userId,
          promo_id: promoId,
          status: order_status.PENDING,
          subtotal,
          discount_amount: discountAmount,
          final_amount: finalAmount,
          OrderItems: {
            create: orderItemsToCreate.map((item) => ({
              product_id: item.product_id,
              size: item.size,
              qty: item.qty,
              unit_price: item.unit_price,
              line_total: item.line_total,
              OrderItemToppings: {
                create: item.toppings.map((t) => ({
                  topping_id: t.topping_id,
                  price_at_purchase: t.price,
                })),
              },
            })),
          },
        },
        include: {
          OrderItems: {
            include: {
              OrderItemToppings: {
                include: { Toppings: true },
              },
              Products: true,
            },
          },
        },
      });

      // 6. Xóa những sản phẩm đã được đưa vào đơn hàng khỏi giỏ hàng Database
      // (Nếu deferCartClear = true cho luồng chờ cổng thanh toán trực tuyến/xác nhận thanh toán,
      // việc xóa giỏ hàng sẽ được thực hiện ngay khi thanh toán thành công để tránh mất giỏ nếu thanh toán thất bại)
      if (!dto.buyNow && !dto.deferCartClear && cartIdToUpdate && orderedCartItemIds.length > 0) {
        await tx.cartItems.deleteMany({
          where: {
            id: { in: orderedCartItemIds },
            cart_id: cartIdToUpdate,
          },
        });
        await tx.carts.update({
          where: { id: cartIdToUpdate },
          data: { updated_at: new Date() },
        });
      }

      this.logger.log(`Tạo đơn hàng thành công #${order.id} cho user ${userId}`);

      return {
        id: order.id,
        status: order.status,
        subtotal,
        discountAmount,
        finalAmount,
        itemsCount: order.OrderItems.length,
        createdAt: order.created_at,
      };
    });
  }

  async findAllOrders() {
    return this.findAll();
  }

  async findUserOrders(userId: string) {
    return this.findByUser(userId);
  }

  async findByUser(userId: string) {
    const orders = await this.prisma.orders.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      include: {
        OrderItems: {
          include: {
            Products: true,
            OrderItemToppings: {
              include: { Toppings: true },
            },
          },
        },
        Payments: true,
      },
    });

    return orders.map((o) => ({
      id: o.id,
      status: o.status,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discount_amount),
      finalAmount: Number(o.final_amount),
      createdAt: o.created_at,
      items: o.OrderItems.map((item) => ({
        id: item.id,
        productName: item.Products.name,
        size: item.size,
        qty: item.qty,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
        toppings: item.OrderItemToppings.map((t) => t.Toppings.name),
      })),
      payments: o.Payments.map((p) => ({
        method: p.method,
        status: p.status,
        amount: Number(p.amount),
      })),
    }));
  }

  async findAll() {
    const orders = await this.prisma.orders.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        Users: {
          select: { id: true, email: true },
        },
        OrderItems: {
          include: {
            Products: true,
            OrderItemToppings: {
              include: { Toppings: true },
            },
          },
        },
        Payments: true,
      },
    });

    return orders.map((o) => ({
      id: o.id,
      userEmail: o.Users?.email,
      status: o.status,
      subtotal: Number(o.subtotal),
      discountAmount: Number(o.discount_amount),
      finalAmount: Number(o.final_amount),
      createdAt: o.created_at,
      items: o.OrderItems.map((item) => ({
        id: item.id,
        productName: item.Products.name,
        size: item.size,
        qty: item.qty,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
        toppings: item.OrderItemToppings.map((t) => t.Toppings.name),
      })),
      payments: o.Payments.map((p) => ({
        method: p.method,
        status: p.status,
        amount: Number(p.amount),
      })),
    }));
  }

  async findOne(orderId: string, userId?: string) {
    const where: any = { id: orderId };
    if (userId) {
      where.user_id = userId;
    }

    const order = await this.prisma.orders.findFirst({
      where,
      include: {
        OrderItems: {
          include: {
            Products: true,
            OrderItemToppings: {
              include: { Toppings: true },
            },
          },
        },
        Payments: true,
        Promotions: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    return {
      id: order.id,
      status: order.status,
      subtotal: Number(order.subtotal),
      discountAmount: Number(order.discount_amount),
      finalAmount: Number(order.final_amount),
      promoCode: order.Promotions?.code || null,
      createdAt: order.created_at,
      items: order.OrderItems.map((item) => ({
        id: item.id,
        productName: item.Products.name,
        imageUrl: item.Products.image_url,
        size: item.size,
        qty: item.qty,
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
        toppings: item.OrderItemToppings.map((t) => ({
          id: t.Toppings.id,
          name: t.Toppings.name,
          price: Number(t.price_at_purchase),
        })),
      })),
      payments: order.Payments.map((p) => ({
        method: p.method,
        status: p.status,
        amount: Number(p.amount),
      })),
    };
  }

  async updateStatus(
    orderId: string,
    nextStatus: order_status,
    user?: { id: string; role: user_role },
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    const isAdmin = user?.role === user_role.ADMIN;

    // 1. Kiểm tra quyền của khách hàng (hoặc user không phải Admin)
    if (user && !isAdmin) {
      if (order.user_id !== user.id) {
        throw new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này');
      }

      // Khách hàng hủy đơn: từ trạng thái PREPARING trở về sau là không cho khách hàng hủy đơn nữa
      if (nextStatus === order_status.CANCELLED) {
        if (
          order.status === order_status.PREPARING ||
          order.status === order_status.READY ||
          order.status === order_status.COMPLETED ||
          order.status === order_status.CANCELLED
        ) {
          throw new BadRequestException(
            'Đơn hàng đang hoặc đã được pha chế (từ PREPARING trở đi), không thể hủy đơn lúc này!',
          );
        }
      }
    }

    // 2. Chuyển đổi trạng thái (State Machine):
    if (isAdmin && nextStatus === order_status.CANCELLED) {
      if (order.status === order_status.COMPLETED || order.status === order_status.CANCELLED) {
        throw new BadRequestException('Không thể hủy đơn hàng đã hoàn tất hoặc đã hủy!');
      }
    } else {
      assertTransition(order.status, nextStatus);
    }

    // 3. Thực hiện chuyển trạng thái và CHỈ trừ nguyên liệu khi chuyển sang PREPARING (đang pha)
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.orders.update({
        where: { id: orderId },
        data: { status: nextStatus },
      });

      // Nếu chuyển sang trạng thái PREPARING và trước đó chưa ở PREPARING
      if (nextStatus === order_status.PREPARING && order.status !== order_status.PREPARING) {
        this.logger.log(`Đơn hàng #${orderId} chuyển sang PREPARING -> Bắt đầu trừ nguyên liệu kho`);
        await this.inventoryService.deductOrderIngredients(tx, orderId);
      }

      return updated;
    });
  }
}
