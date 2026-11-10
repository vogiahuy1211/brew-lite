import { IsString, IsNotEmpty, IsNumber, Min, IsBoolean, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromotionDto {
  @IsString({ message: 'Mã giảm giá phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã giảm giá không được để trống' })
  code: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Số tiền giảm phải là một số' })
  @Min(1000, { message: 'Số tiền giảm tối thiểu là 1,000 VND' })
  discountAmount: number;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải đúng định dạng ngày' })
  startAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải đúng định dạng ngày' })
  endAt?: string;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString({ message: 'Mã giảm giá phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Mã giảm giá không được để trống' })
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Số tiền giảm phải là một số' })
  @Min(1000, { message: 'Số tiền giảm tối thiểu là 1,000 VND' })
  discountAmount?: number;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải đúng định dạng ngày' })
  startAt?: string | null;

  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải đúng định dạng ngày' })
  endAt?: string | null;
}
