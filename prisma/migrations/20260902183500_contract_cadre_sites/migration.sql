-- Contrat-cadre multi-sites : Contract devient un cadre legal pur (client,
-- reference, periode, facturation), ContractSite porte tout ce qui varie par
-- site (tarif, base de facturation, volume indicatif). ServiceTemplate/Shift/
-- Invoice sont repointes de Contract vers ContractSite.
--
-- Migration a donnees preservees : chaque Contract existant est aujourd'hui
-- deja exactement une paire contrat<->site. ContractSite.id reutilise
-- Contract.id, ce qui rend le repointage une simple copie de valeur
-- (contractSiteId = contractId), verifiable sans jointure.

-- ==== 1. Nouvelle table ContractSite ====

CREATE TABLE "ContractSite" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "billingMode" "BillingMode" NOT NULL DEFAULT 'TIME_AND_MATERIALS_PLANNED',
    "billingBasis" "BillingBasis" NOT NULL DEFAULT 'FLAT_INDICATIVE_HOURS',
    "hourlyRateHT" DECIMAL(8,2) NOT NULL,
    "indicativeMonthlyHours" DECIMAL(7,2),
    "vatRate" DECIMAL(4,2) NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractSite_pkey" PRIMARY KEY ("id")
);

-- ==== 2. Backfill : un ContractSite par Contract existant, meme id ====

INSERT INTO "ContractSite" (
  "id", "contractId", "siteId", "billingMode", "billingBasis",
  "hourlyRateHT", "indicativeMonthlyHours", "vatRate", "createdAt", "updatedAt"
)
SELECT
  "id", "id" AS "contractId", "siteId", "billingMode", "billingBasis",
  "hourlyRateHT", "indicativeMonthlyHours", "vatRate", "createdAt", "updatedAt"
FROM "Contract";

CREATE INDEX "ContractSite_siteId_idx" ON "ContractSite"("siteId");
CREATE UNIQUE INDEX "ContractSite_contractId_siteId_key" ON "ContractSite"("contractId", "siteId");

ALTER TABLE "ContractSite" ADD CONSTRAINT "ContractSite_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ContractSite" ADD CONSTRAINT "ContractSite_siteId_fkey"
  FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==== 3. ServiceTemplate : contractId -> contractSiteId (NOT NULL) ====

ALTER TABLE "ServiceTemplate" ADD COLUMN "contractSiteId" TEXT;
UPDATE "ServiceTemplate" SET "contractSiteId" = "contractId";
ALTER TABLE "ServiceTemplate" ALTER COLUMN "contractSiteId" SET NOT NULL;

ALTER TABLE "ServiceTemplate" DROP CONSTRAINT "ServiceTemplate_contractId_fkey";
DROP INDEX "ServiceTemplate_contractId_idx";
ALTER TABLE "ServiceTemplate" DROP COLUMN "contractId";

CREATE INDEX "ServiceTemplate_contractSiteId_idx" ON "ServiceTemplate"("contractSiteId");
ALTER TABLE "ServiceTemplate" ADD CONSTRAINT "ServiceTemplate_contractSiteId_fkey"
  FOREIGN KEY ("contractSiteId") REFERENCES "ContractSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==== 4. Shift : contractId -> contractSiteId (NOT NULL) ====

ALTER TABLE "Shift" ADD COLUMN "contractSiteId" TEXT;
UPDATE "Shift" SET "contractSiteId" = "contractId";
ALTER TABLE "Shift" ALTER COLUMN "contractSiteId" SET NOT NULL;

ALTER TABLE "Shift" DROP CONSTRAINT "Shift_contractId_fkey";
DROP INDEX "Shift_contractId_date_idx";
ALTER TABLE "Shift" DROP COLUMN "contractId";

CREATE INDEX "Shift_contractSiteId_date_idx" ON "Shift"("contractSiteId", "date");
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_contractSiteId_fkey"
  FOREIGN KEY ("contractSiteId") REFERENCES "ContractSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ==== 5. Invoice : contractId -> contractSiteId (reste nullable) ====

ALTER TABLE "Invoice" ADD COLUMN "contractSiteId" TEXT;
UPDATE "Invoice" SET "contractSiteId" = "contractId" WHERE "contractId" IS NOT NULL;

ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_contractId_fkey";
DROP INDEX "Invoice_contractId_periodYear_periodMonth_idx";
ALTER TABLE "Invoice" DROP COLUMN "contractId";

CREATE INDEX "Invoice_contractSiteId_periodYear_periodMonth_idx" ON "Invoice"("contractSiteId", "periodYear", "periodMonth");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractSiteId_fkey"
  FOREIGN KEY ("contractSiteId") REFERENCES "ContractSite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ==== 6. Contract : retrait des colonnes deplacees vers ContractSite ====

ALTER TABLE "Contract" DROP CONSTRAINT "Contract_siteId_fkey";
DROP INDEX "Contract_siteId_status_idx";

ALTER TABLE "Contract" DROP COLUMN "billingBasis",
DROP COLUMN "billingMode",
DROP COLUMN "hourlyRateHT",
DROP COLUMN "indicativeMonthlyHours",
DROP COLUMN "siteId",
DROP COLUMN "vatRate";
