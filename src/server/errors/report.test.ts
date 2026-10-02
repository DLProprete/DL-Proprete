import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
const { sendEmail } = await import("@/lib/email");
const { reportServerError, ALERT_INTERVAL_MS } = await import("./report");

// Dates loin dans le futur : aucune vraie erreur journalisée ne peut interférer.
const T0 = new Date("2099-01-01T08:00:00Z");
const DIGEST = `test-report-${Date.now()}`;
const report = { message: "boom", digest: DIGEST, method: "POST", path: "/documents?q=client secret" };

describe("reportServerError", () => {
  // Restes d'un passage interrompu (afterAll non exécuté).
  beforeAll(() => prisma.auditLog.deleteMany({ where: { action: "SERVER_ERROR", createdAt: { gte: T0 } } }));
  beforeEach(() => {
    process.env.ERROR_ALERT_EMAIL = "alerte@example.test";
    vi.mocked(sendEmail).mockClear();
  });
  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: DIGEST } });
    delete process.env.ERROR_ALERT_EMAIL;
  });

  it("journalise chaque erreur, n'alerte qu'une fois par heure", async () => {
    expect(await reportServerError(report, T0)).toEqual({ alerted: true });
    expect(await reportServerError(report, new Date(T0.getTime() + 10 * 60 * 1000))).toEqual({ alerted: false });
    expect(await reportServerError(report, new Date(T0.getTime() + ALERT_INTERVAL_MS + 60 * 1000))).toEqual({ alerted: true });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendEmail).mock.calls[0][0].text).not.toContain("boom"); // pas de message (données) dans l'e-mail

    const rows = await prisma.auditLog.findMany({ where: { entityId: DIGEST } });
    expect(rows).toHaveLength(3);
    expect(rows[0].summary).toBe("POST /documents — boom"); // termes de recherche non conservés
    expect(rows[0].actorUserId).toBeNull();
  });

  it("n'envoie qu'une alerte pour des erreurs simultanées", async () => {
    const at = new Date(T0.getTime() + 5 * ALERT_INTERVAL_MS);
    const results = await Promise.all([1, 2, 3].map(() => reportServerError(report, at)));
    expect(results.filter((r) => r.alerted)).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("n'envoie rien sans ERROR_ALERT_EMAIL", async () => {
    delete process.env.ERROR_ALERT_EMAIL;
    expect(await reportServerError(report, new Date(T0.getTime() + 10 * ALERT_INTERVAL_MS))).toEqual({ alerted: false });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
