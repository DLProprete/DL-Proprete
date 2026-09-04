import { cache } from "react";
import { headers } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
};

// Mémoïsé par requête (React cache) : le layout ET chaque page appellent
// requireSession, sans ce cache chaque navigation ferait 2+ allers-retours
// DB identiques pour la même session.
export const requireSession = cache(async (): Promise<SessionUser> => {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  // role/isActive viennent des additionalFields Better Auth (typés "string"/
  // "boolean" côté auth.ts) ; le cast vers le type Prisma reste correct tant
  // que le seed/les créations d'utilisateurs passent par nos Server Actions.
  if (!user || !(user as { isActive?: boolean }).isActive) {
    throw new UnauthorizedError("Session requise");
  }
  return {
    id: user.id,
    email: user.email,
    role: (user as { role: string }).role as Role,
    isActive: true,
  };
});

export function requireRole(user: SessionUser, allowed: Role[]): void {
  if (!allowed.includes(user.role)) {
    throw new ForbiddenError("Rôle insuffisant pour cette action");
  }
}

// Règle dure (CLAUDE.md) : un AGENT ne lit et n'écrit que ses propres
// données. ADMIN et PLANNER ne sont pas soumis à cette restriction.
export function assertOwnData(user: SessionUser, ownerId: string): void {
  if (user.role === "AGENT" && user.id !== ownerId) {
    throw new ForbiddenError("Un agent ne peut accéder qu'à ses propres données");
  }
}
