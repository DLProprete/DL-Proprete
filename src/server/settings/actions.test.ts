import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { updateCompanyProfile } from "./actions";

const validInput = {
  legalName: "DL PROPRETE",
  address: "3 rue de Verdun, 14460 Colombelles",
};

function user(role: SessionUser["role"]): SessionUser {
  return { id: "u1", email: "u1@dlproprete.fr", role, isActive: true };
}

describe("droits CompanyProfile — ADMIN uniquement", () => {
  it("updateCompanyProfile rejette un PLANNER", async () => {
    await expect(updateCompanyProfile(user("PLANNER"), validInput)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("updateCompanyProfile rejette un AGENT", async () => {
    await expect(updateCompanyProfile(user("AGENT"), validInput)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
