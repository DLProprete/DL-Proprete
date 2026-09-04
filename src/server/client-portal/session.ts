import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError } from "@/server/auth/session";

export const PORTAL_COOKIE_NAME = "dl_client_portal_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function createPortalSession(clientId: string): Promise<{ id: string; expiresAt: Date }> {
  return prisma.clientPortalSession.create({
    data: { clientId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
}

export type PortalSession = { clientId: string };

// Mémoïsé par requête (voir requireSession) : le layout et chaque page du
// portail client l'appellent chacun.
export const requireClientSession = cache(async (): Promise<PortalSession> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(PORTAL_COOKIE_NAME)?.value;
  if (!sessionId) {
    throw new UnauthorizedError("Session client requise");
  }
  const session = await prisma.clientPortalSession.findUnique({ where: { id: sessionId } });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    throw new UnauthorizedError("Session client expirée");
  }
  return { clientId: session.clientId };
});
