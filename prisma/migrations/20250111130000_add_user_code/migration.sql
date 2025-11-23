-- AlterTable
ALTER TABLE "User" ADD COLUMN "userCode" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");

