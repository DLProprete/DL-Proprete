import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange } from "@/lib/dates";
import { recomputeInvoiceTotals } from "./actions";

const MANAGE_ROLES = ["ADMIN"] as const;

export type GenerateInvoicesResult = {
  created: string[];
  updated: string[];
  skipped: Array<{ contractId: string; reason: string }>;
};

// Un contrat déjà facturé (DRAFT ou ISSUED+) pour ce mois n'est jamais
// re-sommé depuis les Shift à l'identique deux fois côté ISSUED : une fois
// émise, la facture est verrouillée (docs/ARCHITECTURE.md), donc aucun
// Shift qu'elle contient ne peut être refacturé. Un brouillon existant est
// recalculé (les Shift du mois ont pu changer depuis sa création).
export async function generateMonthlyInvoices(
  user: SessionUser,
  year: number,
  month: number,
): Promise<GenerateInvoicesResult> {
  requireRole(user, [...MANAGE_ROLES]);
  const { start, end } = monthRange(year, month);

  const contracts = await prisma.contract.findMany({
    where: {
      status: "ACTIVE",
      startsOn: { lt: end },
      endsOn: { gte: start },
    },
  });

  const result: GenerateInvoicesResult = { created: [], updated: [], skipped: [] };

  for (const contract of contracts) {
    let plannedHours: number;
    if (contract.billingBasis === "FLAT_INDICATIVE_HOURS") {
      if (!contract.indicativeMonthlyHours) {
        result.skipped.push({
          contractId: contract.id,
          reason: "Forfait mensuel sans indicativeMonthlyHours renseigné",
        });
        continue;
      }
      plannedHours = Number(contract.indicativeMonthlyHours);
    } else {
      const shifts = await prisma.shift.findMany({
        where: {
          contractId: contract.id,
          date: { gte: start, lt: end },
          status: { not: "CANCELLED" },
        },
        select: { startAt: true, endAt: true },
      });
      const totalMinutes = shifts.reduce(
        (sum, shift) => sum + (shift.endAt.getTime() - shift.startAt.getTime()) / 60_000,
        0,
      );
      plannedHours = totalMinutes / 60;
    }

    const existing = await prisma.invoice.findFirst({
      where: {
        contractId: contract.id,
        periodYear: year,
        periodMonth: month,
        status: { not: "CANCELLED" },
      },
      include: { lines: true },
    });

    const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
      start,
    );
    const label = `Prestations régie — ${monthLabel}`;

    if (existing) {
      if (existing.status !== "DRAFT") {
        result.skipped.push({
          contractId: contract.id,
          reason: `Déjà facturé pour cette période (${existing.number ?? existing.status})`,
        });
        continue;
      }
      const plannedLine = existing.lines.find((line) => line.source === "PLANNED_HOURS");
      if (plannedLine) {
        await prisma.invoiceLine.update({
          where: { id: plannedLine.id },
          data: { label, quantity: plannedHours, unitPriceHT: contract.hourlyRateHT, hours: plannedHours },
        });
      } else {
        await prisma.invoiceLine.create({
          data: {
            invoiceId: existing.id,
            label,
            quantity: plannedHours,
            unitPriceHT: contract.hourlyRateHT,
            vatRate: contract.vatRate,
            source: "PLANNED_HOURS",
            hours: plannedHours,
          },
        });
      }
      await recomputeInvoiceTotals(existing.id);
      result.updated.push(existing.id);
      continue;
    }

    const invoice = await prisma.invoice.create({
      data: {
        clientId: contract.clientId,
        contractId: contract.id,
        periodYear: year,
        periodMonth: month,
        status: "DRAFT",
        lines: {
          create: {
            label,
            quantity: plannedHours,
            unitPriceHT: contract.hourlyRateHT,
            vatRate: contract.vatRate,
            source: "PLANNED_HOURS",
            hours: plannedHours,
          },
        },
      },
    });
    await recomputeInvoiceTotals(invoice.id);
    result.created.push(invoice.id);
  }

  return result;
}
