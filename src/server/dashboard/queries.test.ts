import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import {
  getUnstaffedShiftsTodayTomorrow,
  getLongOpenTimeEntries,
  getUnpaidIssuedInvoices,
  getContractsEndingSoon,
} from "./queries";

const planner: SessionUser = {
  id: "u-planner",
  email: "planner@dlproprete.fr",
  role: "PLANNER",
  isActive: true,
};

describe("droits Dashboard — ADMIN seulement", () => {
  it("getUnstaffedShiftsTodayTomorrow rejette un PLANNER", async () => {
    await expect(getUnstaffedShiftsTodayTomorrow(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getLongOpenTimeEntries rejette un PLANNER", async () => {
    await expect(getLongOpenTimeEntries(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getUnpaidIssuedInvoices rejette un PLANNER", async () => {
    await expect(getUnpaidIssuedInvoices(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getContractsEndingSoon rejette un PLANNER", async () => {
    await expect(getContractsEndingSoon(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
