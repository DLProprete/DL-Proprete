-- CreateEnum
CREATE TYPE "ContractSignatureStatus" AS ENUM ('NOT_SENT', 'SENT', 'SIGNED');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "signatureSentAt" TIMESTAMP(3),
ADD COLUMN     "signatureStatus" "ContractSignatureStatus" NOT NULL DEFAULT 'NOT_SENT',
ADD COLUMN     "signedAt" TIMESTAMP(3);
