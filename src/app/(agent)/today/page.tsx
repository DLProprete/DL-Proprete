import Link from "next/link";
import { requireSession } from "@/server/auth/session";
import { listTodayShiftsForAgent, getAgentGreetingName } from "@/server/time/queries";
import { shiftState, scheduleWarning } from "@/server/time/agent-schedule";
import { formatTimeInParis } from "@/lib/dates";
import { LiveTimer } from "@/components/live-timer";
import { ClockButton } from "@/components/clock-button";
import { createSiteLogAction } from "../actions";

const START_BUTTON_CLASS = "btn btn-primary btn-field";
const END_BUTTON_CLASS = "btn btn-stop btn-field";

function ShortAddress({ address, city }: { address: string; city: string }) {
  const query = encodeURIComponent(`${address}, ${city}`);
  return (
    <a href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noreferrer" className="block text-sm text-brand-700 underline">
      {address}, {city}
    </a>
  );
}

function Consignes({
  instructions, accessNotes, alarmCode, keyNotes, protocolNotes, contactName, contactPhone,
}: {
  instructions?: string | null;
  accessNotes?: string | null;
  alarmCode?: string | null;
  keyNotes?: string | null;
  protocolNotes?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}) {
  if (!instructions && !accessNotes && !alarmCode && !keyNotes && !protocolNotes && !contactPhone) return null;
  return (
    <div className="mt-4 space-y-1 border-t border-zinc-100 pt-4 text-sm text-zinc-700">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Consignes</p>
      {instructions && <p>{instructions}</p>}
      {accessNotes && <p>{accessNotes}</p>}
      {alarmCode && <p>Alarme : {alarmCode}</p>}
      {keyNotes && <p>Clés : {keyNotes}</p>}
      {protocolNotes && <p>{protocolNotes}</p>}
      {contactPhone && (
        <p>
          Contact sur site{contactName ? ` (${contactName})` : ""} :{" "}
          <a href={`tel:${contactPhone}`} className="text-brand-700 underline">{contactPhone}</a>
        </p>
      )}
    </div>
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; justEnded?: string; logged?: string }>;
}) {
  const { error, justEnded, logged } = await searchParams;
  const user = await requireSession();
  const [shifts, greetingName] = await Promise.all([
    listTodayShiftsForAgent(user),
    getAgentGreetingName(user),
  ]);

  const now = new Date();
  const openShift = shifts.find((s) => shiftState(s) === "open") ?? null;
  const activeShift = openShift ?? shifts.find((s) => shiftState(s) === "upcoming") ?? null;
  const activeIndex = activeShift ? shifts.indexOf(activeShift) : -1;
  const upcomingAfterActive =
    activeIndex >= 0 ? shifts.slice(activeIndex + 1).filter((s) => shiftState(s) === "upcoming") : [];
  const openEntry = openShift?.timeEntries.find((entry) => entry.status === "OPEN") ?? null;
  const justEndedShift = justEnded
    ? (shifts.find((s) => s.id === justEnded && shiftState(s) === "done") ?? null)
    : null;
  const warning = activeShift
    ? scheduleWarning(openEntry ? openEntry.clockInAt : now, activeShift.startAt, activeShift)
    : null;

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Bonjour, {greetingName}</h1>
          <p className="text-sm text-zinc-600">
            {shifts.length} vacation{shifts.length > 1 ? "s" : ""} aujourd'hui
          </p>
        </div>
        <Link href="/today/week" className="pt-1 text-sm text-brand-700 underline">Voir la semaine →</Link>
      </div>

      {error === "already-open" && <p className="alert alert-danger">Un pointage est déjà en cours.</p>}
      {error === "too-short" && <p className="alert alert-danger">Pointage trop court (moins de 5 min).</p>}
      {error === "log" && <p className="alert alert-danger">Indiquez un commentaire pour la main courante.</p>}
      {logged && <p className="alert alert-info">Main courante enregistrée.</p>}
      {warning && <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{warning}</p>}

      {justEndedShift && (
        <div className="card text-sm">
          <p className="font-medium text-zinc-900">Terminé — en attente de validation</p>
          <p className="text-zinc-600">
            {justEndedShift.site.name} · {formatTimeInParis(justEndedShift.startAt)}-{formatTimeInParis(justEndedShift.endAt)}
          </p>
        </div>
      )}

      {activeShift ? (
        <>
          <div className="card">
            {openEntry ? (
              <>
                <p className="text-sm font-medium text-zinc-600">Pointage en cours</p>
                <p className="mt-1 text-xl font-semibold text-zinc-900">{activeShift.site.name}</p>
                <ShortAddress address={activeShift.site.address} city={activeShift.site.city} />
                <p className="mt-2 text-sm text-zinc-600">Débuté à {formatTimeInParis(openEntry.clockInAt)}</p>
                <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight text-zinc-900">
                  <LiveTimer since={openEntry.clockInAt.toISOString()} />
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-zinc-900">{activeShift.site.name}</p>
                <ShortAddress address={activeShift.site.address} city={activeShift.site.city} />
                <p className="mt-3 text-4xl font-bold tracking-tight text-zinc-900">
                  {formatTimeInParis(activeShift.startAt)}-{formatTimeInParis(activeShift.endAt)}
                </p>
              </>
            )}
            <Consignes
              instructions={activeShift.serviceTemplate?.instructions}
              accessNotes={activeShift.site.accessNotes}
              alarmCode={activeShift.site.alarmCode}
              keyNotes={activeShift.site.keyNotes}
              protocolNotes={activeShift.site.protocolNotes}
              contactName={activeShift.site.onSiteContactName}
              contactPhone={activeShift.site.onSiteContactPhone}
            />
          </div>

          {openEntry ? (
            <ClockButton mode="end" targetId={openEntry.id} label="Terminer" className={END_BUTTON_CLASS} />
          ) : (
            <ClockButton mode="start" targetId={activeShift.id} label="Démarrer" className={START_BUTTON_CLASS} />
          )}

          <form action={createSiteLogAction} className="card space-y-2">
            <input type="hidden" name="siteId" value={activeShift.site.id} />
            <p className="text-sm font-medium text-zinc-800">Main courante</p>
            <select name="type" className="field field-sm w-full">
              <option value="ANOMALY">Anomalie</option>
              <option value="EQUIPMENT">Matériel manquant</option>
              <option value="OTHER">Autre</option>
            </select>
            <textarea name="comment" required rows={3} placeholder="Commentaire" className="field w-full" />
            <input type="file" name="photo" accept="image/*" capture="environment" className="text-sm" />
            <button type="submit" className="btn btn-secondary w-full">Envoyer</button>
          </form>

          {upcomingAfterActive.length > 0 && (
            <div className="space-y-2">
              {upcomingAfterActive.map((shift) => (
                <div key={shift.id} className="rounded-lg border border-zinc-200 bg-zinc-100 p-3 text-sm text-zinc-600">
                  {formatTimeInParis(shift.startAt)}-{formatTimeInParis(shift.endAt)} · {shift.site.name}
                </div>
              ))}
            </div>
          )}
        </>
      ) : shifts.length > 0 ? (
        <div className="card text-center text-sm text-zinc-600">Journée terminée.</div>
      ) : (
        <div className="card text-center text-sm text-zinc-600">Aucune vacation prévue aujourd'hui.</div>
      )}
    </div>
  );
}
