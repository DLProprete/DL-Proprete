-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totpSecret" TEXT,
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpLastStep" INTEGER;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "twoFactorVerifiedAt" TIMESTAMP(3);
