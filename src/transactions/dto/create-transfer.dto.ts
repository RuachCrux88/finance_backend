import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  recipientUserCode!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

