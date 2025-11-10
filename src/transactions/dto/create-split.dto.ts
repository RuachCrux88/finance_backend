import { IsUUID, IsNumber, Min } from 'class-validator';

export class CreateSplitDto {
  @IsUUID()
  owedByUserId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;
}
