import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { getSiteMarginsForMonth } from "@/server/reports/margins";
import { getMonthlyTrends } from "@/server/reports/trends";
import { getSiteLogSummary } from "@/server/reports/site-logs";
import { parisToday } from "@/lib/dates";
import { BarChart } from "@/components/bar-chart";

const currencyFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; months?: string }>;
}) {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    redirect("/");
  }

  const today = parisToday();
  const { year: yearParam, month: monthParam, months: monthsParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : today.year;
  const month = monthParam ? Number(monthParam) : today.month;
  const monthsBack = monthsParam === "12" ? 12 : 6;

  const [margins, trends, siteLogs] = await Promise.all([
    getSiteMarginsForMonth(user, year, month),
    getMonthlyTrends(user, monthsBack),
    getSiteLogSummary(user, year, month),
  ]);

  function periodHref(targetMonths?: number) {
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("month", String(month));
    params.set("months", String(targetMonths ?? monthsBack));
    return `/reports?${params.toString()}`;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Rapports</h1>

      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="months" value={monthsBack} />
        <div>
          <label htmlFor="year" className="block text-xs text-zinc-600">
            Année
          </label>
          <input
            id="year"
            name="year"
            type="number"
            defaultValue={year}
            className="mt-1 w-24 field field-sm"
          />
        </div>
        <div>
          <label htmlFor="month" className="block text-xs text-zinc-600">
            Mois
          </label>
          <input
            id="month"
            name="month"
            type="number"
            min="1"
            max="12"
            defaultValue={month}
            className="mt-1 w-20 field field-sm"
          />
        </div>
        <button type="submit" className="btn btn-secondary">
          Afficher
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Marge par site</h2>
        <div className="card-table">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Revenu HT</th>
                <th>Coût HT</th>
                <th>Marge HT</th>
              </tr>
            </thead>
            <tbody>
              {margins.map((m) => (
                <tr key={m.siteId}>
                  <td>{m.siteName}</td>
                  <td className="whitespace-nowrap text-zinc-600">{currencyFormatter.format(m.revenueHT)}</td>
                  <td className="whitespace-nowrap text-zinc-600">
                    {currencyFormatter.format(m.costHT)}
                    {m.hasUnknownCost && (
                      <span className="ml-1 text-xs text-amber-600">(coût partiel — taux manquant)</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap font-medium">{currencyFormatter.format(m.marginHT)}</td>
                </tr>
              ))}
              {margins.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-zinc-500">
                    Aucun site actif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Tendances</h2>
          <div className="flex gap-3 text-sm">
            <Link href={periodHref(6)} className={monthsBack === 6 ? "font-medium underline" : "underline text-zinc-500"}>
              6 mois
            </Link>
            <Link href={periodHref(12)} className={monthsBack === 12 ? "font-medium underline" : "underline text-zinc-500"}>
              12 mois
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="mb-1 text-sm text-zinc-600">CA facturé HT</p>
            <BarChart
              data={trends.map((t) => ({ label: t.label, value: t.revenueHT }))}
              formatValue={(v) => `${Math.round(v / 100) / 10}k€`}
            />
          </div>
          <div>
            <p className="mb-1 text-sm text-zinc-600">Heures validées</p>
            <BarChart data={trends.map((t) => ({ label: t.label, value: t.hours }))} formatValue={(v) => `${Math.round(v)}h`} />
          </div>
          <div>
            <p className="mb-1 text-sm text-zinc-600">Absences (validées)</p>
            <BarChart data={trends.map((t) => ({ label: t.label, value: t.absences }))} />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">Main courante — synthèse</h2>
        <div className="card-table">
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Anomalies</th>
                <th>Matériel</th>
                <th>Autre</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {siteLogs.map((s) => (
                <tr key={s.siteId}>
                  <td>{s.siteName}</td>
                  <td className="text-zinc-600">{s.anomaly}</td>
                  <td className="text-zinc-600">{s.equipment}</td>
                  <td className="text-zinc-600">{s.other}</td>
                  <td className="font-medium">{s.total}</td>
                </tr>
              ))}
              {siteLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-zinc-500">
                    Aucune entrée de main courante pour ce mois.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
