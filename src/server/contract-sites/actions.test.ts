import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createContractSite } from "./actions";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

const validInput = {
  contractId: "any-contract-id",
  siteId: "any-site-id",
  hourlyRateHT: 25,
} as const;

describe("droits ContractSite — un AGENT reçoit un refus (403)", () => {
  it("createContractSite rejette un AGENT avant même de valider les données", async () => {
    await expect(createContractSite(agent, validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
