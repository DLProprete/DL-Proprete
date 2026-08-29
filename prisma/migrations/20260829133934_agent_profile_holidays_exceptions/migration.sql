-- CreateEnum
CREATE TYPE "HolidayScope" AS ENUM ('COMPANY');

-- CreateEnum
CREATE TYPE "ServiceExceptionType" AS ENUM ('SKIP', 'EXTRA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "birthDate" DATE,
ADD COLUMN     "hasDrivingLicense" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "homeAddress" TEXT,
ADD COLUMN     "homeCity" TEXT,
ADD COLUMN     "homeLat" DOUBLE PRECISION,
ADD COLUMN     "homeLng" DOUBLE PRECISION,
ADD COLUMN     "homePostalCode" TEXT,
ADD COLUMN     "maxEndTime" TIME,
ADD COLUMN     "minStartTime" TIME,
ADD COLUMN     "noWorkWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "notes" TEXT;

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "scope" "HolidayScope" NOT NULL DEFAULT 'COMPANY',

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceException" (
    "id" TEXT NOT NULL,
    "serviceTemplateId" TEXT,
    "siteId" TEXT,
    "date" DATE NOT NULL,
    "type" "ServiceExceptionType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_date_scope_key" ON "Holiday"("date", "scope");

-- CreateIndex
CREATE INDEX "ServiceException_date_idx" ON "ServiceException"("date");

-- AddForeignKey
ALTER TABLE "ServiceException" ADD CONSTRAINT "ServiceException_serviceTemplateId_fkey" FOREIGN KEY ("serviceTemplateId") REFERENCES "ServiceTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceException" ADD CONSTRAINT "ServiceException_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
