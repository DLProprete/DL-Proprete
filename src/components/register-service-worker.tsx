"use client";

import { useEffect } from "react";

// Enregistrement au montage : uniquement pour l'installabilité PWA (icône
// écran d'accueil) et le repli hors ligne statique (public/sw.js). La file
// d'attente de pointage (src/lib/clock-queue.ts) ne dépend pas de ce
// service worker — elle tourne dans l'onglet ouvert, pas dans le SW.
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installation non-critique : l'appli reste utilisable sans SW,
        // seule l'icône d'écran d'accueil et le repli hors ligne manquent.
      });
    }
  }, []);

  return null;
}
