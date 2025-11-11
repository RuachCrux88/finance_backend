import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  IsEmail,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { WalletType } from '@prisma/client';

export class CreateWalletDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsEnum(WalletType)
  type!: WalletType; // PERSONAL | GROUP

  @IsString()
  @IsOptional()
  currency?: string; // Moneda (COP, USD, EUR, etc.)
}

export class JoinWalletDto {
  @IsString()
  inviteCode!: string;
}

export class UpdateWalletNameDto {
  @IsString()
  @MaxLength(60)
  name!: string;
}
