import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { generateShifts } from "./generate-shifts";
import { assignAgent, cancelAssignment } from "./assignments";
import { listShiftsForWeek, listShiftsForDay, listAgents } from "./queries";
import { dateOnlyUTC } from "@/lib/dates";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };

describe("droits Planning — un AGENT reçoit un refus (403)", () => {
  it("generateShifts rejette un AGENT", async () => {
    await expect(generateShifts(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("assignAgent rejette un AGENT", async () => {
    await expect(assignAgent(agent, "any-shift", "any-user")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("cancelAssignment rejette un AGENT", async () => {
    await expect(cancelAssignment(agent, "any-assignment")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listShiftsForWeek rejette un AGENT", async () => {
    await expect(listShiftsForWeek(agent, dateOnlyUTC(2026, 6, 15))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("listShiftsForDay rejette un AGENT", async () => {
    await expect(listShiftsForDay(agent, dateOnlyUTC(2026, 6, 15))).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("listAgents rejette un AGENT", async () => {
    await expect(listAgents(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
