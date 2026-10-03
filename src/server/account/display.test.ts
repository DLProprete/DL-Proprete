import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/server/auth/session";
import { updateDisplayPrefs } from "./display";

const suffix = Date.now();
let me: SessionUser;
let other: SessionUser;

describe("updateDisplayPrefs (intégration)", () => {
  beforeAll(async () => {
    const make = (label: string) =>
      prisma.user.create({
        data: { email: `test-display-${label}-${suffix}@dlproprete.fr`, name: label, firstName: label, lastName: "Test", role: "AGENT", emailVerified: true },
      });
    const [a, b] = [await make("moi"), await make("autre")];
    me = { id: a.id, email: a.email, role: "AGENT", isActive: true };
    other = { id: b.id, email: b.email, role: "AGENT", isActive: true };
  });
  afterAll(async () => {
    // Filtre toujours défini (suffixe constant), même si beforeAll a échoué :
    // jamais de deleteMany qui viserait toute la table.
    await prisma.user.deleteMany({ where: { email: { endsWith: `-${suffix}@dlproprete.fr` } } });
  });

  it("enregistre mes réglages, jamais ceux d'un autre (l'id vient de la session)", async () => {
    await updateDisplayPrefs(me, { textSize: "LARGE", theme: "DARK", contrast: "on", id: other.id, userId: other.id });
    const mine = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    const theirs = await prisma.user.findUniqueOrThrow({ where: { id: other.id } });
    expect([mine.displayTextSize, mine.displayTheme, mine.displayContrast]).toEqual(["LARGE", "DARK", true]);
    expect([theirs.displayTextSize, theirs.displayContrast]).toEqual(["NORMAL", false]);
  });

  it("refuse une saisie invalide sans rien écrire", async () => {
    await expect(updateDisplayPrefs(me, { textSize: "HUGE", theme: "SYSTEM" })).rejects.toThrow();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: me.id } })).displayTextSize).toBe("LARGE");
  });
});
