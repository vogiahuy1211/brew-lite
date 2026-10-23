import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto, RestockIngredientDto } from './dto/inventory.dto';

@Controller('inventory')
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
