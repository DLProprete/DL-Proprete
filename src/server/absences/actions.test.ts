import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { absenceInputSchema } from "@/lib/zod/absence";
import { declareAbsence, approveAbsence, rejectAbsence } from "./actions";
import { listMyAbsences, listPendingAbsences, listShiftsNeedingReplacement } from "./queries";
import { listReplacementCandidates } from "./replacements";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };
const planner: SessionUser = {
  id: "u-planner",
  email: "planner@dlproprete.fr",
  role: "PLANNER",
  isActive: true,
};

const validInput = {
  type: "RTT",
  startsOn: "2026-09-01",
  endsOn: "2026-09-02",
} as const;

describe("droits Absence — déclaration AGENT, validation ADMIN uniquement", () => {
  it("declareAbsence rejette un ADMIN/PLANNER (seul un AGENT déclare)", async () => {
    await expect(declareAbsence(planner, validInput)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("approveAbsence rejette un PLANNER (validation ADMIN uniquement)", async () => {
    await expect(approveAbsence(planner, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("approveAbsence rejette un AGENT", async () => {
    await expect(approveAbsence(agent, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejectAbsence rejette un PLANNER", async () => {
    await expect(rejectAbsence(planner, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listMyAbsences rejette un ADMIN", async () => {
    const admin: SessionUser = { id: "u-admin", email: "a@dlproprete.fr", role: "ADMIN", isActive: true };
    await expect(listMyAbsences(admin)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listPendingAbsences rejette un PLANNER", async () => {
    await expect(listPendingAbsences(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listShiftsNeedingReplacement rejette un PLANNER", async () => {
    await expect(listShiftsNeedingReplacement(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listReplacementCandidates rejette un PLANNER", async () => {
    await expect(listReplacementCandidates(planner, "any-shift")).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});

describe("validation Absence — dates, justificatif obligatoire pour SICK", () => {
  it("accepte une entrée RTT valide sans document", () => {
    expect(() => absenceInputSchema.parse(validInput)).not.toThrow();
  });

  it("refuse une date de fin antérieure à la date de début", () => {
    expect(() =>
      absenceInputSchema.parse({ ...validInput, startsOn: "2026-09-05", endsOn: "2026-09-01" }),
    ).toThrow();
  });

  it("refuse un arrêt maladie sans justificatif", () => {
    expect(() => absenceInputSchema.parse({ ...validInput, type: "SICK" })).toThrow(
      /justificatif/,
    );
  });

  it("accepte un arrêt maladie avec justificatif", () => {
    expect(() =>
      absenceInputSchema.parse({ ...validInput, type: "SICK", documentPath: "absences/x.pdf" }),
    ).not.toThrow();
  });
});
