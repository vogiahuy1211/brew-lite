import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto, UpdateCartItemDto, SyncCartDto } from './dto/cart.dto';
import { item_size } from '@prisma/client';

export const SIZE_SURCHARGE: Record<item_size, number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

export function normalizeToppingSignature(toppingIds?: string[]): {
  sortedIds: string[];
  signature: string;
} {
  if (!toppingIds || toppingIds.length === 0) {
    return { sortedIds: [], signature: '' };
  }
  const uniqueSorted = Array.from(new Set(toppingIds)).sort();
  return {
    sortedIds: uniqueSorted,
    signature: uniqueSorted.join(','),
  };
}

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private async lockUserCart(tx: any, userId: string) {
    if (typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    }
  }

  /**
   * Tính toán giới hạn nguyên liệu & tồn kho cho danh sách món trong giỏ
   */
  private async validateStockAndRecipesForCart(
    tx: any,
    items: Array<{
      id?: string;
      productId: string;
      productName: string;
      productStock: number;
      size: item_size;
      quantity: number;
      toppingIds: string[];
    }>,
  ) {
    // 1. Kiểm tra tổng số lượng theo từng product_id so với Products.stock
    const productQtyMap = new Map<string, { name: string; stock: number; totalQty: number }>();
    for (const item of items) {
      if (item.productStock <= 0) {
        throw new BadRequestException(`Sản phẩm "${item.productName}" hiện đã hết hàng`);
      }
      const prev = productQtyMap.get(item.productId) || {
        name: item.productName,
        stock: item.productStock,
        totalQty: 0,
      };
      prev.totalQty += item.quantity;
      productQtyMap.set(item.productId, prev);
    }

    for (const [, info] of productQtyMap.entries()) {
      if (info.totalQty > info.stock) {
        throw new BadRequestException(
          `Số lượng sản phẩm "${info.name}" trong giỏ (${info.totalQty}) vượt quá tồn kho hiện có (${info.stock})`,
        );
      }
    }

    // 2. Kiểm tra định mức nguyên liệu pha chế (RecipeItems) nếu có
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const allToppingIds = Array.from(new Set(items.flatMap((i) => i.toppingIds)));

    const [productRecipes, toppingRecipes] = await Promise.all([
      tx.recipeItems.findMany({
        where: { product_id: { in: productIds } },
        include: { Ingredients: true },
      }),
      allToppingIds.length > 0
        ? tx.recipeItems.findMany({
            where: { topping_id: { in: allToppingIds } },
            include: { Ingredients: true },
          })
        : Promise.resolve([]),
    ]);

    const ingredientDemand = new Map<
      string,
      { name: string; stock: number; required: number }
    >();

    for (const item of items) {
      const pRecs = productRecipes.filter(
        (r: any) => r.product_id === item.productId && (!r.size || r.size === item.size),
      );
      for (const r of pRecs) {
        const needed = Number(r.amount_needed) * item.quantity;
        const curr = ingredientDemand.get(r.ingredient_id) || {
          name: r.Ingredients.name,
          stock: Number(r.Ingredients.stock_quantity),
          required: 0,
        };
        curr.required += needed;
        ingredientDemand.set(r.ingredient_id, curr);
      }

      if (item.toppingIds.length > 0) {
        const tRecs = toppingRecipes.filter(
          (r: any) => r.topping_id && item.toppingIds.includes(r.topping_id),
        );
        for (const r of tRecs) {
          const needed = Number(r.amount_needed) * item.quantity;
          const curr = ingredientDemand.get(r.ingredient_id) || {
            name: r.Ingredients.name,
            stock: Number(r.Ingredients.stock_quantity),
            required: 0,
          };
          curr.required += needed;
          ingredientDemand.set(r.ingredient_id, curr);
        }
      }
    }

    for (const [, ing] of ingredientDemand.entries()) {
      if (ing.required > ing.stock) {
        throw new BadRequestException(
          `Nguyên liệu "${ing.name}" trong kho không đủ để đáp ứng số lượng yêu cầu`,
        );
      }
    }
  }

  /**
   * Trả về thông tin chi tiết giỏ hàng, tính toán giá và tồn kho trực tiếp từ Database
   */
  async buildCartResponse(txOrPrisma: any, userId: string) {
    const cart = await txOrPrisma.carts.findUnique({
      where: { user_id: userId },
      include: {
        CartItems: {
          orderBy: { created_at: 'asc' },
          include: {
            Products: {
              include: {
                RecipeItems: {
                  include: { Ingredients: true },
                },
              },
            },
            CartItemToppings: {
              include: {
                Toppings: {
                  include: {
                    RecipeItems: {
                      include: { Ingredients: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || !cart.CartItems || cart.CartItems.length === 0) {
      return {
        id: cart?.id ?? null,
        userId,
        items: [],
        totalItems: 0,
        totalQuantity: 0,
        totalPrice: 0,
        updatedAt: cart?.updated_at ?? null,
      };
    }

    // Tính tổng cầu nguyên liệu và sản phẩm trên toàn giỏ để xác định maxAvailableQty cho từng dòng
    const totalIngredientDemand = new Map<string, number>();
    const totalProductDemand = new Map<string, number>();

    const itemUnitIngredientDemands = new Map<
      string,
      Map<string, { name: string; stock: number; perCup: number }>
    >();

    for (const ci of cart.CartItems) {
      totalProductDemand.set(
        ci.product_id,
        (totalProductDemand.get(ci.product_id) || 0) + ci.quantity,
      );

      const unitMap = new Map<string, { name: string; stock: number; perCup: number }>();
      const pRecipes = (ci.Products?.RecipeItems || []).filter(
        (r: any) => !r.size || r.size === ci.size,
      );
      for (const r of pRecipes) {
        const prev = unitMap.get(r.ingredient_id);
        unitMap.set(r.ingredient_id, {
          name: r.Ingredients.name,
          stock: Number(r.Ingredients.stock_quantity),
          perCup: (prev?.perCup || 0) + Number(r.amount_needed),
        });
      }

      for (const cit of ci.CartItemToppings || []) {
        for (const r of cit.Toppings?.RecipeItems || []) {
          const prev = unitMap.get(r.ingredient_id);
          unitMap.set(r.ingredient_id, {
            name: r.Ingredients.name,
            stock: Number(r.Ingredients.stock_quantity),
            perCup: (prev?.perCup || 0) + Number(r.amount_needed),
          });
        }
      }

      itemUnitIngredientDemands.set(ci.id, unitMap);

      for (const [ingId, info] of unitMap.entries()) {
        totalIngredientDemand.set(
          ingId,
          (totalIngredientDemand.get(ingId) || 0) + info.perCup * ci.quantity,
        );
      }
    }

    let totalQuantity = 0;
    let totalPrice = 0;

    const items = cart.CartItems.map((ci: any) => {
      const product = ci.Products;
      const basePrice = Number(product.price);
      const sizeSurcharge = SIZE_SURCHARGE[ci.size as item_size] || 0;

      const toppings = (ci.CartItemToppings || [])
        .map((cit: any) => ({
          id: cit.Toppings.id,
          name: cit.Toppings.name,
          price: Number(cit.Toppings.price),
        }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id));

      const toppingsPrice = toppings.reduce((sum: number, t: any) => sum + t.price, 0);
      const unitPrice = basePrice + sizeSurcharge + toppingsPrice;
      const lineTotal = unitPrice * ci.quantity;

      // Tính giới hạn tồn kho khả dụng tối đa cho dòng này
      const otherVariantsProductQty =
        (totalProductDemand.get(ci.product_id) || 0) - ci.quantity;
      let maxAvailableQty = Math.max(0, product.stock - otherVariantsProductQty);
      let limitingIngredient: string | null = null;
      let canIncrease = ci.quantity < maxAvailableQty;

      const unitMap = itemUnitIngredientDemands.get(ci.id);
      if (unitMap) {
        for (const [ingId, info] of unitMap.entries()) {
          if (info.perCup > 0) {
            const totalUsed = totalIngredientDemand.get(ingId) || 0;
            const usedByOthers = totalUsed - info.perCup * ci.quantity;
            const remainingStock = Math.max(0, info.stock - usedByOthers);
            const maxByIng = Math.floor(remainingStock / info.perCup);
            if (maxByIng < maxAvailableQty) {
              maxAvailableQty = maxByIng;
              limitingIngredient = info.name;
            }
            if (totalUsed + info.perCup > info.stock) {
              canIncrease = false;
              if (!limitingIngredient) {
                limitingIngredient = info.name;
              }
            }
          }
        }
      }

      canIncrease = canIncrease && ci.quantity < maxAvailableQty;
      const isAvailable = product.stock > 0 && maxAvailableQty > 0 && ci.quantity <= maxAvailableQty;
      const stockStatus =
        product.stock <= 0 || maxAvailableQty <= 0
          ? 'OUT_OF_STOCK'
          : ci.quantity > maxAvailableQty
          ? 'INSUFFICIENT_STOCK'
          : 'IN_STOCK';

      totalQuantity += ci.quantity;
      totalPrice += lineTotal;

      return {
        id: ci.id,
        cartId: ci.cart_id,
        productId: product.id,
        name: product.name,
        imageUrl: product.image_url,
        size: ci.size,
        toppings,
        basePrice,
        sizeSurcharge,
        toppingsPrice,
        price: unitPrice,
        unitPrice,
        quantity: ci.quantity,
        qty: ci.quantity,
        subtotal: lineTotal,
        lineTotal,
        stock: maxAvailableQty,
        productStock: product.stock,
        maxAvailableQty,
        isAvailable,
        stockStatus,
        canIncrease,
        limitingIngredient,
        createdAt: ci.created_at,
        updatedAt: ci.updated_at,
      };
    });

    return {
      id: cart.id,
      userId,
      items,
      totalItems: totalQuantity,
      totalQuantity,
      totalPrice,
      updatedAt: cart.updated_at,
    };
  }

  /**
   * 4.1. Lấy giỏ hàng của người dùng hiện tại
   */
  async getCart(userId: string) {
    return this.buildCartResponse(this.prisma, userId);
  }

  /**
   * 4.2. Thêm sản phẩm vào giỏ hàng
   */
  async addItem(userId: string, dto: AddCartItemDto) {
    const requestedQty = dto.quantity ?? dto.qty ?? 1;
    if (!Number.isInteger(requestedQty) || requestedQty < 1) {
      throw new BadRequestException('Số lượng sản phẩm phải là số nguyên dương');
    }

    const size: item_size = dto.size ?? item_size.M;
    const { sortedIds, signature } = normalizeToppingSignature(dto.toppingIds);

    return this.prisma.$transaction(async (tx) => {
      await this.lockUserCart(tx, userId);

      // 1. Kiểm tra sản phẩm tồn tại
      const product = await tx.products.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException(`Sản phẩm với ID "${dto.productId}" không tồn tại`);
      }

      if (product.stock <= 0) {
        throw new BadRequestException(`Sản phẩm "${product.name}" hiện đã hết hàng`);
      }

      // 2. Kiểm tra toppings nếu có
      if (sortedIds.length > 0) {
        const foundToppings = await tx.toppings.findMany({
          where: { id: { in: sortedIds } },
        });
        if (foundToppings.length !== sortedIds.length) {
          throw new NotFoundException('Một hoặc nhiều topping được chọn không tồn tại');
        }
      }

      // 3. Lấy hoặc tạo Cart cho user
      const cart = await tx.carts.upsert({
        where: { user_id: userId },
        create: { user_id: userId },
        update: { updated_at: new Date() },
      });

      // 4. Lấy danh sách các CartItems hiện có
      const currentItems = await tx.cartItems.findMany({
        where: { cart_id: cart.id },
        include: {
          Products: true,
          CartItemToppings: true,
        },
      });

      const existingItem = currentItems.find(
        (i) =>
          i.product_id === dto.productId &&
          i.size === size &&
          i.topping_signature === signature,
      );

      const newQuantity = (existingItem ? existingItem.quantity : 0) + requestedQty;

      // 5. Xây dựng danh sách dự kiến sau khi thêm để kiểm tra tổng tồn kho & nguyên liệu
      const projectedItems = currentItems
        .filter((i) => i.id !== existingItem?.id)
        .map((i) => ({
          id: i.id as string | undefined,
          productId: i.product_id,
          productName: i.Products.name,
          productStock: i.Products.stock,
          size: i.size,
          quantity: i.quantity,
          toppingIds: i.CartItemToppings.map((t) => t.topping_id),
        }));

      projectedItems.push({
        id: existingItem?.id,
        productId: product.id,
        productName: product.name,
        productStock: product.stock,
        size,
        quantity: newQuantity,
        toppingIds: sortedIds,
      });

      await this.validateStockAndRecipesForCart(tx, projectedItems);

      // 6. Lưu hoặc cộng dồn CartItem
      if (existingItem) {
        await tx.cartItems.update({
          where: { id: existingItem.id },
          data: {
            quantity: newQuantity,
            updated_at: new Date(),
          },
        });
      } else {
        await tx.cartItems.create({
          data: {
            cart_id: cart.id,
            product_id: product.id,
            size,
            topping_signature: signature,
            quantity: newQuantity,
            CartItemToppings: {
              create: sortedIds.map((tid) => ({ topping_id: tid })),
            },
          },
        });
      }

      await tx.carts.update({
        where: { id: cart.id },
        data: { updated_at: new Date() },
      });

      return this.buildCartResponse(tx, userId);
    });
  }

  /**
   * 4.3. Cập nhật số lượng sản phẩm trong giỏ hàng
   */
  async updateItemQuantity(userId: string, cartItemId: string, dto: UpdateCartItemDto) {
    const newQuantity = dto.quantity ?? dto.qty;
    if (newQuantity === undefined || !Number.isInteger(newQuantity) || newQuantity < 1) {
      throw new BadRequestException('Số lượng phải là số nguyên dương (>= 1)');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockUserCart(tx, userId);

      const cartItem = await tx.cartItems.findUnique({
        where: { id: cartItemId },
        include: {
          Carts: true,
          Products: true,
          CartItemToppings: true,
        },
      });

      if (!cartItem) {
        throw new NotFoundException('Sản phẩm trong giỏ hàng không tồn tại');
      }

      if (cartItem.Carts.user_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền thao tác trên giỏ hàng của người khác');
      }

      const currentItems = await tx.cartItems.findMany({
        where: { cart_id: cartItem.cart_id },
        include: {
          Products: true,
          CartItemToppings: true,
        },
      });

      const projectedItems = currentItems.map((i) => ({
        id: i.id,
        productId: i.product_id,
        productName: i.Products.name,
        productStock: i.Products.stock,
        size: i.size,
        quantity: i.id === cartItemId ? newQuantity : i.quantity,
        toppingIds: i.CartItemToppings.map((t) => t.topping_id),
      }));

      await this.validateStockAndRecipesForCart(tx, projectedItems);

      await tx.cartItems.update({
        where: { id: cartItemId },
        data: {
          quantity: newQuantity,
          updated_at: new Date(),
        },
      });

      await tx.carts.update({
        where: { id: cartItem.cart_id },
        data: { updated_at: new Date() },
      });

      return this.buildCartResponse(tx, userId);
    });
  }

  /**
   * 4.4. Xóa một sản phẩm khỏi giỏ hàng
   */
  async removeItem(userId: string, cartItemId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockUserCart(tx, userId);

      const cartItem = await tx.cartItems.findUnique({
        where: { id: cartItemId },
        include: { Carts: true },
      });

      if (!cartItem) {
        throw new NotFoundException('Sản phẩm trong giỏ hàng không tồn tại');
      }

      if (cartItem.Carts.user_id !== userId) {
        throw new ForbiddenException('Bạn không có quyền xóa sản phẩm khỏi giỏ hàng của người khác');
      }

      await tx.cartItems.delete({
        where: { id: cartItemId },
      });

      await tx.carts.update({
        where: { id: cartItem.cart_id },
        data: { updated_at: new Date() },
      });

      return this.buildCartResponse(tx, userId);
    });
  }

  /**
   * 4.5. Xóa toàn bộ sản phẩm trong giỏ hàng của người dùng hiện tại
   */
  async clearCart(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockUserCart(tx, userId);

      const cart = await tx.carts.findUnique({
        where: { user_id: userId },
      });

      if (cart) {
        await tx.cartItems.deleteMany({
          where: { cart_id: cart.id },
        });

        await tx.carts.update({
          where: { id: cart.id },
          data: { updated_at: new Date() },
        });
      }

      return this.buildCartResponse(tx, userId);
    });
  }

  /**
   * 6. Đồng bộ giỏ hàng tạm (Guest Cart) vào Database sau khi đăng nhập
   * Cộng dồn số lượng nếu trùng biến thể và giới hạn theo tồn kho hiện tại, không ghi đè mất dữ liệu cũ.
   */
  async syncGuestCart(userId: string, dto: SyncCartDto) {
    if (!dto.items || dto.items.length === 0) {
      return this.getCart(userId);
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockUserCart(tx, userId);

      const cart = await tx.carts.upsert({
        where: { user_id: userId },
        create: { user_id: userId },
        update: { updated_at: new Date() },
      });

      for (const guestItem of dto.items) {
        const requestedQty = guestItem.quantity ?? guestItem.qty ?? 1;
        if (!Number.isInteger(requestedQty) || requestedQty < 1) continue;

        const product = await tx.products.findUnique({
          where: { id: guestItem.productId },
        });
        if (!product || product.stock <= 0) continue;

        const size: item_size = guestItem.size ?? item_size.M;
        const { sortedIds, signature } = normalizeToppingSignature(guestItem.toppingIds);

        if (sortedIds.length > 0) {
          const validToppings = await tx.toppings.findMany({
            where: { id: { in: sortedIds } },
          });
          if (validToppings.length !== sortedIds.length) continue;
        }

        const currentItems = await tx.cartItems.findMany({
          where: { cart_id: cart.id },
        });

        const existingItem = currentItems.find(
          (i) =>
            i.product_id === product.id &&
            i.size === size &&
            i.topping_signature === signature,
        );

        const usedByOtherVariants = currentItems
          .filter((i) => i.product_id === product.id && i.id !== existingItem?.id)
          .reduce((sum, i) => sum + i.quantity, 0);

        const maxForThisVariant = Math.max(0, product.stock - usedByOtherVariants);
        if (maxForThisVariant <= 0) continue;

        const targetQty = Math.min(
          (existingItem ? existingItem.quantity : 0) + requestedQty,
          maxForThisVariant,
        );

        if (targetQty <= 0) continue;

        if (existingItem) {
          await tx.cartItems.update({
            where: { id: existingItem.id },
            data: { quantity: targetQty, updated_at: new Date() },
          });
        } else {
          await tx.cartItems.create({
            data: {
              cart_id: cart.id,
              product_id: product.id,
              size,
              topping_signature: signature,
              quantity: targetQty,
              CartItemToppings: {
                create: sortedIds.map((tid) => ({ topping_id: tid })),
              },
            },
          });
        }
      }

      await tx.carts.update({
        where: { id: cart.id },
        data: { updated_at: new Date() },
      });

      return this.buildCartResponse(tx, userId);
    });
  }
}
