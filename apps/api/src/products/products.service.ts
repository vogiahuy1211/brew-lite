import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tính số ly khả dụng có thể pha chế dựa trên định mức nguyên liệu tồn kho (BOM)
   * và giới hạn tồn kho tối đa của sản phẩm
   */
  private calculateAvailableStock(p: any): number {
    let availableStock = p.stock ?? 0;

    if (p.RecipeItems && p.RecipeItems.length > 0) {
      // Ưu tiên size chuẩn M nếu có, nếu không thì lấy tất cả các định mức của món
      const standardRecipes = p.RecipeItems.filter(
        (r: any) => !r.size || r.size === 'M',
      );
      const recipesToEvaluate =
        standardRecipes.length > 0 ? standardRecipes : p.RecipeItems;

      let minCupsFromIngredients = Infinity;

      for (const r of recipesToEvaluate) {
        const needed = Number(r.amount_needed);
        if (needed > 0 && r.Ingredients) {
          const ingStock = Number(r.Ingredients.stock_quantity);
          const possibleCups = Math.floor(ingStock / needed);
          if (possibleCups < minCupsFromIngredients) {
            minCupsFromIngredients = possibleCups;
          }
        }
      }

      if (minCupsFromIngredients !== Infinity) {
        availableStock = Math.min(availableStock, minCupsFromIngredients);
      }
    }

    return Math.max(0, availableStock);
  }

  async findAll(): Promise<ProductDto[]> {
    const products = await this.prisma.products.findMany({
      orderBy: { name: 'asc' },
      include: {
        RecipeItems: {
          include: {
            Ingredients: true,
          },
        },
      },
    });

    return products.map((p) => {
      const stock = this.calculateAvailableStock(p);

      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        imageUrl: p.image_url,
        stock,
      };
    });
  }

  async findOne(id: string): Promise<ProductDto> {
    const product = await this.prisma.products.findUnique({
      where: { id },
      include: {
        RecipeItems: {
          include: {
            Ingredients: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm với id "${id}" không tồn tại`);
    }

    const stock = this.calculateAvailableStock(product);

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.image_url,
      stock,
    };
  }
}

