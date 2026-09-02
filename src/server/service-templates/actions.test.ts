import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { serviceTemplateInputSchema } from "@/lib/zod/service-template";
import { createServiceTemplate, setServiceTemplateActive } from "./actions";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

const validInput = {
  contractSiteId: "any-contract-site-id",
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

describe("validation ServiceTemplate — au moins un jour, fin postérieure au début", () => {
  it("accepte une entrée valide", () => {
    expect(() => serviceTemplateInputSchema.parse(validInput)).not.toThrow();
  });

  it("refuse un tableau de jours vide", () => {
    expect(() => serviceTemplateInputSchema.parse({ ...validInput, daysOfWeek: [] })).toThrow(
      /Sélectionner au moins un jour/,
    );
  });

  it("refuse une heure de fin égale à l'heure de début", () => {
    expect(() =>
      serviceTemplateInputSchema.parse({ ...validInput, startTime: "08:00", endTime: "08:00" }),
    ).toThrow(/postérieure/);
  });

  it("refuse une heure de fin antérieure à l'heure de début", () => {
    expect(() =>
      serviceTemplateInputSchema.parse({ ...validInput, startTime: "10:00", endTime: "08:00" }),
    ).toThrow(/postérieure/);
  });
});
