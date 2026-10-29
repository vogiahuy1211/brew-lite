import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

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
      let isAvailable = true;
      if (p.RecipeItems && p.RecipeItems.length > 0) {
        const hasOutOfStock = p.RecipeItems.some(
          (r) => Number(r.Ingredients.stock_quantity) < Number(r.amount_needed)
        );
        if (hasOutOfStock) {
          isAvailable = false;
        }
      }

      return {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        imageUrl: p.image_url,
        stock: isAvailable ? (p.stock > 0 ? p.stock : 99) : 0,
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

    let isAvailable = true;
    if (product.RecipeItems && product.RecipeItems.length > 0) {
      const hasOutOfStock = product.RecipeItems.some(
        (r) => Number(r.Ingredients.stock_quantity) < Number(r.amount_needed)
      );
      if (hasOutOfStock) {
        isAvailable = false;
      }
    }

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: product.image_url,
      stock: isAvailable ? (product.stock > 0 ? product.stock : 99) : 0,
    };
  }
}
