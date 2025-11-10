import { IsUUID, IsEnum, IsNumber, Min, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';
import { CreateSplitDto } from './create-split.dto';

export class CreateTransactionDto {
  @IsUUID()
  walletId!: string;

  @IsUUID()
  categoryId!: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsUUID()
  paidByUserId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSplitDto)
  splits?: CreateSplitDto[];
}
