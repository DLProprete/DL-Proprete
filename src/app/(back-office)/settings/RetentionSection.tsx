import { RETENTION_RULES, EXPIRED_ACCESS_GRACE_DAYS, RETENTION_MAX_MONTHS, type RetentionKey } from "@/server/retention/rules";
import { getRetentionMonths, lastPurge, previewPurge, type PurgeCounts } from "@/server/retention/purge";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

// Ce qui partira au prochain passage, par règle.
const PENDING: Record<RetentionKey, (counts: PurgeCounts) => number> = {
  absenceDocuments: (c) => c.absenceDocuments,
  absences: (c) => c.absences,
  timeTracking: (c) => c.timeEntries + c.assignments,
  siteLogPhotos: (c) => c.siteLogPhotos,
  siteLogs: (c) => c.siteLogs + c.checkIns,
  prospects: (c) => c.prospects,
  activityLogs: (c) => c.activityLogs,
  errorLogs: (c) => c.errorLogs,
};

export async function RetentionSection({
  saveAction,
  runAction,
  saved,
  error,
  purged,
}: {
  saveAction: (formData: FormData) => Promise<void>;
  runAction: () => Promise<void>;
  saved: boolean;
  error?: string;
  purged: boolean;
}) {
  const [months, pending, last] = await Promise.all([getRetentionMonths(), previewPurge(), lastPurge()]);

  return (
    <section id="conservation" className="space-y-3 pt-4">
      <h2 className="text-xl font-semibold">Durées de conservation</h2>
      <p className="text-sm text-zinc-600">
        Chaque nuit, l&apos;outil supprime les données personnelles arrivées au terme de leur durée de conservation
        (RGPD). Les factures, clients, sites, contrats, archives numérisées et comptes ne sont jamais purgés
        automatiquement.
      </p>
      {saved && <p className="alert alert-info">Durées enregistrées.</p>}
      {purged && <p className="alert alert-info">Purge effectuée.</p>}
      {error && <p className="alert alert-danger">{error}</p>}

      <form action={saveAction} className="card space-y-4">
        {RETENTION_RULES.map((rule) => (
          <div key={rule.key}>
            <label htmlFor={`retention-${rule.key}`} className="block text-sm font-medium text-zinc-800">
              {rule.label}
            </label>
            <div className="mt-1 flex items-center gap-2 text-sm text-zinc-700">
              <input
                id={`retention-${rule.key}`}
                name={rule.key}
                type="number"
                step="1"
                min={rule.minMonths}
                max={RETENTION_MAX_MONTHS}
                required
                defaultValue={months[rule.key]}
                className="field w-24"
              />
              <span>mois {rule.from}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {rule.detail}
              {rule.minMonths > 0 && ` Minimum : ${rule.minMonths} mois.`} Par défaut : {rule.defaultMonths} mois.
              {" "}
              <span className={PENDING[rule.key](pending) > 0 ? "font-medium text-amber-700" : ""}>
                Prochain passage : {PENDING[rule.key](pending)} élément(s).
              </span>
            </p>
          </div>
        ))}
        <p className="text-xs text-zinc-500">
          Sessions et liens d&apos;accès expirés depuis plus de {EXPIRED_ACCESS_GRACE_DAYS} jours : supprimés
          automatiquement (prochain passage : {pending.expiredAccess}).
        </p>
        <p className="text-xs text-zinc-500">
          Après un raccourcissement, vérifiez le « prochain passage » de chaque règle : la purge de la nuit est
          définitive.
        </p>
        <button type="submit" className="btn btn-primary">
          Enregistrer les durées
        </button>
      </form>

      <div className="card flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-zinc-700">
          {last
            ? `Dernier passage le ${dateTimeFormatter.format(last.createdAt)} — ${last.summary.replace(/^Purge de conservation : /, "")}.`
            : "Aucun passage pour l'instant."}
        </p>
        <form action={runAction}>
          <button type="submit" className="btn btn-secondary btn-sm">
            Lancer la purge maintenant
          </button>
        </form>
      </div>
    </section>
  );
}
