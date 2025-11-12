export const WalletTypeEnum = {
  PERSONAL: 'PERSONAL',
  GROUP: 'GROUP',
} as const;

export type WalletTypeValue = typeof WalletTypeEnum[keyof typeof WalletTypeEnum];

export const CategoryTypeEnum = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
} as const;

export type CategoryTypeValue =
  typeof CategoryTypeEnum[keyof typeof CategoryTypeEnum];

export const TransactionTypeEnum = {
  EXPENSE: 'EXPENSE',
  INCOME: 'INCOME',
  SETTLEMENT: 'SETTLEMENT',
} as const;

export type TransactionTypeValue =
  typeof TransactionTypeEnum[keyof typeof TransactionTypeEnum];

export const WalletRoleEnum = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const;

export type WalletRoleValue = typeof WalletRoleEnum[keyof typeof WalletRoleEnum];
