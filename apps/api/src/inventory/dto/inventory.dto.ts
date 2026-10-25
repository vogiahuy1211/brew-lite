import { IsNotEmpty, IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateIngredientDto {
  @IsString({ message: 'Tên nguyên liệu không được để trống' })
  @IsNotEmpty({ message: 'Tên nguyên liệu không được để trống' })
  name: string;

  @IsString({ message: 'Đơn vị tính không được để trống' })
  @IsNotEmpty({ message: 'Đơn vị tính không được để trống' })
  unit: string;

  @IsNumber({}, { message: 'Số lượng tồn kho phải là số' })
  @Min(0, { message: 'Số lượng tồn kho không được âm' })
  stockQuantity: number;

  @IsNumber({}, { message: 'Ngưỡng cảnh báo phải là số' })
  @Min(0, { message: 'Ngưỡng cảnh báo không được âm' })
  minThreshold: number;

  @IsNumber({}, { message: 'Giá vốn phải là số' })
  @Min(0, { message: 'Giá vốn không được âm' })
  costPerUnit: number;
}

export class RestockIngredientDto {
  @IsNumber({}, { message: 'Số lượng nhập phải là số' })
  @Min(0.01, { message: 'Số lượng nhập phải lớn hơn 0' })
  amount: number;

  @IsString()
  @IsOptional()
  reason?: string;
}
