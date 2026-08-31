"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { startTimeEntryAction, endTimeEntryAction } from "@/app/(agent)/actions";
import { clearPending, readPending, writePending, type PendingClockAction } from "@/lib/clock-queue";

// Démarrer/Terminer un pointage sans réseau (sous-sol, parking) ne doit pas
// perdre le clic. Appelle la Server Action directement (pas de <form> :
// supporté nativement pour un appel programmatique depuis un client
// component) ; une vraie panne réseau échoue avant même d'atteindre le
// serveur — mise en attente locale (src/lib/clock-queue.ts), rejouée au
// retour du réseau. Une erreur serveur réelle (pas un souci de connexion)
// n'est PAS avalée : silencieusement la retenter en boucle masquerait un
// vrai bug plutôt que de le corriger.
export function ClockButton({
  mode,
  targetId,
  label,
  className,
}: {
  mode: "start" | "end";
  targetId: string;
  label: string;
  className: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingClockAction | null>(null);
  const [isSubmitting, startTransition] = useTransition();

  async function run(action: PendingClockAction) {
    // Optimiste : les deux Server Actions se terminent toujours par
    // redirect() (succès comme échec applicatif), qui interrompt la
    // fonction en levant une erreur interne Next — tout code placé après
    // le await, y compris setPending(null), n'est donc JAMAIS atteint sur
    // le chemin de succès. On vide la file et l'état "en attente" avant la
    // tentative ; le catch les réécrit si elle échoue vraiment hors ligne.
    // Sans ça, React réutilisant la même instance de ClockButton d'un mode
    // à l'autre (Démarrer -> Terminer, même position dans l'arbre), un
    // succès après une file rejouée laissait le bandeau "en attente"
    // affiché indéfiniment sur le bouton suivant.
    clearPending();
    setPending(null);
    try {
      if (action.kind === "start") {
        await startTimeEntryAction(action.targetId);
      } else {
        await endTimeEntryAction(action.targetId);
      }
      router.refresh();
    } catch (error) {
      unstable_rethrow(error); // laisse passer NEXT_REDIRECT (succès normal)

      const looksOffline = !navigator.onLine || error instanceof TypeError;
      if (!looksOffline) throw error; // vraie erreur serveur : ne pas la masquer

      writePending(action);
      setPending(action);
    }
  }

  useEffect(() => {
    const existing = readPending();
    if (existing && existing.kind === mode && existing.targetId === targetId) {
      // localStorage n'existe pas côté serveur : lu ici (post-montage) pour
      // ne pas provoquer de mismatch d'hydratation, pas dérivable au rendu.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending(existing);
      run(existing);
    }
    function onOnline() {
      const queued = readPending();
      if (queued) run(queued);
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClick() {
    // Pas de setPending ici : l'état "en attente de connexion" ne doit
    // s'afficher qu'après un échec confirmé (dans run()), pas flasher sur
    // chaque clic normal le temps que la requête parte.
    const action: PendingClockAction = { kind: mode, targetId, queuedAt: new Date().toISOString() };
    startTransition(() => run(action));
  }

  if (pending) {
    return (
      <div className="space-y-2">
        <button type="button" disabled className={`${className} opacity-60`}>
          {label}
        </button>
        <p className="text-center text-sm text-amber-700">
          En attente de connexion — sera envoyé automatiquement.
        </p>
      </div>
    );
  }

  return (
    <button type="button" onClick={handleClick} disabled={isSubmitting} className={className}>
      {label}
    </button>
  );
}
