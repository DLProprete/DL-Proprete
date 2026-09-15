import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 15 * 60 * 1000;

export class PortalTokenInvalidError extends Error {}

// Jamais le token brut en base — seul son hash permet de le retrouver, comme
// un mot de passe. Fonctions pures (pas d'accès DB) pour rester testables
// sans base, même limite de couverture que le reste du dépôt.
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function isTokenExpired(expiresAt: Date, now: Date): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export async function createPortalToken(clientId: string): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await prisma.clientPortalToken.create({
    data: {
      clientId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });
  return raw;
}

// La consommation doit être atomique : deux requêtes concurrentes avec le
// même lien (ex. un proxy de messagerie qui pré-charge le lien, puis le
// vrai clic) ne doivent jamais pouvoir passer toutes les deux la
// vérification avant qu'aucune n'ait écrit usedAt — trouvé en audit de
// sécurité du 15/09. La clause WHERE de l'updateMany, exécutée en une
// seule requête SQL, est ce qui rend l'opération atomique.
export async function consumePortalToken(rawToken: string): Promise<string> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.clientPortalToken.findUnique({ where: { tokenHash } });
  if (!token) {
    throw new PortalTokenInvalidError("Lien invalide ou expiré");
  }

  const result = await prisma.clientPortalToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (result.count === 0) {
    throw new PortalTokenInvalidError("Lien invalide ou expiré");
  }
  return token.clientId;
}
