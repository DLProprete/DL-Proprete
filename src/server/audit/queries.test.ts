import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { listActors, listAuditLogs } from "./queries";

function user(role: SessionUser["role"]): SessionUser {
  return { id: "u1", email: "u1@dlproprete.fr", role, isActive: true };
}

describe("droits Audit — ADMIN uniquement", () => {
  it("listAuditLogs rejette un PLANNER", async () => {
    await expect(listAuditLogs(user("PLANNER"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listAuditLogs rejette un AGENT", async () => {
    await expect(listAuditLogs(user("AGENT"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listActors rejette un PLANNER", async () => {
    await expect(listActors(user("PLANNER"))).rejects.toBeInstanceOf(ForbiddenError);
  });
});
