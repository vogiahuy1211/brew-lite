import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto, RestockIngredientDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@Controller('inventory')
@UseGuards(JwtAuthGuard, AdminGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('ingredients')
  getAllIngredients() {
    return this.inventoryService.getAllIngredients();
  }

  @Post('ingredients')
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  @Patch('ingredients/:id/restock')
  restock(@Param('id') id: string, @Body() dto: RestockIngredientDto) {
    return this.inventoryService.restock(id, dto);
  }

  @Get('logs')
  getLogs(@Query('limit') limit?: string) {
    return this.inventoryService.getLogs(limit ? parseInt(limit, 10) : 50);
  }
}
