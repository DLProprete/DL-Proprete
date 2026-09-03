ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "alarmCode" TEXT;
ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "keyNotes" TEXT;
ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "protocolNotes" TEXT;

DO $$ BEGIN
  CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SiteLogType" AS ENUM ('ANOMALY', 'EQUIPMENT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Quote" (
  "id" TEXT NOT NULL,
  "prospectId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "validUntil" DATE,
  "amountHT" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "vatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "amountTTC" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "sentAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "contractId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "QuoteLine" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "quantity" DECIMAL(8,2) NOT NULL,
  "unitPriceHT" DECIMAL(10,2) NOT NULL,
  "vatRate" DECIMAL(4,2) NOT NULL DEFAULT 20,
  CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SiteLog" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "SiteLogType" NOT NULL DEFAULT 'ANOMALY',
  "comment" TEXT NOT NULL,
  "photoPath" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Quote_prospectId_idx" ON "Quote"("prospectId");
CREATE INDEX IF NOT EXISTS "QuoteLine_quoteId_idx" ON "QuoteLine"("quoteId");
CREATE INDEX IF NOT EXISTS "SiteLog_siteId_createdAt_idx" ON "SiteLog"("siteId", "createdAt");
