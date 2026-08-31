"use client";

import { useState } from "react";
import { declareAbsenceAction } from "../actions";

export function AbsenceForm() {
  const [type, setType] = useState("PAID_LEAVE");
  const isSick = type === "SICK";

  return (
    <form action={declareAbsenceAction} className="space-y-4">
      <div>
        <label htmlFor="type" className="block text-sm text-zinc-700">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        >
          <option value="PAID_LEAVE">Congé payé</option>
          <option value="RTT">RTT</option>
          <option value="SICK">Arrêt maladie</option>
          <option value="OTHER">Autre</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startsOn" className="block text-sm text-zinc-700">
            Début
          </label>
          <input
            id="startsOn"
            name="startsOn"
            type="date"
            required
            className="mt-1 min-h-11 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="endsOn" className="block text-sm text-zinc-700">
            Fin
          </label>
          <input
            id="endsOn"
            name="endsOn"
            type="date"
            required
            className="mt-1 min-h-11 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      </div>
      {isSick && (
        <div>
          <label htmlFor="document" className="block text-sm text-zinc-700">
            Justificatif (PDF ou JPEG, 5 Mo max)
          </label>
          <input
            id="document"
            name="document"
            type="file"
            accept="application/pdf,image/jpeg"
            required={isSick}
            className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
          />
        </div>
      )}
      <div>
        <label htmlFor="comment" className="block text-sm text-zinc-700">
          Commentaire (organisation uniquement — pas de diagnostic)
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={3}
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        className="flex min-h-14 w-full items-center justify-center rounded-xl bg-teal-700 text-base font-semibold text-white hover:bg-teal-800"
      >
        Déclarer
      </button>
    </form>
  );
}
