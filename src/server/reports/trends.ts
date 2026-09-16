import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { monthRange, parisToday } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

const MONTH_LABELS = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc",
];

export type MonthlyTrend = {
  year: number;
  month: number;
  label: string;
  revenueHT: number;
  hours: number;
  absences: number;
};

// Tendances sur les N derniers mois (mois en cours inclus). Absences
// comptées sur leur mois de début uniquement — pas de prorata jour par
// jour pour une absence à cheval sur deux mois (simplification assumée).
export async function getMonthlyTrends(user: SessionUser, monthsBack = 6): Promise<MonthlyTrend[]> {
  requireRole(user, [...MANAGE_ROLES]);
  const today = parisToday();

  const months: { year: number; month: number }[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const totalMonths = today.year * 12 + (today.month - 1) - i;
    months.push({ year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1 });
  }

  return Promise.all(
    months.map(async ({ year, month }) => {
      const { start, end } = monthRange(year, month);

      const [revenue, entries, absences] = await Promise.all([
        prisma.invoice.aggregate({
          _sum: { amountHT: true },
          where: { issuedOn: { gte: start, lt: end }, status: { notIn: ["DRAFT", "CANCELLED"] } },
        }),
        prisma.timeEntry.findMany({
          where: { status: "VALIDATED", clockInAt: { gte: start, lt: end } },
          select: { clockInAt: true, clockOutAt: true, shift: { select: { startAt: true, endAt: true } } },
        }),
        prisma.absence.count({
          where: { status: "APPROVED", startsOn: { gte: start, lt: end } },
        }),
      ]);

      const totalMinutes = entries.reduce((sum, entry) => {
        if (entry.shift) return sum + (entry.shift.endAt.getTime() - entry.shift.startAt.getTime()) / 60_000;
        return sum + (entry.clockOutAt ? (entry.clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000 : 0);
      }, 0);

      return {
        year,
        month,
        label: `${MONTH_LABELS[month - 1]} ${String(year).slice(2)}`,
        revenueHT: Number(revenue._sum.amountHT ?? 0),
        hours: totalMinutes / 60,
        absences,
      };
    }),
  );
}
