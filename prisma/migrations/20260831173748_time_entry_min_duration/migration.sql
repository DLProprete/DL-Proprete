-- Pointages a duree nulle : un double-tap Demarrer/Terminer produisait un
-- pointage valable de quelques secondes (constate le 31/08/2026 : 4 lignes
-- SUBMITTED a moins de 5 min, ex. 15:53-15:53 heure de Paris). Aucune
-- prestation reelle ne dure quelques secondes ; ce sont des artefacts, pas
-- un historique de travail a corriger a la main.

-- Nettoyage : lignes deja en base qui violeraient la contrainte ci-dessous.
DELETE FROM "TimeEntry"
WHERE "clockOutAt" IS NOT NULL
  AND "clockOutAt" < "clockInAt" + interval '5 minutes';

-- docs/DATA-MODEL.md exige clockOutAt > clockInAt ; une contrainte
-- chk_time_entry_clock_out_after_in l'imposait deja (session precedente,
-- absente de schema.prisma) mais "> 0" laissait passer un double-tap de
-- 1 seconde. Remplacee par un minimum plausible (5 min).
ALTER TABLE "TimeEntry" DROP CONSTRAINT IF EXISTS "chk_time_entry_clock_out_after_in";

ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_min_duration"
  CHECK ("clockOutAt" IS NULL OR "clockOutAt" >= "clockInAt" + interval '5 minutes');
