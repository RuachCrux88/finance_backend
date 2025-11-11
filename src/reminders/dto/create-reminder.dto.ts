import { IsString, IsNumber, IsDateString, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateReminderDto {
  @IsUUID()
  walletId!: string;

  @IsUUID()
  categoryId!: string;

  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;
}

