import { cache } from "react";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/server/auth/session";
import { hashToken } from "./tokens";

export const PORTAL_COOKIE_NAME = "dl_client_portal_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Le cookie porte un jeton aléatoire de 32 octets ; la base n'en garde que
// le hash, qui sert d'identifiant de session (même principe que le lien
// magique). Une fuite de la table ne donne accès à aucun portail.
export async function createPortalSession(clientId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const session = await prisma.clientPortalSession.create({
    data: { id: hashToken(token), clientId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return { token, expiresAt: session.expiresAt };
}

export async function deletePortalSession(token: string): Promise<void> {
  await prisma.clientPortalSession.deleteMany({ where: { id: hashToken(token) } });
}

// Désactivation du client : tous ses accès au portail tombent aussitôt.
export async function revokePortalSessions(clientId: string): Promise<void> {
  await prisma.clientPortalSession.deleteMany({ where: { clientId } });
}

export type PortalSession = { clientId: string };

// Mémoïsé par requête (voir requireSession) : le layout et chaque page du
// portail client l'appellent chacun.
export const requireClientSession = cache(async (): Promise<PortalSession> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE_NAME)?.value;
  if (!token) {
    throw new UnauthorizedError("Session client requise");
  }
  const session = await prisma.clientPortalSession.findUnique({ where: { id: hashToken(token) } });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError("Session client expirée");
  }
  const client = await prisma.client.findUnique({ where: { id: session.clientId }, select: { isActive: true } });
  if (!client?.isActive) {
    throw new UnauthorizedError("Client désactivé");
  }
  return { clientId: session.clientId };
});
