"use client";

import { useEffect, useState } from "react";

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function LiveTimer({ since }: { since: string }) {
  // État initial fixe (0) exprès : le calculer ici tournerait aussi côté
  // SSR avec un `Date.now()` différent de celui de l'hydratation client,
  // provoquant un mismatch. `useEffect` ne tourne que côté client, donc la
  // vraie valeur n'apparaît qu'après le montage (correction quasi instantanée).
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(since).getTime();
    const update = () => setElapsed(Date.now() - start);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [since]);

  return <span>{formatElapsed(elapsed)}</span>;
}
