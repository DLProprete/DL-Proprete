-- Journal d'audit : l'identite de l'acteur etait uniquement portee par la FK
-- actorUserId (ON DELETE SET NULL) vers User. Supprimer un compte (fixture
-- de test jetable, depart d'un salarie) effacait donc retroactivement qui
-- avait fait quoi sur tout son historique passe -- constate le 31/08/2026 :
-- 100% des lignes en base avaient actorUserId NULL.

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorLabel" TEXT;

-- Reprise : fige le libelle a partir de l'acteur encore identifiable
-- (memes lignes affichees "Prenom Nom · email" que l'ecran /audit).
UPDATE "AuditLog" a
SET "actorLabel" = TRIM(u."firstName" || ' ' || u."lastName") || ' · ' || u."email"
FROM "User" u
WHERE a."actorUserId" = u."id";

-- Nettoyage : lignes deja orphelines (acteur supprime avant ce correctif),
-- toutes des artefacts de tests/demo sur cette instance de dev -- aucune
-- information recuperable, sans valeur d'historique metier.
DELETE FROM "AuditLog" WHERE "actorUserId" IS NULL;
