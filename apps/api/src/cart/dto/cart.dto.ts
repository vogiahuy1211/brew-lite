import {
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { item_size } from '@prisma/client';

export class AddCartItemDto {
  @IsUUID('4', { message: 'productId phải là UUID hợp lệ' })
  productId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải là số nguyên dương (>= 1)' })
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải là số nguyên dương (>= 1)' })
  qty?: number;

  @IsOptional()
  @IsEnum(item_size, { message: 'Size phải là S, M hoặc L' })
  size?: item_size;

  @IsOptional()
  @IsArray({ message: 'toppingIds phải là một mảng' })
  @IsUUID('4', { each: true, message: 'toppingId phải là UUID hợp lệ' })
  toppingIds?: string[];
}

export class UpdateCartItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải là số nguyên dương (>= 1)' })
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải là số nguyên dương (>= 1)' })
  qty?: number;
}

export class SyncCartItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsUUID('4', { message: 'productId phải là UUID hợp lệ' })
  productId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải là số nguyên dương (>= 1)' })
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải là số nguyên dương (>= 1)' })
  qty?: number;

  @IsOptional()
  @IsEnum(item_size, { message: 'Size phải là S, M hoặc L' })
  size?: item_size;

  @IsOptional()
  @IsArray({ message: 'toppingIds phải là một mảng' })
  @IsUUID('4', { each: true, message: 'toppingId phải là UUID hợp lệ' })
  toppingIds?: string[];
}

export class SyncCartDto {
  @IsArray({ message: 'Danh sách sản phẩm đồng bộ phải là một mảng' })
  @ValidateNested({ each: true })
  @Type(() => SyncCartItemDto)
  items: SyncCartItemDto[];
}
