-- CreateEnum
CREATE TYPE "ScannedDocumentStatus" AS ENUM ('PENDING', 'OCR_DONE', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScannedDocumentCategory" AS ENUM ('COMPTABLE', 'ACHATS', 'STOCK');

-- CreateTable
CREATE TABLE "ScannedDocument" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "status" "ScannedDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "ocrText" TEXT,
    "supplierName" TEXT,
    "category" "ScannedDocumentCategory",
    "amountTtc" DECIMAL(10,2),
    "documentDate" DATE,
    "reference" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" TEXT NOT NULL,
    "validatedByUserId" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScannedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnownSupplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matchPattern" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnownSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScannedDocument_status_idx" ON "ScannedDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "KnownSupplier_matchPattern_key" ON "KnownSupplier"("matchPattern");

-- AddForeignKey
ALTER TABLE "ScannedDocument" ADD CONSTRAINT "ScannedDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannedDocument" ADD CONSTRAINT "ScannedDocument_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
