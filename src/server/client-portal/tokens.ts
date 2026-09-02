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

export async function consumePortalToken(rawToken: string): Promise<string> {
  const token = await prisma.clientPortalToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });
  if (!token || token.usedAt || isTokenExpired(token.expiresAt, new Date())) {
    throw new PortalTokenInvalidError("Lien invalide ou expiré");
  }
  await prisma.clientPortalToken.update({
    where: { id: token.id },
    data: { usedAt: new Date() },
  });
  return token.clientId;
}
