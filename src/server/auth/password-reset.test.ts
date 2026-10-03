import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createPasswordResetToken,
  emailForResetToken,
  InvalidResetTokenError,
  requestPasswordReset,
  resetPasswordWithToken,
} from "./password-reset";

const CREDENTIAL_ISSUER = "local:credential";
const NEW_PASSWORD = "vupdoz-7rykqe-Sefgob";

describe("mot de passe oublié (intégration DB)", () => {
  const suffix = Date.now();
  const email = `test-reset-${suffix}@dlproprete.fr`;
  let userId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email, name: "Reset Test", firstName: "Reset", lastName: "Test", role: "AGENT", emailVerified: true },
    });
    userId = user.id;
    await prisma.account.create({
      data: {
        userId,
        accountId: userId,
        providerId: "credential",
        issuer: CREDENTIAL_ISSUER,
        password: await hashPassword("ancienmotdepasse"),
      },
    });
  });

  afterAll(async () => {
    await prisma.verification.deleteMany({ where: { value: userId } });
    await prisma.loginAttempt.deleteMany({ where: { key: { contains: String(suffix) } } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("le lien change le mot de passe, déconnecte partout et ne sert qu'une fois", async () => {
    await prisma.session.create({
      data: { userId, token: `test-reset-session-${suffix}`, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    const token = await createPasswordResetToken(userId);
    expect(await emailForResetToken(token)).toBe(email);

    await resetPasswordWithToken({ token, password: NEW_PASSWORD });

    const account = await prisma.account.findUniqueOrThrow({
      where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: userId } },
    });
    expect(await verifyPassword({ hash: account.password ?? "", password: NEW_PASSWORD })).toBe(true);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);
    await expect(resetPasswordWithToken({ token, password: NEW_PASSWORD })).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it("refuse un lien échu", async () => {
    const issuedAt = new Date(Date.now() - 31 * 60 * 1000);
    const token = await createPasswordResetToken(userId, issuedAt);
    expect(await emailForResetToken(token)).toBeNull();
    await expect(resetPasswordWithToken({ token, password: NEW_PASSWORD })).rejects.toBeInstanceOf(
      InvalidResetTokenError,
    );
  });

  it("refuse un mot de passe trop court sans consommer le lien", async () => {
    const token = await createPasswordResetToken(userId);
    await expect(resetPasswordWithToken({ token, password: "court" })).rejects.toBeInstanceOf(ZodError);
    expect(await emailForResetToken(token)).toBe(email);
  });

  it("ne stocke que le hash du jeton, et un nouveau lien annule le précédent", async () => {
    const first = await createPasswordResetToken(userId);
    const second = await createPasswordResetToken(userId);
    expect(await prisma.verification.findFirst({ where: { identifier: { contains: first } } })).toBeNull();
    expect(await emailForResetToken(first)).toBeNull();
    expect(await emailForResetToken(second)).toBe(email);
  });

  it("une adresse inconnue ne lève rien et ne crée aucun lien", async () => {
    const before = await prisma.verification.count();
    await requestPasswordReset({ email: `inconnu-${suffix}@dlproprete.fr`, ip: `test-ip-${suffix}` });
    expect(await prisma.verification.count()).toBe(before);
  });

  it("aucun lien pour un compte désactivé", async () => {
    await prisma.verification.deleteMany({ where: { value: userId } });
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    await requestPasswordReset({ email, ip: `test-ip2-${suffix}` });
    expect(await prisma.verification.count({ where: { value: userId } })).toBe(0);
    await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  });
});
