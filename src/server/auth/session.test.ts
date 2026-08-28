import { describe, expect, it } from "vitest";
import { ForbiddenError, assertOwnData, requireRole, type SessionUser } from "./session";

function user(role: SessionUser["role"], id = "u1"): SessionUser {
  return { id, email: `${id}@dlproprete.fr`, role, isActive: true };
}

describe("requireRole", () => {
  it("laisse passer un rôle autorisé", () => {
    expect(() => requireRole(user("PLANNER"), ["ADMIN", "PLANNER"])).not.toThrow();
  });

  it("rejette un rôle non autorisé", () => {
    expect(() => requireRole(user("AGENT"), ["ADMIN", "PLANNER"])).toThrow(ForbiddenError);
  });
});

describe("assertOwnData", () => {
  it("un AGENT peut accéder à ses propres données", () => {
    expect(() => assertOwnData(user("AGENT", "u1"), "u1")).not.toThrow();
  });

  it("un AGENT ne peut pas accéder aux données d'un autre agent", () => {
    expect(() => assertOwnData(user("AGENT", "u1"), "u2")).toThrow(ForbiddenError);
  });

  it("ADMIN et PLANNER ne sont pas restreints à leurs propres données", () => {
    expect(() => assertOwnData(user("ADMIN", "u1"), "u2")).not.toThrow();
    expect(() => assertOwnData(user("PLANNER", "u1"), "u2")).not.toThrow();
  });
});
