import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  getAllPromotions() {
    return this.promotionsService.findAll();
  }

  @Get('validate')
  validateCode(@Query('code') code: string) {
    return this.promotionsService.validateCode(code);
  }

  @Post()
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Patch(':id')
  updatePromotion(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(':id')
  deletePromotion(@Param('id') id: string) {
    return this.promotionsService.delete(id);
  }
}
