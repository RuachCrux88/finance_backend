import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { WalletTypeEnum } from '../common/enums';
import type { WalletTypeValue } from '../common/enums';

export class CreateWalletDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsEnum(WalletTypeEnum)
  type!: WalletTypeValue;

  @IsString()
  @IsOptional()
  currency?: string;
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
