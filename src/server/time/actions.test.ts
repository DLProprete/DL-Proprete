import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { startTimeEntry, endTimeEntry } from "./actions";
import { listTodayShiftsForAgent, getOpenTimeEntry } from "./queries";
import { listTimeEntriesForReview, validateTimeEntry, rejectTimeEntry } from "./review";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };
const admin: SessionUser = { id: "u-admin", email: "admin@dlproprete.fr", role: "ADMIN", isActive: true };
const planner: SessionUser = {
  id: "u-planner",
  email: "planner@dlproprete.fr",
  role: "PLANNER",
  isActive: true,
};

describe("droits Pointage — seul un AGENT pointe, seuls ADMIN/PLANNER valident", () => {
  it("startTimeEntry rejette un ADMIN (pas un agent)", async () => {
    await expect(startTimeEntry(admin, "any-shift")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("endTimeEntry rejette un ADMIN", async () => {
    await expect(endTimeEntry(admin, "any-entry")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listTodayShiftsForAgent rejette un ADMIN", async () => {
    await expect(listTodayShiftsForAgent(admin)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getOpenTimeEntry rejette un PLANNER", async () => {
    await expect(getOpenTimeEntry(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listTimeEntriesForReview rejette un AGENT", async () => {
    await expect(listTimeEntriesForReview(agent)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("validateTimeEntry rejette un AGENT", async () => {
    await expect(validateTimeEntry(agent, "any-entry")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("rejectTimeEntry rejette un AGENT", async () => {
    await expect(rejectTimeEntry(agent, "any-entry")).rejects.toBeInstanceOf(ForbiddenError);
  });
});
