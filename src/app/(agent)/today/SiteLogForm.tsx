"use client";

import { useState } from "react";
import { PendingButton } from "@/app/(back-office)/mail/PendingButton";
import { compressImage, tooLargeMessage } from "@/lib/compress-image";
import { createSiteLogAction } from "../actions";

export function SiteLogForm({ siteId }: { siteId: string }) {
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setError(null);
    const photo = formData.get("photo");
    if (photo instanceof File && photo.size > 0) {
      const compressed = await compressImage(photo, "photo");
      const tooLarge = tooLargeMessage(compressed);
      if (tooLarge) {
        setError(tooLarge);
        return;
      }
      formData.set("photo", compressed);
    }
    await createSiteLogAction(formData);
  }

  return (
    <form action={submit} className="card space-y-2">
      <input type="hidden" name="siteId" value={siteId} />
      <p className="text-sm font-medium text-zinc-800">Main courante</p>
      <p className="text-xs text-zinc-600">
        Relu par DL Propreté avant d&apos;être transmis au client. Pas d&apos;information de santé ni de nom de
        collègue.
      </p>
      <select name="type" className="field field-sm w-full">
        <option value="ANOMALY">Anomalie</option>
        <option value="EQUIPMENT">Matériel manquant</option>
        <option value="OTHER">Autre</option>
      </select>
      <textarea name="comment" required rows={3} placeholder="Commentaire" className="field w-full" />
      <input type="file" name="photo" accept="image/*" capture="environment" className="text-sm" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <PendingButton className="btn btn-secondary w-full" pendingLabel="Envoi…">
        Envoyer
      </PendingButton>
    </form>
  );
}
