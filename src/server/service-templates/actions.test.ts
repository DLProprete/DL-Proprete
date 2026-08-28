import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { createServiceTemplate, setServiceTemplateActive } from "./actions";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

const validInput = {
  contractId: "any-contract-id",
  name: "Entretien quotidien",
  daysOfWeek: [1, 2, 3, 4, 5],
  startTime: "06:00",
  endTime: "08:00",
  durationMinutes: 90,
  requiredAgents: 1,
} as const;

describe("droits ServiceTemplate — un AGENT reçoit un refus (403)", () => {
  it("createServiceTemplate rejette un AGENT", async () => {
    await expect(createServiceTemplate(agent, validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("setServiceTemplateActive rejette un AGENT", async () => {
    await expect(setServiceTemplateActive(agent, "any-id", false)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
