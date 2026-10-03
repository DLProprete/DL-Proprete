import { prisma } from "@/lib/prisma";

const WINDOW_MS = 15 * 60 * 1000;
// Par IP : un poste qui essaie plusieurs comptes. Par e-mail : une attaque
// répartie sur plusieurs IP contre un même compte. Plus large par e-mail,
// pour qu'un tiers ne bloque pas trop facilement un compte légitime.
const MAX_PER_IP = 5;
const MAX_PER_EMAIL = 10;

export class RateLimitedError extends Error {}

// Compte une tentative sur une clé (connexion, demande de réinitialisation…), ou lève RateLimitedError si la limite
// de la fenêtre en cours est atteinte. L'incrément est conditionnel en une
// seule requête SQL : deux tentatives simultanées ne passent pas toutes les
// deux sous la limite.
export async function consumeAttempt(key: string, max: number, now: Date): Promise<void> {
  const windowStillOpen = await prisma.loginAttempt.updateMany({
    where: { key, resetAt: { gt: now }, count: { lt: max } },
    data: { count: { increment: 1 } },
  });
  if (windowStillOpen.count === 1) return;

  const existing = await prisma.loginAttempt.findUnique({ where: { key } });
  if (existing && existing.resetAt > now) {
    throw new RateLimitedError("Trop de tentatives, réessayez plus tard.");
  }
  const resetAt = new Date(now.getTime() + WINDOW_MS);
  await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, count: 1, resetAt },
    update: { count: 1, resetAt },
  });
}

export async function consumeLoginAttempt(
  { ip, email }: { ip: string; email: string },
  now = new Date(),
): Promise<void> {
  // Ménage des fenêtres échues depuis plus d'un jour : la table reste minuscule.
  await prisma.loginAttempt.deleteMany({
    where: { resetAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
  });
  await consumeAttempt(`ip:${ip}`, MAX_PER_IP, now);
  await consumeAttempt(`email:${email.trim().toLowerCase()}`, MAX_PER_EMAIL, now);
}

// Connexion réussie : les fautes de frappe précédentes ne comptent plus
// contre ce compte. Le compteur par IP, lui, reste.
export async function clearLoginAttempts(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key: `email:${email.trim().toLowerCase()}` } });
}
