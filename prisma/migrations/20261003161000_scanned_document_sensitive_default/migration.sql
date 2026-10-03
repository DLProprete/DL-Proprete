-- Nouveau document numérisé : masqué aux planificateurs jusqu'à validation
-- par l'ADMIN. Les documents existants gardent leur marquage.
ALTER TABLE "ScannedDocument" ALTER COLUMN "isSensitive" SET DEFAULT true;
