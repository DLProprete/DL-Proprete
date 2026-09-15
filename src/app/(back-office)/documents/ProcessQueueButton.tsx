"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runOcrAction } from "./actions";

// Traite les documents PENDING un par un (jamais une boucle côté serveur
// sur tout le lot — voir docs/NUMERISATION-DOCUMENTS.md) : chaque appel est
// une Server Action indépendante, ce qui donne l'effet "ça défile tout
// seul" demandé sans file d'attente ni job en arrière-plan à construire.
export function ProcessQueueButton({ pendingIds }: { pendingIds: string[] }) {
  const [isPending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      setProgress({ done: 0, total: pendingIds.length });
      for (const [index, id] of pendingIds.entries()) {
        try {
          await runOcrAction(id);
        } catch (error) {
          console.error(`[documents] échec du traitement de ${id} :`, error);
        }
        setProgress({ done: index + 1, total: pendingIds.length });
      }
      router.refresh();
    });
  }

  if (pendingIds.length === 0) return null;

  return (
    <button type="button" onClick={handleClick} disabled={isPending} className="btn btn-dark">
      {progress
        ? `Traitement… ${progress.done}/${progress.total}`
        : `Traiter les ${pendingIds.length} document${pendingIds.length > 1 ? "s" : ""} en attente`}
    </button>
  );
}
