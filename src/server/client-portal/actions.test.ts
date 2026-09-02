import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { sendPortalLink } from "./actions";
import { isTokenExpired } from "./tokens";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

describe("droits ClientPortal — un AGENT reçoit un refus (403)", () => {
  it("sendPortalLink rejette un AGENT", async () => {
    await expect(sendPortalLink(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("isTokenExpired", () => {
  it("un token dont l'échéance est passée est expiré", () => {
    const now = new Date("2026-09-02T12:00:00Z");
    expect(isTokenExpired(new Date("2026-09-02T11:59:59Z"), now)).toBe(true);
  });

  it("un token dont l'échéance est future n'est pas expiré", () => {
    const now = new Date("2026-09-02T12:00:00Z");
    expect(isTokenExpired(new Date("2026-09-02T12:00:01Z"), now)).toBe(false);
  });

  it("l'échéance exacte compte comme expirée", () => {
    const now = new Date("2026-09-02T12:00:00Z");
    expect(isTokenExpired(now, now)).toBe(true);
  });
});
