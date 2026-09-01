"use client";

import { useEffect, useState } from "react";

// navigator.onLine n'existe pas côté serveur : lu ici (post-montage) pour ne
// pas provoquer de mismatch d'hydratation, même pattern que la lecture de
// localStorage dans clock-button.tsx. Sans ce bandeau, un agent hors ligne
// (sous-sol, parking) ne voit rien confirmer que son action a bien été mise
// en attente tant qu'il n'a pas déjà cliqué une fois.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffline(!navigator.onLine);
    function goOffline() {
      setOffline(true);
    }
    function goOnline() {
      setOffline(false);
    }
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <p className="alert alert-warning mb-4 text-center" role="status">
      Hors ligne — les actions seront envoyées automatiquement au retour du réseau.
    </p>
  );
}
