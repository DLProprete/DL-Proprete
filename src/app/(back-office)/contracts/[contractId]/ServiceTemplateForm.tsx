"use client";

import { useState } from "react";
import { createServiceTemplateAction } from "../actions";

const DAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

function timeToMinutes(hhmm: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

export function ServiceTemplateForm({ contractId }: { contractId: string }) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("");
  const [durationEditedByUser, setDurationEditedByUser] = useState(false);

  function recomputeDuration(nextStart: string, nextEnd: string) {
    if (durationEditedByUser) return;
    const startMin = timeToMinutes(nextStart);
    const endMin = timeToMinutes(nextEnd);
    if (startMin !== null && endMin !== null && endMin > startMin) {
      setDuration(String(endMin - startMin));
    }
  }

  return (
    <form action={createServiceTemplateAction} className="mt-2 space-y-4">
      <input type="hidden" name="contractId" value={contractId} />
      <div>
        <label htmlFor="name" className="block text-sm text-zinc-700">
          Nom
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="Entretien quotidien bureaux"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </div>
      <fieldset>
        <legend className="block text-sm text-zinc-700">Jours</legend>
        <div className="mt-1 flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <label
              key={day.value}
              className="flex cursor-pointer items-center gap-1.5 rounded border border-zinc-300 px-3 py-1.5 text-sm select-none has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-900 has-[:checked]:text-white"
            >
              <input type="checkbox" name="daysOfWeek" value={day.value} className="sr-only" />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startTime" className="block text-sm text-zinc-700">
            Début de la fenêtre d&apos;accès
          </label>
          <input
            id="startTime"
            name="startTime"
            type="time"
            required
            value={startTime}
            onChange={(event) => {
              setStartTime(event.target.value);
              recomputeDuration(event.target.value, endTime);
            }}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm text-zinc-700">
            Fin de la fenêtre d&apos;accès
          </label>
          <input
            id="endTime"
            name="endTime"
            type="time"
            required
            value={endTime}
            onChange={(event) => {
              setEndTime(event.target.value);
              recomputeDuration(startTime, event.target.value);
            }}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>
      {startTime && endTime && timeToMinutes(endTime) !== null && timeToMinutes(startTime) !== null && (
        <>
          {timeToMinutes(endTime)! <= timeToMinutes(startTime)! && (
            <p className="text-sm text-red-600">
              L&apos;heure de fin doit être postérieure à l&apos;heure de début.
            </p>
          )}
        </>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="durationMinutes" className="block text-sm text-zinc-700">
            Durée facturée (min)
          </label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            required
            value={duration}
            onChange={(event) => {
              setDuration(event.target.value);
              setDurationEditedByUser(event.target.value !== "");
            }}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
          <p className="mt-1 text-xs text-zinc-500">
            C&apos;est cette durée qui part en facture, multipliée par le nombre
            d&apos;agents requis. Préremplie sur la fenêtre d&apos;accès ; à réduire si la
            prestation vendue est plus courte que l&apos;amplitude de passage.
          </p>
        </div>
        <div>
          <label htmlFor="requiredAgents" className="block text-sm text-zinc-700">
            Agents requis
          </label>
          <input
            id="requiredAgents"
            name="requiredAgents"
            type="number"
            min={1}
            defaultValue={1}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>
      <div>
        <label htmlFor="instructions" className="block text-sm text-zinc-700">
          Consignes
        </label>
        <textarea
          id="instructions"
          name="instructions"
          rows={3}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
      >
        Ajouter la vacation
      </button>
    </form>
  );
}
