import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeItemDto, UpdateRecipeItemDto, CheckCartLimitsDto } from './dto/recipe.dto';
import { item_size } from '@prisma/client';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllRecipes() {
    const products = await this.prisma.products.findMany({
      include: {
        RecipeItems: {
          include: {
            Ingredients: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => {
      const items = p.RecipeItems.map((r) => ({
        id: r.id,
        size: r.size,
        ingredientId: r.ingredient_id,
        ingredientName: r.Ingredients.name,
        unit: r.Ingredients.unit,
        amountNeeded: Number(r.amount_needed),
        stockQuantity: Number(r.Ingredients.stock_quantity),
        costPerUnit: Number(r.Ingredients.cost_per_unit),
        lineCost: Number(r.amount_needed) * Number(r.Ingredients.cost_per_unit),
      }));

      // Tính giá vốn trung bình (COGS) theo size M hoặc chung
      const totalCostM = items
        .filter((i) => i.size === 'M' || !i.size)
        .reduce((sum, i) => sum + i.lineCost, 0);

      const price = Number(p.price);
      const profitMargin = price > 0 ? ((price - totalCostM) / price) * 100 : 0;

      return {
        id: p.id,
        productId: p.id,
        name: p.name,
        productName: p.name,
        price: price,
        sellingPrice: price,
        estimatedCost: Math.round(totalCostM),
        estimatedCostM: Math.round(totalCostM),
        profitMarginPct: Math.round(profitMargin * 10) / 10,
        itemsCount: items.length,
        ingredients: items,
        recipeItems: items.map((i) => ({
          id: i.id,
          size: i.size,
          quantity: i.amountNeeded,
          ingredient: {
            id: i.ingredientId,
            name: i.ingredientName,
            unit: i.unit,
            stockQuantity: i.stockQuantity,
            costPerUnit: i.costPerUnit,
          },
        })),
      };
    });
  }

  async getRecipeForProduct(productId: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      include: {
        RecipeItems: {
          include: { Ingredients: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    return {
      productId: product.id,
      productName: product.name,
      price: Number(product.price),
      recipeItems: product.RecipeItems.map((r) => ({
        id: r.id,
        size: r.size,
        ingredientId: r.ingredient_id,
        ingredientName: r.Ingredients.name,
        unit: r.Ingredients.unit,
        stockQuantity: Number(r.Ingredients.stock_quantity),
        amountNeeded: Number(r.amount_needed),
      })),
    };
  }

  async checkCartLimits(dto: CheckCartLimitsDto) {
    const items = dto.items || [];
    if (items.length === 0) {
      return { limits: {} };
    }

    // 1. Lấy tất cả nguyên liệu và tồn kho hiện tại
    const ingredients = await this.prisma.ingredients.findMany();
    const stockMap = new Map<string, { name: string; unit: string; stock: number }>();
    for (const ing of ingredients) {
      stockMap.set(ing.id, {
        name: ing.name,
        unit: ing.unit,
        stock: Number(ing.stock_quantity),
      });
    }

    // 2. Lấy tất cả công thức liên quan đến các sản phẩm & toppings trong giỏ hàng
    const productIds = Array.from(new Set(items.map((i) => i.productId)));
    const allToppingIds = Array.from(
      new Set(items.flatMap((i) => i.toppingIds || []))
    );

    const [productRecipes, toppingRecipes] = await Promise.all([
      this.prisma.recipeItems.findMany({
        where: { product_id: { in: productIds } },
        include: { Ingredients: true },
      }),
      this.prisma.recipeItems.findMany({
        where: { topping_id: { in: allToppingIds } },
        include: { Ingredients: true },
      }),
    ]);

    // Hàm lấy đơn vị định lượng cho 1 ly của item
    const getItemUnitDemand = (item: { productId: string; size: item_size; toppingIds?: string[] }) => {
      const demandMap = new Map<string, number>();

      // Công thức món
      const pRecs = productRecipes.filter(
        (r) => r.product_id === item.productId && (!r.size || r.size === item.size)
      );
      for (const r of pRecs) {
        demandMap.set(
          r.ingredient_id,
          (demandMap.get(r.ingredient_id) || 0) + Number(r.amount_needed)
        );
      }

      // Công thức topping
      if (item.toppingIds && item.toppingIds.length > 0) {
        const tRecs = toppingRecipes.filter(
          (r) => r.topping_id && item.toppingIds!.includes(r.topping_id)
        );
        for (const r of tRecs) {
          demandMap.set(
            r.ingredient_id,
            (demandMap.get(r.ingredient_id) || 0) + Number(r.amount_needed)
          );
        }
      }

      return demandMap;
    };

    // 3. Tính tổng lượng nguyên liệu tiêu thụ của toàn bộ giỏ hàng hiện tại
    const totalCartDemand = new Map<string, number>();
    const itemDemands: Array<{ key: string; item: typeof items[0]; unitDemand: Map<string, number> }> = [];

    items.forEach((item, idx) => {
      const key = item.id || `${item.productId}-${item.size}-${idx}`;
      const unitDemand = getItemUnitDemand(item);
      itemDemands.push({ key, item, unitDemand });

      for (const [ingId, neededPerCup] of unitDemand.entries()) {
        const total = (totalCartDemand.get(ingId) || 0) + neededPerCup * item.qty;
        totalCartDemand.set(ingId, total);
      }
    });

    // 4. Với từng item, kiểm tra xem có thể tăng thêm 1 ly nữa hay không
    const limits: Record<string, {
      canIncrease: boolean;
      maxQty: number;
      limitingIngredient?: string;
    }> = {};

    for (const { key, item, unitDemand } of itemDemands) {
      let canIncrease = true;
      let limitingIngredient: string | undefined;
      let minAdditionalUnits = Infinity;

      for (const [ingId, neededPerCup] of unitDemand.entries()) {
        const ingInfo = stockMap.get(ingId);
        const currentStock = ingInfo?.stock || 0;
        const currentDemand = totalCartDemand.get(ingId) || 0;

        if (neededPerCup > 0) {
          // Khi tăng thêm 1 ly
          if (currentDemand + neededPerCup > currentStock) {
            canIncrease = false;
            if (!limitingIngredient) {
              limitingIngredient = ingInfo?.name || 'Nguyên liệu';
            }
          }

          // Lượng tồn còn lại ngoài các ly hiện tại của chính item này
          const demandOtherItems = currentDemand - neededPerCup * item.qty;
          const availableForThisItem = Math.max(0, currentStock - demandOtherItems);
          const maxUnits = Math.floor(availableForThisItem / neededPerCup);
          if (maxUnits < minAdditionalUnits) {
            minAdditionalUnits = maxUnits;
            limitingIngredient = ingInfo?.name || 'Nguyên liệu';
          }
        }
      }

      const calculatedMaxQty = minAdditionalUnits === Infinity ? 99 : minAdditionalUnits;

      limits[key] = {
        canIncrease: canIncrease && item.qty < calculatedMaxQty,
        maxQty: calculatedMaxQty,
        limitingIngredient,
      };
    }

    return {
      limits,
    };
  }

  async updateRecipeItem(id: string, dto: UpdateRecipeItemDto) {
    const item = await this.prisma.recipeItems.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy định lượng công thức này');
    }

    return this.prisma.recipeItems.update({
      where: { id },
      data: { amount_needed: dto.amountNeeded },
    });
  }

  async createRecipeItem(dto: CreateRecipeItemDto) {
    const product = await this.prisma.products.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const ingredient = await this.prisma.ingredients.findUnique({
      where: { id: dto.ingredientId },
    });
    if (!ingredient) {
      throw new NotFoundException('Nguyên liệu không tồn tại');
    }

    return this.prisma.recipeItems.create({
      data: {
        product_id: dto.productId,
        ingredient_id: dto.ingredientId,
        amount_needed: dto.amountNeeded,
        size: dto.size || null,
      },
    });
  }

  async deleteRecipeItem(id: string) {
    const item = await this.prisma.recipeItems.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Không tìm thấy định lượng công thức này');
    }

    return this.prisma.recipeItems.delete({
      where: { id },
    });
  }

  async getOrderRecipeBreakdown(orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        OrderItems: {
          include: {
            Products: true,
            OrderItemToppings: {
              include: { Toppings: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    const itemsBreakdown = await Promise.all(
      order.OrderItems.map(async (item) => {
        // Tìm công thức món
        const productRecipes = await this.prisma.recipeItems.findMany({
          where: {
            product_id: item.product_id,
            OR: [{ size: item.size }, { size: null }],
          },
          include: { Ingredients: true },
        });

        const ingredientsList: { name: string; amount: number; unit: string }[] = productRecipes.map((r) => ({
          name: r.Ingredients.name,
          amount: Number(r.amount_needed),
          unit: r.Ingredients.unit,
        }));

        // Tìm công thức Topping
        for (const top of item.OrderItemToppings) {
          const topRecipes = await this.prisma.recipeItems.findMany({
            where: { topping_id: top.topping_id },
            include: { Ingredients: true },
          });

          for (const tr of topRecipes) {
            ingredientsList.push({
              name: `${tr.Ingredients.name} (Topping: ${top.Toppings.name})`,
              amount: Number(tr.amount_needed),
              unit: tr.Ingredients.unit,
            });
          }
        }

        return {
          orderItemId: item.id,
          productName: item.Products.name,
          size: item.size,
          qty: item.qty,
          toppings: item.OrderItemToppings.map((t) => t.Toppings.name),
          recipe: ingredientsList,
        };
      }),
    );

    return {
      orderId: order.id,
      status: order.status,
      items: itemsBreakdown,
    };
  }
}
