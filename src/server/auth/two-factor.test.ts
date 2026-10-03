import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { stepAt, totpCode } from "@/lib/totp";
import { RateLimitedError } from "./rate-limit";
import {
  InvalidTwoFactorCodeError,
  isSessionTwoFactorVerified,
  requiresTwoFactor,
  twoFactorChallenge,
  verifyTwoFactorCode,
} from "./two-factor";

describe("double authentification (intégration DB)", () => {
  const suffix = Date.now();
  let userId: string;
  let sessionId: string;
  let secret: string;
  // Instant fixe : le code accepté puis rejoué tombe dans le même pas de
  // 30 secondes, quel que soit le temps d'exécution des tests.
  const now = new Date();

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET ??= "secret-de-test-assez-long";
    const user = await prisma.user.create({
      data: {
        email: `test-2fa-${suffix}@dlproprete.fr`,
        name: "Admin 2FA",
        firstName: "Admin",
        lastName: "2FA",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    userId = user.id;
    const session = await prisma.session.create({
      data: { userId, token: `test-2fa-${suffix}`, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    sessionId = session.id;
  });

  afterAll(async () => {
    await prisma.loginAttempt.deleteMany({ where: { key: `totp:${userId}` } });
    await prisma.auditLog.deleteMany({ where: { actorUserId: userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("obligatoire pour l'ADMIN seulement", () => {
    expect(requiresTwoFactor("ADMIN")).toBe(true);
    expect(requiresTwoFactor("PLANNER")).toBe(false);
    expect(requiresTwoFactor("AGENT")).toBe(false);
  });

  it("une nouvelle session n'est pas vérifiée", async () => {
    expect(await isSessionTwoFactorVerified(sessionId)).toBe(false);
  });

  it("premier passage : enregistrement, secret stable et chiffré en base", async () => {
    const first = await twoFactorChallenge(userId);
    expect(first.kind).toBe("enroll");
    if (first.kind !== "enroll") return;
    secret = first.secret;
    expect(first.uri).toContain(`secret=${secret}`);

    const again = await twoFactorChallenge(userId);
    expect(again.kind === "enroll" && again.secret).toBe(secret);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(row.totpSecret).not.toContain(secret);
    expect(row.totpEnabledAt).toBeNull();
  });

  it("un code faux est refusé et ne déverrouille rien", async () => {
    const wrong = totpCode(secret, stepAt(now) + 5);
    await expect(verifyTwoFactorCode({ userId, sessionId, code: wrong }, now)).rejects.toBeInstanceOf(
      InvalidTwoFactorCodeError,
    );
    expect(await isSessionTwoFactorVerified(sessionId)).toBe(false);
  });

  it("le bon code déverrouille la session et active la double authentification", async () => {
    await verifyTwoFactorCode({ userId, sessionId, code: totpCode(secret, stepAt(now)) }, now);
    expect(await isSessionTwoFactorVerified(sessionId)).toBe(true);
    const row = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(row.totpEnabledAt).not.toBeNull();
    expect((await twoFactorChallenge(userId)).kind).toBe("verify");
  });

  it("un code déjà utilisé ne sert pas une seconde fois", async () => {
    const other = await prisma.session.create({
      data: { userId, token: `test-2fa-autre-${suffix}`, expiresAt: new Date(Date.now() + 3_600_000) },
    });
    await expect(
      verifyTwoFactorCode({ userId, sessionId: other.id, code: totpCode(secret, stepAt(now)) }, now),
    ).rejects.toBeInstanceOf(InvalidTwoFactorCodeError);
    expect(await isSessionTwoFactorVerified(other.id)).toBe(false);
  });

  it("bloque après 5 codes faux", async () => {
    await prisma.loginAttempt.deleteMany({ where: { key: `totp:${userId}` } });
    const wrong = totpCode(secret, stepAt(now) + 7);
    for (let i = 0; i < 5; i += 1) {
      await expect(verifyTwoFactorCode({ userId, sessionId, code: wrong }, now)).rejects.toBeInstanceOf(
        InvalidTwoFactorCodeError,
      );
    }
    await expect(verifyTwoFactorCode({ userId, sessionId, code: wrong }, now)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
  });
});
