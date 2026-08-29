import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createAgent, resetAgentPassword, setAgentActive, updateAgentProfile } from "./actions";
import { getAgent, listTeam } from "./queries";

const validInput = {
  firstName: "Nouvel",
  lastName: "Agent",
  email: "nouvel.agent@dlproprete.fr",
  password: "changeme123",
};

function user(role: SessionUser["role"]): SessionUser {
  return { id: "u1", email: "u1@dlproprete.fr", role, isActive: true };
}

describe("droits Équipe — ADMIN uniquement", () => {
  it("createAgent rejette un PLANNER", async () => {
    await expect(createAgent(user("PLANNER"), validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("createAgent rejette un AGENT", async () => {
    await expect(createAgent(user("AGENT"), validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updateAgentProfile rejette un PLANNER", async () => {
    await expect(
      updateAgentProfile(user("PLANNER"), "any-id", { firstName: "A", lastName: "B" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("setAgentActive rejette un PLANNER", async () => {
    await expect(setAgentActive(user("PLANNER"), "any-id", false)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("resetAgentPassword rejette un PLANNER", async () => {
    await expect(
      resetAgentPassword(user("PLANNER"), "any-id", { password: "changeme123" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listTeam rejette un PLANNER", async () => {
    await expect(listTeam(user("PLANNER"))).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getAgent rejette un AGENT", async () => {
    await expect(getAgent(user("AGENT"), "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
