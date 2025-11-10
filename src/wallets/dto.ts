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
}

export class AddMemberDto {
  @IsEmail()
  email!: string;
}

export class WalletIdParam {
  @IsUUID()
  id!: string;
}
