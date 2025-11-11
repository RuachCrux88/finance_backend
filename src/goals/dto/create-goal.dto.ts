import { IsString, IsNumber, Min, IsOptional, IsUUID, IsDateString } from 'class-validator';

export class CreateGoalDto {
  @IsUUID()
  @IsOptional()
  walletId?: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0.01)
  targetAmount!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}

