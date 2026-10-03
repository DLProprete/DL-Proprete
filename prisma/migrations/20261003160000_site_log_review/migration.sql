-- Main courante masquée au client par défaut : publiée après relecture.
ALTER TABLE "SiteLog" ALTER COLUMN "visibleToClient" SET DEFAULT false;

-- E-mail « nouveau rapport » envoyé au plus une fois par entrée.
ALTER TABLE "SiteLog" ADD COLUMN "clientNotifiedAt" TIMESTAMP(3);

-- Les entrées déjà visibles ont été notifiées à leur création.
UPDATE "SiteLog" SET "clientNotifiedAt" = "createdAt" WHERE "visibleToClient" = true;
