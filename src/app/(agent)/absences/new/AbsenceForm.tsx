"use client";

import { useState } from "react";
import { PendingButton } from "@/app/(back-office)/mail/PendingButton";
import { compressImage, tooLargeMessage } from "@/lib/compress-image";
import { declareAbsenceAction } from "../actions";

export function AbsenceForm() {
  const [type, setType] = useState("PAID_LEAVE");
  const [error, setError] = useState<string | null>(null);
  const isSick = type === "SICK";

  async function submit(formData: FormData) {
    setError(null);
    const file = formData.get("document");
    if (file instanceof File && file.size > 0) {
      const prepared = await compressImage(file, "document");
      const tooLarge = tooLargeMessage(prepared);
      if (tooLarge) {
        setError(tooLarge);
        return;
      }
      formData.set("document", prepared);
    }
    await declareAbsenceAction(formData);
  }

  return (
    <form action={submit} className="space-y-4">
      <div>
        <label htmlFor="type" className="block text-sm text-zinc-700">
          Type
        </label>
        <select
          id="type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="mt-1 w-full field"
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
            className="mt-1 min-h-11 w-full field"
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
            className="mt-1 min-h-11 w-full field"
          />
        </div>
      </div>
      {isSick && (
        <div>
          <label htmlFor="document" className="block text-sm text-zinc-700">
            Justificatif (PDF ou photo, 4 Mo max)
          </label>
          <input
            id="document"
            name="document"
            type="file"
            accept="application/pdf,image/*"
            required={isSick}
            className="mt-1 w-full field"
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
          className="mt-1 w-full field"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <PendingButton className="btn btn-primary btn-field" pendingLabel="Envoi…">
        Déclarer
      </PendingButton>
    </form>
  );
}
