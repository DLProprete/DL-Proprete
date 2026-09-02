import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createContract } from "./actions";
import { listContracts, getContract } from "./queries";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

const validInput = {
  clientId: "any-client-id",
  reference: "C-TEST-001",
  startsOn: "2026-01-01",
  endsOn: "2026-12-31",
  status: "DRAFT",
} as const;

describe("droits Contract — un AGENT reçoit un refus (403)", () => {
  it("listContracts rejette un AGENT", async () => {
    await expect(listContracts(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getContract rejette un AGENT", async () => {
    await expect(getContract(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("createContract rejette un AGENT avant même de valider les données", async () => {
    await expect(createContract(agent, validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
