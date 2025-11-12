import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export const WalletTypeEnum = {
  PERSONAL: "PERSONAL",
  GROUP: "GROUP",
} as const;

type WalletTypeValues = typeof WalletTypeEnum[keyof typeof WalletTypeEnum];

export class CreateWalletDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsEnum(WalletTypeEnum)
  type!: WalletTypeValues;

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
