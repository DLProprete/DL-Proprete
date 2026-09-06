import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { InvalidCurrentPasswordError, updateMyEmail, updateMyPassword } from "./actions";

const CREDENTIAL_ISSUER = "local:credential";

describe("updateMyEmail / updateMyPassword — self-service (intégration DB)", () => {
  const suffix = Date.now();
  let userId: string;
  let sessionUser: SessionUser;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test-account-${suffix}@dlproprete.fr`,
        name: "Compte Test",
        firstName: "Compte",
        lastName: "Test",
        role: "ADMIN",
        emailVerified: true,
      },
    });
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        issuer: CREDENTIAL_ISSUER,
        password: await hashPassword("motdepasseinitial"),
      },
    });
    userId = user.id;
    sessionUser = { id: user.id, email: user.email, role: "ADMIN", isActive: true };
  });

  afterAll(async () => {
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it("met à jour l'e-mail de connexion", async () => {
    const newEmail = `test-account-updated-${suffix}@dlproprete.fr`;
    await updateMyEmail(sessionUser, { email: newEmail });
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(updated.email).toBe(newEmail);
  });

  it("rejette un e-mail invalide", async () => {
    await expect(updateMyEmail(sessionUser, { email: "pas-un-email" })).rejects.toBeInstanceOf(
      ZodError,
    );
  });

  it("refuse le changement si le mot de passe actuel est incorrect", async () => {
    await expect(
      updateMyPassword(sessionUser, {
        currentPassword: "mauvais-mot-de-passe",
        newPassword: "nouveaumotdepasse123",
      }),
    ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);
  });

  it("change le mot de passe quand l'actuel est correct, et le nouveau fonctionne ensuite", async () => {
    await updateMyPassword(sessionUser, {
      currentPassword: "motdepasseinitial",
      newPassword: "nouveaumotdepasse123",
    });
    const account = await prisma.account.findUniqueOrThrow({
      where: { issuer_accountId: { issuer: CREDENTIAL_ISSUER, accountId: userId } },
    });
    const valid = await verifyPassword({
      hash: account.password ?? "",
      password: "nouveaumotdepasse123",
    });
    expect(valid).toBe(true);
  });
});
