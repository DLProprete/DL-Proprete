"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";
import { formatDateOnly } from "@/lib/dates";

const DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

type Role = "AGENT" | "PLANNER";
type ContractType = "" | "CDI" | "CDD";

type AgentProfileValues = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  weeklyContractHours?: Prisma.Decimal | number | null;
  paidLeaveBalance?: Prisma.Decimal | number | null;
  homeAddress?: string | null;
  homeCity?: string | null;
  homePostalCode?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  hasDrivingLicense?: boolean;
  experienceLevel?: "JUNIOR" | "CONFIRMED" | "SENIOR" | null;
  contractType?: "CDI" | "CDD" | null;
  contractEndDate?: Date | null;
  scheduleExceptions?: unknown;
  notes?: string | null;
};

type ScheduleException = { weekdays: number[]; notBefore?: string; notAfter?: string };

// Champs de profil partagés entre /team/new et /team/[agentId]. Le bloc
// "terrain" (adresse/GPS/permis/contraintes horaires/jours non travaillés)
// ne concerne qu'un AGENT — masqué pour un PLANNER (rôle bureau), qui n'a
// pas de site à rejoindre. Composant client pour piloter cet affichage
// (roleSelectable=true sur /team/new, select interactif ; false sur
// /team/[agentId], rôle déjà fixé, non modifiable ici — Mo6).
export function AgentProfileFields({
  defaultValues = {},
  roleSelectable = false,
  initialRole = "AGENT",
}: {
  defaultValues?: AgentProfileValues;
  roleSelectable?: boolean;
  initialRole?: Role;
}) {
  const v = defaultValues;
  const [role, setRole] = useState<Role>(initialRole);
  const isFieldAgent = role === "AGENT";
  const [contractType, setContractType] = useState<ContractType>(v.contractType ?? "");
  const [exceptions, setExceptions] = useState<ScheduleException[]>(
    Array.isArray(v.scheduleExceptions) ? (v.scheduleExceptions as ScheduleException[]) : [],
  );

  function addException() {
    setExceptions([...exceptions, { weekdays: [] }]);
  }
  function removeException(index: number) {
    setExceptions(exceptions.filter((_, i) => i !== index));
  }
  function toggleExceptionWeekday(index: number, day: number) {
    setExceptions(
      exceptions.map((exception, i) => {
        if (i !== index) return exception;
        const weekdays = exception.weekdays.includes(day)
          ? exception.weekdays.filter((d) => d !== day)
          : [...exception.weekdays, day];
        return { ...exception, weekdays };
      }),
    );
  }
  function updateExceptionTime(index: number, key: "notBefore" | "notAfter", value: string) {
    setExceptions(
      exceptions.map((exception, i) =>
        i === index ? { ...exception, [key]: value || undefined } : exception,
      ),
    );
  }

  return (
    <>
      {roleSelectable && (
        <div>
          <label htmlFor="role" className="block text-sm text-zinc-700">
            Rôle
          </label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="mt-1 w-full field"
          >
            <option value="AGENT">Agent (terrain)</option>
            <option value="PLANNER">Planificateur (bureau)</option>
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm text-zinc-700">
            Prénom
          </label>
          <input
            id="firstName"
            name="firstName"
            required
            defaultValue={v.firstName ?? ""}
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm text-zinc-700">
            Nom
          </label>
          <input
            id="lastName"
            name="lastName"
            required
            defaultValue={v.lastName ?? ""}
            className="mt-1 w-full field"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm text-zinc-700">
            Téléphone
          </label>
          <input
            id="phone"
            name="phone"
            defaultValue={v.phone ?? ""}
            className="mt-1 w-full field"
          />
        </div>
        <div>
          <label htmlFor="weeklyContractHours" className="block text-sm text-zinc-700">
            Durée hebdomadaire contractuelle (h)
          </label>
          <input
            id="weeklyContractHours"
            name="weeklyContractHours"
            type="number"
            step="0.01"
            min="0"
            defaultValue={v.weeklyContractHours != null ? Number(v.weeklyContractHours) : ""}
            className="mt-1 w-full field"
          />
          <p className="mt-1 text-xs text-zinc-500">Nécessaire pour l&apos;alerte dépassement 35 h.</p>
        </div>
      </div>
      <div>
        <label htmlFor="paidLeaveBalance" className="block text-sm text-zinc-700">
          Solde de congés acquis (jours)
        </label>
        <input
          id="paidLeaveBalance"
          name="paidLeaveBalance"
          type="number"
          step="0.5"
          min="0"
          defaultValue={v.paidLeaveBalance != null ? Number(v.paidLeaveBalance) : ""}
          className="mt-1 w-40 field"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Saisi à la main (ex. depuis le logiciel de paie) — non calculé ici.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="contractType" className="block text-sm text-zinc-700">
            Type de contrat
          </label>
          <select
            id="contractType"
            name="contractType"
            value={contractType}
            onChange={(event) => setContractType(event.target.value as ContractType)}
            className="mt-1 w-full field"
          >
            <option value="">Non renseigné</option>
            <option value="CDI">CDI</option>
            <option value="CDD">CDD</option>
          </select>
        </div>
        {contractType === "CDD" && (
          <div>
            <label htmlFor="contractEndDate" className="block text-sm text-zinc-700">
              Fin de contrat
            </label>
            <input
              id="contractEndDate"
              name="contractEndDate"
              type="date"
              defaultValue={v.contractEndDate ? formatDateOnly(v.contractEndDate) : ""}
              className="mt-1 w-full field"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Passé cette date, l&apos;agent n&apos;est plus proposé pour une vacation.
            </p>
          </div>
        )}
      </div>
      {isFieldAgent && (
        <>
          <div>
            <label htmlFor="homeAddress" className="block text-sm text-zinc-700">
              Adresse du domicile
            </label>
            <input
              id="homeAddress"
              name="homeAddress"
              defaultValue={v.homeAddress ?? ""}
              className="mt-1 w-full field"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="homeCity" className="block text-sm text-zinc-700">
                Ville
              </label>
              <input
                id="homeCity"
                name="homeCity"
                defaultValue={v.homeCity ?? ""}
                className="mt-1 w-full field"
              />
            </div>
            <div>
              <label htmlFor="homePostalCode" className="block text-sm text-zinc-700">
                Code postal
              </label>
              <input
                id="homePostalCode"
                name="homePostalCode"
                defaultValue={v.homePostalCode ?? ""}
                className="mt-1 w-full field"
              />
            </div>
          </div>
          <p className="-mt-1 text-xs text-zinc-500">
            {v.homeLat != null && v.homeLng != null
              ? "Position détectée — utilisée pour proposer l'agent le plus proche en cas de remplacement."
              : "Position non détectée (adresse introuvable ou géocodage non configuré) — l'agent reste proposable, sans tri par proximité."}
          </p>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="hasDrivingLicense" defaultChecked={v.hasDrivingLicense ?? false} />
            Permis de conduire
          </label>
          <div>
            <label htmlFor="experienceLevel" className="block text-sm text-zinc-700">
              Niveau d&apos;expérience
            </label>
            <select
              id="experienceLevel"
              name="experienceLevel"
              defaultValue={v.experienceLevel ?? ""}
              className="mt-1 w-full field"
            >
              <option value="">Non renseigné</option>
              <option value="JUNIOR">Débutant</option>
              <option value="CONFIRMED">Confirmé</option>
              <option value="SENIOR">Expérimenté</option>
            </select>
            <p className="mt-1 text-xs text-zinc-500">
              Aide à composer de bons binômes sur les vacations à plusieurs agents.
            </p>
          </div>
          <fieldset>
            <legend className="block text-sm text-zinc-700">Indisponibilités récurrentes</legend>
            <p className="mt-1 text-xs text-zinc-500">
              Un jour entier (aucune heure) ou une plage horaire, ex. « mercredi, pas après 14h ».
              Autant d&apos;exclusions que nécessaire, chacune sur ses propres jours.
            </p>
            <div className="mt-2 space-y-3">
              {exceptions.map((exception, index) => (
                <div key={index} className="rounded-lg border border-zinc-200 p-3">
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day) => (
                      <label key={day.value} className="chip">
                        <input
                          type="checkbox"
                          checked={exception.weekdays.includes(day.value)}
                          onChange={() => toggleExceptionWeekday(index, day.value)}
                          className="sr-only"
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-600">Pas avant (facultatif)</label>
                      <input
                        type="time"
                        value={exception.notBefore ?? ""}
                        onChange={(event) => updateExceptionTime(index, "notBefore", event.target.value)}
                        className="mt-1 w-full field field-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-600">Pas après (facultatif)</label>
                      <input
                        type="time"
                        value={exception.notAfter ?? ""}
                        onChange={(event) => updateExceptionTime(index, "notAfter", event.target.value)}
                        className="mt-1 w-full field field-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeException(index)}
                    className="mt-2 text-xs text-red-700 underline"
                  >
                    Supprimer cette exclusion
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addException} className="btn btn-secondary btn-sm mt-2">
              Ajouter une exclusion
            </button>
            <input
              type="hidden"
              name="scheduleExceptionsJson"
              value={JSON.stringify(exceptions.filter((exception) => exception.weekdays.length > 0))}
            />
          </fieldset>
        </>
      )}
      <div>
        <label htmlFor="notes" className="block text-sm text-zinc-700">
          Notes (consignes humaines)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={v.notes ?? ""}
          className="mt-1 w-full field"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Organisation uniquement — jamais de diagnostic ni d&apos;information de santé.
        </p>
      </div>
    </>
  );
}
