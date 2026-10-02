-- CreateEnum
CREATE TYPE "ScannedDocumentType" AS ENUM ('FACTURE', 'CONTRAT', 'AUTRE');

-- AlterTable
ALTER TABLE "ScannedDocument" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "clientNameRaw" TEXT,
ADD COLUMN     "contractEndsOn" DATE,
ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "contractStartsOn" DATE,
ADD COLUMN     "documentType" "ScannedDocumentType" NOT NULL DEFAULT 'FACTURE',
ADD COLUMN     "noticeDays" INTEGER,
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "pricing" TEXT,
ADD COLUMN     "signedOn" DATE,
ADD COLUMN     "siteAddresses" TEXT,
ADD COLUMN     "tacitRenewal" BOOLEAN;

-- CreateIndex
CREATE UNIQUE INDEX "ScannedDocument_contractId_key" ON "ScannedDocument"("contractId");

-- CreateIndex
CREATE INDEX "ScannedDocument_documentType_contractEndsOn_idx" ON "ScannedDocument"("documentType", "contractEndsOn");

-- AddForeignKey
ALTER TABLE "ScannedDocument" ADD CONSTRAINT "ScannedDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScannedDocument" ADD CONSTRAINT "ScannedDocument_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Recherche plein texte en français sur les documents numérisés (contrats
-- papier notamment), insensible aux accents (l'OCR les perd souvent) :
-- translate() retire les accents, sans extension. L'expression doit rester
-- identique à SEARCH_VECTOR dans src/server/scanned-documents/queries.ts
-- pour que l'index soit utilisé.
CREATE INDEX "ScannedDocument_fts_idx" ON "ScannedDocument" USING GIN (
  to_tsvector('french'::regconfig, translate(lower(
    coalesce("ocrText", '') || ' ' || coalesce("clientNameRaw", '') || ' ' ||
    coalesce("supplierName", '') || ' ' || coalesce("originalName", '')),
    'àâäáãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'))
);
