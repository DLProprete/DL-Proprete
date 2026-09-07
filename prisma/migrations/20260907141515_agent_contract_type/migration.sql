-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CDI', 'CDD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractType" "ContractType";
