-- Lot 1 — facturation juste.
--
-- 1. Shift.billableMinutes : duree vendue de la vacation, figee au moment de
--    la generation. Jusqu'ici la facture sommait endAt - startAt, c'est-a-dire
--    la fenetre d'acces au site, alors que ServiceTemplate.durationMinutes
--    portait la duree reellement vendue. Les deux divergeaient (ex. fenetre
--    08:30-10:00 pour 120 min vendues) sans qu'aucune ne fasse autorite.
-- 2. Contract.billingBasis passe par defaut au forfait mensuel lisse.

ALTER TABLE "Shift" ADD COLUMN "billableMinutes" INTEGER;

-- Reprise : duree vendue du template quand l'occurrence en vient, sinon la
-- fenetre horaire de l'occurrence elle-meme (vacations creees hors template).
UPDATE "Shift" s
SET "billableMinutes" = t."durationMinutes"
FROM "ServiceTemplate" t
WHERE s."serviceTemplateId" = t."id";

UPDATE "Shift"
SET "billableMinutes" = GREATEST(1, ROUND(EXTRACT(EPOCH FROM ("endAt" - "startAt")) / 60)::int)
WHERE "billableMinutes" IS NULL;

ALTER TABLE "Shift" ALTER COLUMN "billableMinutes" SET NOT NULL;

ALTER TABLE "Contract" ALTER COLUMN "billingBasis" SET DEFAULT 'FLAT_INDICATIVE_HOURS';
