import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const promos = await this.prisma.promotions.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { Orders: true },
        },
      },
    });

    return promos.map((p) => ({
      id: p.id,
      code: p.code,
      discountAmount: Number(p.discount_amount),
      isActive: p.is_active,
      startAt: p.start_at,
      endAt: p.end_at,
      usedCount: p._count.Orders,
    }));
  }

  async validateCode(code: string) {
    const promo = await this.prisma.promotions.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promo || !promo.is_active) {
      throw new NotFoundException('Mã khuyến mãi không tồn tại hoặc đã hết hiệu lực');
    }

    const now = new Date();
    if (promo.start_at && promo.start_at > now) {
      throw new NotFoundException('Mã khuyến mãi chưa đến thời gian áp dụng');
    }

    if (promo.end_at && promo.end_at < now) {
      throw new NotFoundException('Mã khuyến mãi đã hết hạn sử dụng');
    }

    return {
      id: promo.id,
      code: promo.code,
      discountAmount: Number(promo.discount_amount),
    };
  }

  async create(dto: CreatePromotionDto) {
    const upperCode = dto.code.trim().toUpperCase();

    const existing = await this.prisma.promotions.findUnique({
      where: { code: upperCode },
    });
    if (existing) {
      throw new ConflictException(`Mã giảm giá "${upperCode}" đã tồn tại trên hệ thống`);
    }

    const promo = await this.prisma.promotions.create({
      data: {
        code: upperCode,
        discount_amount: dto.discountAmount,
        is_active: dto.isActive !== undefined ? dto.isActive : true,
        start_at: dto.startAt ? new Date(dto.startAt) : null,
        end_at: dto.endAt ? new Date(dto.endAt) : null,
      },
    });

    return {
      id: promo.id,
      code: promo.code,
      discountAmount: Number(promo.discount_amount),
      isActive: promo.is_active,
      startAt: promo.start_at,
      endAt: promo.end_at,
      usedCount: 0,
    };
  }

  async update(id: string, dto: UpdatePromotionDto) {
    const promo = await this.prisma.promotions.findUnique({
      where: { id },
    });
    if (!promo) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    let upperCode = promo.code;
    if (dto.code && dto.code.trim().toUpperCase() !== promo.code) {
      upperCode = dto.code.trim().toUpperCase();
      const existing = await this.prisma.promotions.findUnique({
        where: { code: upperCode },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Mã giảm giá "${upperCode}" đã tồn tại`);
      }
    }

    const updated = await this.prisma.promotions.update({
      where: { id },
      data: {
        code: upperCode,
        discount_amount: dto.discountAmount !== undefined ? dto.discountAmount : undefined,
        is_active: dto.isActive !== undefined ? dto.isActive : undefined,
        start_at: dto.startAt !== undefined ? (dto.startAt ? new Date(dto.startAt) : null) : undefined,
        end_at: dto.endAt !== undefined ? (dto.endAt ? new Date(dto.endAt) : null) : undefined,
      },
      include: {
        _count: {
          select: { Orders: true },
        },
      },
    });

    return {
      id: updated.id,
      code: updated.code,
      discountAmount: Number(updated.discount_amount),
      isActive: updated.is_active,
      startAt: updated.start_at,
      endAt: updated.end_at,
      usedCount: updated._count.Orders,
    };
  }

  async delete(id: string) {
    const promo = await this.prisma.promotions.findUnique({
      where: { id },
      include: {
        _count: {
          select: { Orders: true },
        },
      },
    });
    if (!promo) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    if (promo._count.Orders > 0) {
      throw new BadRequestException(
        `Mã "${promo.code}" đã được sử dụng trong ${promo._count.Orders} đơn hàng. Bạn vui lòng Tắt kích hoạt thay vì xóa để bảo toàn lịch sử hóa đơn!`,
      );
    }

    await this.prisma.promotions.delete({
      where: { id },
    });

    return { success: true, message: `Đã xóa mã giảm giá "${promo.code}"` };
  }
}
