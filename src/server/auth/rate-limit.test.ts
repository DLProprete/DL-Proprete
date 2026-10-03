import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { clearLoginAttempts, consumeLoginAttempt, RateLimitedError } from "./rate-limit";

// Intégration DB : le compteur vit en base pour tenir entre les instances.
const suffix = Date.now();
const ip = (label: string) => `test-${label}-${suffix}`;
const email = (label: string) => `test-ratelimit-${label}-${suffix}@dlproprete.fr`;

afterAll(async () => {
  await prisma.loginAttempt.deleteMany({ where: { key: { contains: String(suffix) } } });
});

describe("consumeLoginAttempt", () => {
  it("autorise 5 tentatives par IP puis bloque la 6e, même avec un autre e-mail", async () => {
    const now = new Date();
    for (let i = 0; i < 5; i += 1) {
      await consumeLoginAttempt({ ip: ip("a"), email: email(`a${i}`) }, now);
    }
    await expect(consumeLoginAttempt({ ip: ip("a"), email: email("a-autre") }, now)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
  });

  it("bloque un même compte visé depuis plusieurs IP au-delà de 10 tentatives", async () => {
    const now = new Date();
    for (let i = 0; i < 10; i += 1) {
      await consumeLoginAttempt({ ip: ip(`b${i}`), email: email("cible") }, now);
    }
    await expect(consumeLoginAttempt({ ip: ip("b-autre"), email: email("cible") }, now)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
  });

  it("réautorise une fois la fenêtre de 15 minutes écoulée", async () => {
    const now = new Date();
    for (let i = 0; i < 5; i += 1) {
      await consumeLoginAttempt({ ip: ip("c"), email: email("c") }, now);
    }
    await expect(consumeLoginAttempt({ ip: ip("c"), email: email("c") }, now)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
    const later = new Date(now.getTime() + 15 * 60 * 1000 + 1);
    await expect(consumeLoginAttempt({ ip: ip("c"), email: email("c") }, later)).resolves.toBeUndefined();
  });

  it("une connexion réussie remet à zéro le compteur du compte, pas celui de l'IP", async () => {
    const now = new Date();
    for (let i = 0; i < 4; i += 1) {
      await consumeLoginAttempt({ ip: ip(`d${i}`), email: email("d") }, now);
    }
    await clearLoginAttempts(email("d"));
    expect(await prisma.loginAttempt.findUnique({ where: { key: `email:${email("d")}` } })).toBeNull();
    expect(await prisma.loginAttempt.findUnique({ where: { key: `ip:${ip("d0")}` } })).not.toBeNull();
  });

  it("ne distingue pas la casse de l'e-mail", async () => {
    const now = new Date();
    await consumeLoginAttempt({ ip: ip("e"), email: email("Casse").toUpperCase() }, now);
    const row = await prisma.loginAttempt.findUnique({ where: { key: `email:${email("casse").toLowerCase()}` } });
    expect(row?.count).toBe(1);
  });
});
