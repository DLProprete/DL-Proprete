import { randomBytes } from "crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordSchema } from "@/lib/password-policy";
import { hashToken } from "@/server/client-portal/tokens";
import { logAudit } from "@/server/audit/log";
import { clearLoginAttempts, consumeAttempt } from "./rate-limit";

// « Mot de passe oublié » : lien à usage unique envoyé par e-mail.
// Jeton de 32 octets dont seul le hash est stocké (table Verification de
// Better Auth, préfixe propre), valable 30 minutes. Même écriture du compte
// que la réinitialisation par l'ADMIN (src/server/team/actions.ts).
const TOKEN_TTL_MS = 30 * 60 * 1000;
const IDENTIFIER_PREFIX = "password-reset:";
const CREDENTIAL_ISSUER = "local:credential";
const MAX_REQUESTS_PER_EMAIL = 3;
const MAX_REQUESTS_PER_IP = 5;

export class InvalidResetTokenError extends Error {}

function findActiveUserByEmail(email: string) {
  return prisma.user.findFirst({
    where: { email: { equals: email.trim(), mode: "insensitive" }, isActive: true },
    select: { id: true, email: true },
  });
}

export async function createPasswordResetToken(userId: string, now = new Date()): Promise<string> {
  // Un seul lien valable à la fois : les précédents (et les échus) tombent.
  await prisma.verification.deleteMany({
    where: {
      identifier: { startsWith: IDENTIFIER_PREFIX },
      OR: [{ value: userId }, { expiresAt: { lt: now } }],
    },
  });
  const token = randomBytes(32).toString("base64url");
  await prisma.verification.create({
    data: {
      identifier: `${IDENTIFIER_PREFIX}${hashToken(token)}`,
      value: userId,
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS),
    },
  });
  return token;
}

// Réponse identique que le compte existe ou non (pas d'énumération des
// comptes) : l'appelant affiche toujours « si ce compte existe, un e-mail
// est parti ». Lève RateLimitedError au-delà de la limite.
export async function requestPasswordReset(
  { email, ip }: { email: string; ip: string },
  now = new Date(),
): Promise<void> {
  await consumeAttempt(`reset-ip:${ip}`, MAX_REQUESTS_PER_IP, now);
  await consumeAttempt(`reset-email:${email.trim().toLowerCase()}`, MAX_REQUESTS_PER_EMAIL, now);

  const user = await findActiveUserByEmail(email);
  if (!user) return;

  const token = await createPasswordResetToken(user.id, now);
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/mot-de-passe-oublie/nouveau?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Réinitialisation de votre mot de passe DL Propreté",
    text:
      "Bonjour,\n\n" +
      "Une réinitialisation du mot de passe de votre compte DL Propreté a été demandée. " +
      "Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 30 minutes, une seule fois) :\n\n" +
      `${link}\n\n` +
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : votre mot de passe reste inchangé.\n\n" +
      "DL Propreté",
  });
}

async function findValidToken(token: string, now: Date) {
  return prisma.verification.findFirst({
    where: { identifier: `${IDENTIFIER_PREFIX}${hashToken(token)}`, expiresAt: { gt: now } },
  });
}

// Pour la page du lien : l'e-mail du compte (rattachement au trousseau), ou
// null si le lien est invalide ou échu. Ne consomme pas le jeton.
export async function emailForResetToken(token: string, now = new Date()): Promise<string | null> {
  const row = await findValidToken(token, now);
  if (!row) return null;
  const user = await prisma.user.findUnique({ where: { id: row.value }, select: { email: true, isActive: true } });
  return user?.isActive ? user.email : null;
}

export async function resetPasswordWithToken(
  { token, password }: { token: string; password: unknown },
  now = new Date(),
): Promise<void> {
  const newPassword = passwordSchema.parse(password);
  const row = await findValidToken(token, now);
  if (!row) throw new InvalidResetTokenError("Lien invalide ou expiré.");
  // Consommation atomique : un lien ne sert qu'une fois, même en double clic.
  const consumed = await prisma.verification.deleteMany({
    where: { id: row.id, expiresAt: { gt: now } },
  });
  if (consumed.count === 0) throw new InvalidResetTokenError("Lien invalide ou expiré.");

  const user = await prisma.user.findUnique({ where: { id: row.value } });
  if (!user?.isActive) throw new InvalidResetTokenError("Lien invalide ou expiré.");

  const hashed = await hashPassword(newPassword);
  await prisma.account.upsert({
    where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: user.id } },
    update: { password: hashed },
    create: { userId: user.id, accountId: user.id, providerId: "credential", issuer: CREDENTIAL_ISSUER, password: hashed },
  });
  // Toute session ouverte avec l'ancien mot de passe tombe.
  await prisma.session.deleteMany({ where: { userId: user.id } });
  await clearLoginAttempts(user.email);
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    summary: "Mot de passe réinitialisé par lien e-mail",
  });
}
