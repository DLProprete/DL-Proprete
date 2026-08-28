import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createClient, setClientActive } from "./actions";
import { listClients, getClient } from "./queries";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

const validInput = {
  legalName: "Client Test",
  billingAddress: "1 rue du Test",
  paymentTermDays: 30,
} as const;

describe("droits Client — un AGENT reçoit un refus (403)", () => {
  it("listClients rejette un AGENT", async () => {
    await expect(listClients(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getClient rejette un AGENT", async () => {
    await expect(getClient(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("createClient rejette un AGENT", async () => {
    await expect(createClient(agent, validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("setClientActive rejette un AGENT", async () => {
    await expect(setClientActive(agent, "any-id", false)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
