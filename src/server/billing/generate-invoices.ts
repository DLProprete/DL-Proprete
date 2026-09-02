import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange } from "@/lib/dates";
import { recomputeInvoiceTotals } from "./actions";
import { logAudit } from "@/server/audit/log";
import {
  coverageWarnings,
  plannedHoursFromShifts,
  type CoverageWarning,
} from "./planned-hours";

const MANAGE_ROLES = ["ADMIN"] as const;

export type GenerateInvoicesResult = {
  created: string[];
  updated: string[];
  skipped: Array<{ contractSiteId: string; reason: string }>;
  /**
   * Factures generees mais suspectes (planning incomplet, ecart important au
   * volume contractuel). Elles restent en brouillon : c'est a l'ADMIN de
   * regarder avant d'emettre, pas au generateur de decider a sa place.
   */
  warnings: Array<{
    contractSiteId: string;
    contractReference: string;
    siteName: string;
    invoiceId: string;
    warnings: CoverageWarning[];
  }>;
};

// Alertes de couverture pour un site facture au calendrier (CALENDAR_SHIFTS)
// sur un mois donne. Extrait de la boucle de generation pour etre reutilise a
// l'affichage de la fiche facture (le brouillon peut etre emis longtemps
// apres sa generation, l'alerte doit rester visible a ce moment-la aussi).
export async function coverageWarningsForContractSite(
  contractSite: { id: string; indicativeMonthlyHours: Prisma.Decimal | number | null },
  year: number,
  month: number,
): Promise<CoverageWarning[]> {
  const { start, end } = monthRange(year, month);
  const daysInMonth = Math.round((end.getTime() - start.getTime()) / 86_400_000);

  const shifts = await prisma.shift.findMany({
    where: {
      contractSiteId: contractSite.id,
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
      indicativeMonthlyHours: contractSite.indicativeMonthlyHours
        ? Number(contractSite.indicativeMonthlyHours)
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

  const contractSites = await prisma.contractSite.findMany({
    where: {
      contract: {
        status: "ACTIVE",
        startsOn: { lt: end },
        endsOn: { gte: start },
      },
    },
    include: { contract: true, site: { select: { name: true } } },
  });

  const result: GenerateInvoicesResult = { created: [], updated: [], skipped: [], warnings: [] };

  for (const contractSite of contractSites) {
    const { contract } = contractSite;
    let plannedHours: number;
    let siteWarnings: CoverageWarning[] = [];

    if (contractSite.billingBasis === "FLAT_INDICATIVE_HOURS") {
      if (!contractSite.indicativeMonthlyHours) {
        result.skipped.push({
          contractSiteId: contractSite.id,
          reason: "Forfait mensuel sans indicativeMonthlyHours renseigné",
        });
        continue;
      }
      plannedHours = Number(contractSite.indicativeMonthlyHours);
    } else {
      const shifts = await prisma.shift.findMany({
        where: {
          contractSiteId: contractSite.id,
          date: { gte: start, lt: end },
          status: { not: "CANCELLED" },
        },
        select: { date: true, billableMinutes: true, requiredAgents: true },
      });

      // Heures d'agent vendues : duree de la vacation x agents requis. Sommer
      // les seules durees revenait a facturer une vacation a deux agents comme
      // si un seul s'y rendait.
      plannedHours = plannedHoursFromShifts(shifts);

      siteWarnings = await coverageWarningsForContractSite(contractSite, year, month);
    }

    const existing = await prisma.invoice.findFirst({
      where: {
        contractSiteId: contractSite.id,
        periodYear: year,
        periodMonth: month,
        status: { not: "CANCELLED" },
      },
      include: { lines: true },
    });

    const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(
      start,
    );
    const label = `Prestations régie — ${contractSite.site.name} — ${monthLabel}`;

    if (existing) {
      if (existing.status !== "DRAFT") {
        result.skipped.push({
          contractSiteId: contractSite.id,
          reason: `Déjà facturé pour cette période (${existing.number ?? existing.status})`,
        });
        continue;
      }
      const plannedLine = existing.lines.find((line) => line.source === "PLANNED_HOURS");
      if (plannedLine) {
        await prisma.invoiceLine.update({
          where: { id: plannedLine.id },
          data: {
            label,
            quantity: plannedHours,
            unitPriceHT: contractSite.hourlyRateHT,
            hours: plannedHours,
          },
        });
      } else {
        await prisma.invoiceLine.create({
          data: {
            invoiceId: existing.id,
            label,
            quantity: plannedHours,
            unitPriceHT: contractSite.hourlyRateHT,
            vatRate: contractSite.vatRate,
            source: "PLANNED_HOURS",
            hours: plannedHours,
          },
        });
      }
      await recomputeInvoiceTotals(existing.id);
      result.updated.push(existing.id);
      if (siteWarnings.length > 0) {
        result.warnings.push({
          contractSiteId: contractSite.id,
          contractReference: contract.reference,
          siteName: contractSite.site.name,
          invoiceId: existing.id,
          warnings: siteWarnings,
        });
      }
      continue;
    }

    const invoice = await prisma.invoice.create({
      data: {
        clientId: contract.clientId,
        contractSiteId: contractSite.id,
        periodYear: year,
        periodMonth: month,
        status: "DRAFT",
        lines: {
          create: {
            label,
            quantity: plannedHours,
            unitPriceHT: contractSite.hourlyRateHT,
            vatRate: contractSite.vatRate,
            source: "PLANNED_HOURS",
            hours: plannedHours,
          },
        },
      },
    });
    await recomputeInvoiceTotals(invoice.id);
    result.created.push(invoice.id);
    await logAudit(prisma, {
      actorUserId: user.id,
      action: "INVOICE_CREATED",
      entityType: "Invoice",
      entityId: invoice.id,
      summary: `Brouillon créé : ${label} — ${contract.reference}`,
    });
    if (siteWarnings.length > 0) {
      result.warnings.push({
        contractSiteId: contractSite.id,
        contractReference: contract.reference,
        siteName: contractSite.site.name,
        invoiceId: invoice.id,
        warnings: siteWarnings,
      });
    }
  }

  return result;
}
