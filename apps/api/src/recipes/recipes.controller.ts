import { Controller, Get, Param, Patch, Post, Delete, Body } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CreateRecipeItemDto, UpdateRecipeItemDto, CheckCartLimitsDto } from './dto/recipe.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  getAllRecipes() {
    return this.recipesService.getAllRecipes();
  }

  @Get('product/:productId')
  getRecipeForProduct(@Param('productId') productId: string) {
    return this.recipesService.getRecipeForProduct(productId);
  }

  @Post('check-limits')
  checkCartLimits(@Body() dto: CheckCartLimitsDto) {
    return this.recipesService.checkCartLimits(dto);
  }

  @Patch('item/:id')
  updateRecipeItem(
    @Param('id') id: string,
    @Body() dto: UpdateRecipeItemDto,
  ) {
    return this.recipesService.updateRecipeItem(id, dto);
  }

  @Post('item')
  createRecipeItem(@Body() dto: CreateRecipeItemDto) {
    return this.recipesService.createRecipeItem(dto);
  }

  @Delete('item/:id')
  deleteRecipeItem(@Param('id') id: string) {
    return this.recipesService.deleteRecipeItem(id);
  }

  @Get('order/:orderId')
  getOrderRecipeBreakdown(@Param('orderId') orderId: string) {
    return this.recipesService.getOrderRecipeBreakdown(orderId);
  }
}
