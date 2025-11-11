import { IsString, IsNumber, IsDateString, IsOptional, IsBoolean, Min } from 'class-validator';

export class UpdateReminderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  reminderDate?: string;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
}

