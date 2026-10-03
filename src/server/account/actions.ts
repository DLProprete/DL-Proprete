import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import type { SessionUser } from "@/server/auth/session";
import { changeMyEmailSchema, changeMyPasswordSchema } from "@/lib/zod/account";
import { logAudit } from "@/server/audit/log";

// Même issuer synthétique que prisma/seed.ts et src/server/team/actions.ts —
// Better Auth retrouve le compte credential via (issuer, accountId).
const CREDENTIAL_ISSUER = "local:credential";

export class InvalidCurrentPasswordError extends Error {}

async function assertCurrentPassword(userId: string, password: string) {
  const account = await prisma.account.findUniqueOrThrow({
    where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: userId } },
  });
  const valid = await verifyPassword({ hash: account.password ?? "", password });
  if (!valid) {
    throw new InvalidCurrentPasswordError("Mot de passe actuel incorrect.");
  }
}

// Après un changement d'identifiants, les autres appareils sont déconnectés :
// un téléphone perdu ou une session volée ne survit pas au changement.
async function revokeOtherSessions(userId: string, keepSessionId: string | undefined) {
  await prisma.session.deleteMany({
    where: { userId, ...(keepSessionId ? { NOT: { id: keepSessionId } } : {}) },
  });
}

// Self-service, scopé sur user.id (la session) : pas de restriction de rôle,
// contrairement à team/actions.ts qui gère les comptes des AUTRES.
// Mot de passe actuel exigé : une session volée ne suffit pas à prendre le
// compte en changeant son e-mail.
export async function updateMyEmail(user: SessionUser, input: unknown, keepSessionId?: string) {
  const { email, currentPassword } = changeMyEmailSchema.parse(input);
  await assertCurrentPassword(user.id, currentPassword);
  await prisma.user.update({ where: { id: user.id }, data: { email } });
  await revokeOtherSessions(user.id, keepSessionId);
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "ACCOUNT_EMAIL_UPDATED",
    entityType: "User",
    entityId: user.id,
    summary: `E-mail de connexion mis à jour : ${email}`,
  });
}

export async function updateMyPassword(user: SessionUser, input: unknown, keepSessionId?: string) {
  const { currentPassword, newPassword } = changeMyPasswordSchema.parse(input);
  await assertCurrentPassword(user.id, currentPassword);
  const hashed = await hashPassword(newPassword);
  await prisma.account.update({
    where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: user.id } },
    data: { password: hashed },
  });
  await revokeOtherSessions(user.id, keepSessionId);
  // Jamais le mot de passe dans le résumé/metadata (règle dure).
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    summary: "Mot de passe changé (auto-service)",
  });
}
