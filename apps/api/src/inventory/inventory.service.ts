import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto, RestockIngredientDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllIngredients() {
    const list = await this.prisma.ingredients.findMany({
      orderBy: { name: 'asc' },
    });

    return list.map((item) => {
      const stock = Number(item.stock_quantity);
      const min = Number(item.min_threshold);
      return {
        id: item.id,
        name: item.name,
        unit: item.unit,
        stockQuantity: stock,
        minThreshold: min,
        costPerUnit: Number(item.cost_per_unit),
        isLowStock: stock <= min,
        isOutOfStock: stock <= 0,
        updatedAt: item.updated_at,
      };
    });
  }

  async createIngredient(dto: CreateIngredientDto) {
    const created = await this.prisma.ingredients.create({
      data: {
        name: dto.name,
        unit: dto.unit,
        stock_quantity: dto.stockQuantity,
        min_threshold: dto.minThreshold,
        cost_per_unit: dto.costPerUnit,
      },
    });

    if (dto.stockQuantity > 0) {
      await this.prisma.inventoryLogs.create({
        data: {
          ingredient_id: created.id,
          change_amount: dto.stockQuantity,
          balance_after: dto.stockQuantity,
          reason: 'INITIAL_IMPORT',
        },
      });
    }

    return created;
  }

  async restock(id: string, dto: RestockIngredientDto) {
    const ingredient = await this.prisma.ingredients.findUnique({
      where: { id },
    });

    if (!ingredient) {
      throw new NotFoundException('Không tìm thấy nguyên liệu này');
    }

    const currentStock = Number(ingredient.stock_quantity);
    const newStock = currentStock + dto.amount;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.ingredients.update({
        where: { id },
        data: { stock_quantity: newStock },
      });

      await tx.inventoryLogs.create({
        data: {
          ingredient_id: id,
          change_amount: dto.amount,
          balance_after: newStock,
          reason: dto.reason || 'MANUAL_RESTOCK',
        },
      });

      return updated;
    });
  }

  async getLogs(limit: number = 50) {
    return this.prisma.inventoryLogs.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        Ingredients: {
          select: { name: true, unit: true },
        },
      },
    });
  }

  /**
   * Tự động trừ tồn kho nguyên liệu khi đơn hàng được thanh toán (PAID)
   */
  async deductOrderIngredients(tx: any, orderId: string) {
    const order = await tx.orders.findUnique({
      where: { id: orderId },
      include: {
        OrderItems: {
          include: {
            OrderItemToppings: true,
          },
        },
      },
    });

    if (!order || !order.OrderItems) return;

    const deductionMap = new Map<string, number>();

    for (const item of order.OrderItems) {
      // 1. Công thức món theo Size
      const productRecipes = await tx.recipeItems.findMany({
        where: {
          product_id: item.product_id,
          OR: [{ size: item.size }, { size: null }],
        },
      });

      for (const r of productRecipes) {
        const needed = Number(r.amount_needed) * item.qty;
        deductionMap.set(r.ingredient_id, (deductionMap.get(r.ingredient_id) || 0) + needed);
      }

      // 2. Công thức Topping
      for (const top of item.OrderItemToppings) {
        const toppingRecipes = await tx.recipeItems.findMany({
          where: { topping_id: top.topping_id },
        });
        for (const r of toppingRecipes) {
          const needed = Number(r.amount_needed) * item.qty;
          deductionMap.set(r.ingredient_id, (deductionMap.get(r.ingredient_id) || 0) + needed);
        }
      }
    }

    // 3. Thực thi trừ kho và ghi log kiểm toán
    for (const [ingredientId, amount] of deductionMap.entries()) {
      const ingredient = await tx.ingredients.findUnique({
        where: { id: ingredientId },
      });

      if (ingredient) {
        const currentStock = Number(ingredient.stock_quantity);
        const newStock = Math.max(0, currentStock - amount);

        await tx.ingredients.update({
          where: { id: ingredientId },
          data: { stock_quantity: newStock },
        });

        await tx.inventoryLogs.create({
          data: {
            ingredient_id: ingredientId,
            change_amount: -amount,
            balance_after: newStock,
            reason: 'ORDER_DEDUCT',
            order_id: orderId,
          },
        });
      }
    }
  }
}
