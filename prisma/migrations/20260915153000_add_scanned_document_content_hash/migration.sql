-- AlterTable
ALTER TABLE "ScannedDocument" ADD COLUMN     "contentHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ScannedDocument_contentHash_key" ON "ScannedDocument"("contentHash");
