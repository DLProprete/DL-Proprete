import { cache } from "react";
import { headers } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { DEFAULT_DISPLAY_PREFS, type DisplayPrefs } from "@/lib/display-prefs";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
};

// Une seule lecture de session par requête, partagée par requireSession et
// getDisplayPrefs (layout racine).
export const getSessionRaw = cache(async () => auth.api.getSession({ headers: await headers() }));

// Réglages d'affichage de la session courante, ou null (page de connexion,
// portail client sans compte). Jamais d'exception : le rendu ne doit pas
// dépendre d'eux. Better Auth type les champs en string : on n'accepte que
// les valeurs connues, sinon le défaut.
const TEXT_SIZES = ["NORMAL", "LARGE", "XLARGE"] as const;
const THEMES = ["SYSTEM", "LIGHT", "DARK"] as const;

export const getDisplayPrefs = cache(async (): Promise<DisplayPrefs | null> => {
  const user = (await getSessionRaw().catch(() => null))?.user as Record<string, unknown> | undefined;
  if (!user) return null;
  const { textSize: defaultSize, theme: defaultTheme } = DEFAULT_DISPLAY_PREFS;
  return {
    textSize: TEXT_SIZES.find((v) => v === user.displayTextSize) ?? defaultSize,
    contrast: user.displayContrast === true,
    theme: THEMES.find((v) => v === user.displayTheme) ?? defaultTheme,
    reducedMotion: user.displayReducedMotion === true,
    dyslexicFont: user.displayDyslexicFont === true,
  };
});

// Mémoïsé par requête (React cache) : le layout ET chaque page appellent
// requireSession, sans ce cache chaque navigation ferait 2+ allers-retours
// DB identiques pour la même session.
export const requireSession = cache(async (): Promise<SessionUser> => {
  const session = await getSessionRaw();
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
