-- Lot 2 — mentions legales obligatoires de la facture.
--
-- Le PDF ne portait ni forme juridique, ni capital social, ni RCS, alors que
-- ces mentions sont obligatoires sur tout document commercial d'une societe
-- commerciale. Il affirmait par ailleurs "Aucune penalite de retard sans
-- mention contractuelle contraire", ce qui est faux entre professionnels.

ALTER TABLE "CompanyProfile" ADD COLUMN "legalForm" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN "shareCapital" DECIMAL(12,2);
ALTER TABLE "CompanyProfile" ADD COLUMN "rcsCity" TEXT;
ALTER TABLE "CompanyProfile" ADD COLUMN "latePenaltyRate" DECIMAL(5,2);

-- Valeurs connues de DL PROPRETE (SAS, RCS Caen — voir docs/SPEC.md section 1).
-- Le capital social reste a saisir dans Parametres entreprise.
UPDATE "CompanyProfile"
SET "legalForm" = COALESCE("legalForm", 'SAS'),
    "rcsCity" = COALESCE("rcsCity", 'Caen')
WHERE "id" = 'default';
