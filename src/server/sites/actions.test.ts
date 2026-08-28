import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createSite, setSiteActive } from "./actions";
import { listSites, getSite } from "./queries";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

const validInput = {
  clientId: "any-client-id",
  name: "Site Test",
  address: "1 rue du Test",
  city: "Caen",
  postalCode: "14000",
} as const;

describe("droits Site — un AGENT reçoit un refus (403)", () => {
  it("listSites rejette un AGENT", async () => {
    await expect(listSites(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getSite rejette un AGENT", async () => {
    await expect(getSite(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("createSite rejette un AGENT", async () => {
    await expect(createSite(agent, validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("setSiteActive rejette un AGENT", async () => {
    await expect(setSiteActive(agent, "any-id", false)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
