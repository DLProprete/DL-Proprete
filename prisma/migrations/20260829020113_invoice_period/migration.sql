-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "periodMonth" INTEGER,
ADD COLUMN     "periodYear" INTEGER;

-- CreateIndex
CREATE INDEX "Invoice_contractId_periodYear_periodMonth_idx" ON "Invoice"("contractId", "periodYear", "periodMonth");

