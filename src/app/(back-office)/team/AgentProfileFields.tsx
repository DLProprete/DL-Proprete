"use client";

import { useState } from "react";
import type { Prisma } from "@prisma/client";
import { formatTime } from "@/lib/dates";

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

type AgentProfileValues = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  weeklyContractHours?: Prisma.Decimal | number | null;
  homeAddress?: string | null;
  homeCity?: string | null;
  homePostalCode?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  hasDrivingLicense?: boolean;
  maxEndTime?: Date | null;
  minStartTime?: Date | null;
  noWorkWeekdays?: number[];
  notes?: string | null;
};

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
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
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
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
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
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
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
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
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
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-zinc-400">Nécessaire pour l&apos;alerte dépassement 35 h.</p>
        </div>
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
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
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
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
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
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="homeLat" className="block text-sm text-zinc-700">
                Latitude (facultatif)
              </label>
              <input
                id="homeLat"
                name="homeLat"
                type="number"
                step="any"
                defaultValue={v.homeLat ?? ""}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="homeLng" className="block text-sm text-zinc-700">
                Longitude (facultatif)
              </label>
              <input
                id="homeLng"
                name="homeLng"
                type="number"
                step="any"
                defaultValue={v.homeLng ?? ""}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
          </div>
          <p className="-mt-3 text-xs text-zinc-400">
            Facultatif — collecté pour de futures suggestions d&apos;affectation par proximité
            du domicile, pas encore exploité.
          </p>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" name="hasDrivingLicense" defaultChecked={v.hasDrivingLicense ?? false} />
            Permis de conduire
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="minStartTime" className="block text-sm text-zinc-700">
                Ne pas travailler avant (facultatif)
              </label>
              <input
                id="minStartTime"
                name="minStartTime"
                type="time"
                defaultValue={v.minStartTime ? formatTime(v.minStartTime) : ""}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="maxEndTime" className="block text-sm text-zinc-700">
                Ne pas travailler après (facultatif)
              </label>
              <input
                id="maxEndTime"
                name="maxEndTime"
                type="time"
                defaultValue={v.maxEndTime ? formatTime(v.maxEndTime) : ""}
                className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
              />
            </div>
          </div>
          <fieldset>
            <legend className="block text-sm text-zinc-700">Jours non travaillés</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <label
                  key={day.value}
                  className="flex cursor-pointer items-center gap-1.5 rounded border border-zinc-300 px-3 py-1.5 text-sm select-none has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white"
                >
                  <input
                    type="checkbox"
                    name="noWorkWeekdays"
                    value={day.value}
                    defaultChecked={v.noWorkWeekdays?.includes(day.value) ?? false}
                    className="sr-only"
                  />
                  {day.label}
                </label>
              ))}
            </div>
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
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-zinc-400">
          Organisation uniquement — jamais de diagnostic ni d&apos;information de santé.
        </p>
      </div>
    </>
  );
}
