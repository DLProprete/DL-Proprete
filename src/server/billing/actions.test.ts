import { describe, expect, it } from "vitest";
import { ForbiddenError, type SessionUser } from "@/server/auth/session";
import { generateMonthlyInvoices } from "./generate-invoices";
import { addAdhocLine, issueInvoice, markInvoiceReminded, recordPayment } from "./actions";
import { listInvoices, getInvoice, getValidatedHoursForContractMonth } from "./queries";

const agent: SessionUser = { id: "u-agent", email: "agent@dlproprete.fr", role: "AGENT", isActive: true };
const planner: SessionUser = {
  id: "u-planner",
  email: "planner@dlproprete.fr",
  role: "PLANNER",
  isActive: true,
};

describe("droits Facturation — ADMIN seulement", () => {
  it("generateMonthlyInvoices rejette un PLANNER", async () => {
    await expect(generateMonthlyInvoices(planner, 2026, 9)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("generateMonthlyInvoices rejette un AGENT", async () => {
    await expect(generateMonthlyInvoices(agent, 2026, 9)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("issueInvoice rejette un PLANNER", async () => {
    await expect(issueInvoice(planner, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("addAdhocLine rejette un PLANNER", async () => {
    await expect(
      addAdhocLine(planner, "any-id", { label: "x", quantity: 1, unitPriceHT: 10 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("recordPayment rejette un PLANNER", async () => {
    await expect(
      recordPayment(planner, "any-id", {
        paidOn: "2026-09-01",
        amount: 100,
        method: "TRANSFER",
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("markInvoiceReminded rejette un PLANNER", async () => {
    await expect(
      markInvoiceReminded(planner, "any-id", { remindedOn: "2026-09-01" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("markInvoiceReminded rejette un AGENT", async () => {
    await expect(
      markInvoiceReminded(agent, "any-id", { remindedOn: "2026-09-01" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("listInvoices rejette un PLANNER", async () => {
    await expect(listInvoices(planner)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getInvoice rejette un PLANNER", async () => {
    await expect(getInvoice(planner, "any-id")).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("getValidatedHoursForContractMonth rejette un PLANNER", async () => {
    await expect(
      getValidatedHoursForContractMonth(planner, "any-site", 2026, 9),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});
