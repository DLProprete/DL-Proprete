import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { seal, unseal } from "@/lib/secret-box";
import { generateTotpSecret, otpauthUri, verifyTotp } from "@/lib/totp";
import { logAudit } from "@/server/audit/log";
import { consumeAttempt } from "./rate-limit";

// Double authentification par code à 6 chiffres (TOTP). Obligatoire pour
// l'ADMIN (décision du 03/10/2026) : il voit les justificatifs médicaux,
// la facturation, l'export paie et la boîte mail. Une session d'ADMIN
// n'ouvre aucune page tant que Session.twoFactorVerifiedAt est nul
// (requireSession, src/server/auth/session.ts) : sans code, rien.
const SECRET_PURPOSE = "totp";
// 5 codes faux en 15 minutes : au-delà, il faut attendre.
const MAX_CODE_ATTEMPTS = 5;

export class InvalidTwoFactorCodeError extends Error {}

export function requiresTwoFactor(role: Role): boolean {
  return role === "ADMIN";
}

export async function isSessionTwoFactorVerified(sessionId: string): Promise<boolean> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { twoFactorVerifiedAt: true },
  });
  return session?.twoFactorVerifiedAt != null;
}

export type TwoFactorChallenge =
  | { kind: "verify" }
  | { kind: "enroll"; secret: string; uri: string };

// Ce que la page de vérification doit afficher : saisie du code, ou
// enregistrement de l'application (premier passage). Le secret d'un
// enregistrement non confirmé est réutilisé : recharger la page ne change
// pas le compte déjà ajouté dans l'application.
export async function twoFactorChallenge(userId: string): Promise<TwoFactorChallenge> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, totpSecret: true, totpEnabledAt: true },
  });
  if (user.totpEnabledAt && user.totpSecret) return { kind: "verify" };

  let secret: string | null = null;
  if (user.totpSecret) {
    try {
      secret = unseal(user.totpSecret, SECRET_PURPOSE);
    } catch {
      secret = null;
    }
  }
  if (!secret) {
    secret = generateTotpSecret();
    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: seal(secret, SECRET_PURPOSE), totpEnabledAt: null, totpLastStep: null },
    });
  }
  return { kind: "enroll", secret, uri: otpauthUri(user.email, secret) };
}

// Vérifie le code ; en cas de succès, la session est déverrouillée et, au
// premier passage, la double authentification est activée. Lève
// RateLimitedError au-delà de 5 essais, InvalidTwoFactorCodeError sinon.
export async function verifyTwoFactorCode(
  { userId, sessionId, code }: { userId: string; sessionId: string; code: string },
  now = new Date(),
): Promise<void> {
  await consumeAttempt(`totp:${userId}`, MAX_CODE_ATTEMPTS, now);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { totpSecret: true, totpEnabledAt: true, totpLastStep: true },
  });
  if (!user.totpSecret) throw new InvalidTwoFactorCodeError("Code incorrect.");
  let secret: string;
  try {
    secret = unseal(user.totpSecret, SECRET_PURPOSE);
  } catch {
    throw new InvalidTwoFactorCodeError("Code incorrect.");
  }

  const step = verifyTotp(secret, code, now, user.totpLastStep);
  if (step === null) throw new InvalidTwoFactorCodeError("Code incorrect.");

  // Pas de temps enregistré de façon conditionnelle : deux envois
  // simultanés du même code ne passent pas tous les deux.
  const claimed = await prisma.user.updateMany({
    where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
    data: { totpLastStep: step, ...(user.totpEnabledAt ? {} : { totpEnabledAt: now }) },
  });
  if (claimed.count === 0) throw new InvalidTwoFactorCodeError("Code incorrect.");

  await prisma.session.update({ where: { id: sessionId }, data: { twoFactorVerifiedAt: now } });
  await prisma.loginAttempt.deleteMany({ where: { key: `totp:${userId}` } });
  if (!user.totpEnabledAt) {
    await logAudit(prisma, {
      actorUserId: userId,
      action: "TWO_FACTOR_ENABLED",
      entityType: "User",
      entityId: userId,
      summary: "Double authentification activée",
    });
  }
}
