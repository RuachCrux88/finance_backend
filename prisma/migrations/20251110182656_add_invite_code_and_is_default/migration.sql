-- AlterTable: Agregar inviteCode e isDefault a Wallet
-- Primero agregamos inviteCode como nullable temporalmente
ALTER TABLE "Wallet" ADD COLUMN "inviteCode" TEXT;

-- Generar códigos únicos para las filas existentes
-- Usamos una función para generar códigos aleatorios de 8 caracteres
UPDATE "Wallet" 
SET "inviteCode" = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT), 1, 8))
WHERE "inviteCode" IS NULL;

-- Ahora hacer inviteCode NOT NULL y único
ALTER TABLE "Wallet" ALTER COLUMN "inviteCode" SET NOT NULL;
CREATE UNIQUE INDEX "Wallet_inviteCode_key" ON "Wallet"("inviteCode");

-- Agregar isDefault con valor por defecto false
ALTER TABLE "Wallet" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;


