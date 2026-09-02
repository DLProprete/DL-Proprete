import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createProspect, updateProspect, convertProspectToClient } from "./actions";
import { listProspects, getProspect } from "./queries";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

const validInput = {
  legalName: "Prospect Test",
} as const;

describe("droits Prospect — un AGENT reçoit un refus (403)", () => {
  it("listProspects rejette un AGENT", async () => {
    await expect(listProspects(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getProspect rejette un AGENT", async () => {
    await expect(getProspect(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("createProspect rejette un AGENT", async () => {
    await expect(createProspect(agent, validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("updateProspect rejette un AGENT", async () => {
    await expect(updateProspect(agent, "any-id", validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("convertProspectToClient rejette un AGENT", async () => {
    await expect(
      convertProspectToClient(agent, "any-id", { legalName: "X", billingAddress: "Y" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
