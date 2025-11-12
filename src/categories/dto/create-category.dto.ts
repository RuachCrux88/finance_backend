import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';
import { CategoryTypeEnum } from '../../common/enums';
import type { CategoryTypeValue } from '../../common/enums';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name!: string;

  @IsEnum(CategoryTypeEnum)
  type!: CategoryTypeValue;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  description?: string;

  @IsOptional()
  @IsUUID()
  walletId?: string;
}
