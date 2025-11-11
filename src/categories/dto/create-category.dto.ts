import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() @MaxLength(60)
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsOptional() @IsString() @MaxLength(140)
  description?: string;

  @IsOptional() @IsUUID()
  walletId?: string;
}
