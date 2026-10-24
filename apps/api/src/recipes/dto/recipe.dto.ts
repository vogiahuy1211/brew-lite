import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { item_size } from '@prisma/client';

export class UpdateRecipeItemDto {
  @IsNumber()
  @IsPositive({ message: 'Định lượng nguyên liệu phải lớn hơn 0' })
  amountNeeded: number;
}

export class CreateRecipeItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @IsNumber()
  @IsPositive({ message: 'Định lượng nguyên liệu phải lớn hơn 0' })
  amountNeeded: number;

  @IsOptional()
  @IsEnum(item_size, { message: 'Size phải là S, M, hoặc L' })
  size?: item_size;
}

export class CartItemCheckDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(item_size, { message: 'Size phải là S, M, hoặc L' })
  size: item_size;

  @IsNumber()
  @IsPositive()
  qty: number;

  @IsOptional()
  @IsArray()
  toppingIds?: string[];
}

export class CheckCartLimitsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemCheckDto)
  items: CartItemCheckDto[];
}
