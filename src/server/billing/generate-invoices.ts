import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange } from "@/lib/dates";
import { recomputeInvoiceTotals } from "./actions";
import {
  coverageWarnings,
  plannedHoursFromShifts,
  type CoverageWarning,
} from "./planned-hours";

const MANAGE_ROLES = ["ADMIN"] as const;

export type GenerateInvoicesResult = {
  created: string[];
  updated: string[];
  skipped: Array<{ contractId: string; reason: string }>;
  /**
   * Factures generees mais suspectes (planning incomplet, ecart important au
   * volume contractuel). Elles restent en brouillon : c'est a l'ADMIN de
   * regarder avant d'emettre, pas au generateur de decider a sa place.
   */
  warnings: Array<{
    contractId: string;
    contractReference: string;
    invoiceId: string;
    warnings: CoverageWarning[];
  }>;
};

// Alertes de couverture pour un contrat facture au calendrier (CALENDAR_SHIFTS)
// sur un mois donne. Extrait de la boucle de generation pour etre reutilise a
// l'affichage de la fiche facture (le brouillon peut etre emis longtemps
// apres sa generation, l'alerte doit rester visible a ce moment-la aussi).
export async function coverageWarningsForContract(
  contract: { id: string; indicativeMonthlyHours: Prisma.Decimal | number | null },
  year: number,
  month: number,
): Promise<CoverageWarning[]> {
  const { start, end } = monthRange(year, month);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  const shifts = await prisma.shift.findMany({
    where: {
      contractId: contract.id,
      date: { gte: start, lt: end },
      status: { not: "CANCELLED" },
    },
    select: { date: true, billableMinutes: true, requiredAgents: true },
  });

  const plannedHours = plannedHoursFromShifts(shifts);
  const coveredDayNumbers = new Set(shifts.map((shift) => shift.date.getUTCDate()));
  const lastCoveredDay = coveredDayNumbers.size === 0 ? 0 : Math.max(...coveredDayNumbers);

  return coverageWarnings(
    {
      coveredDays: coveredDayNumbers.size,
      daysInMonth,
      computedHours: plannedHours,
      indicativeMonthlyHours: contract.indicativeMonthlyHours
        ? Number(contract.indicativeMonthlyHours)
        : null,
    },
    lastCoveredDay,
  );
}

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

  const result: GenerateInvoicesResult = { created: [], updated: [], skipped: [], warnings: [] };

  for (const contract of contracts) {
    let plannedHours: number;
    let contractWarnings: CoverageWarning[] = [];

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
        select: { date: true, billableMinutes: true, requiredAgents: true },
      });

      // Heures d'agent vendues : duree de la vacation x agents requis. Sommer
      // les seules durees revenait a facturer une vacation a deux agents comme
      // si un seul s'y rendait.
      plannedHours = plannedHoursFromShifts(shifts);

      contractWarnings = await coverageWarningsForContract(contract, year, month);
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
      if (contractWarnings.length > 0) {
        result.warnings.push({
          contractId: contract.id,
          contractReference: contract.reference,
          invoiceId: existing.id,
          warnings: contractWarnings,
        });
      }
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
    if (contractWarnings.length > 0) {
      result.warnings.push({
        contractId: contract.id,
        contractReference: contract.reference,
        invoiceId: invoice.id,
        warnings: contractWarnings,
      });
    }
  }

  return result;
}
