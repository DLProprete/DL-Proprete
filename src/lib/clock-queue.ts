// File d'attente locale (1 action max) pour "Terminer" quand le réseau
// manque au moment du clic. Capacité à 1 volontaire : l'agent termine une
// vacation à la fois, donc une seconde action en attente ne peut être
// qu'un remplacement de la première (ex. l'agent retape), jamais une
// vraie file FIFO à gérer.

export type PendingClockAction = {
  targetId: string;
  note: string;
  queuedAt: string;
};

const STORAGE_KEY = "dl-proprete:pending-clock-action";

export function readPending(): PendingClockAction | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingClockAction) : null;
  } catch {
    // Stockage indisponible (navigation privée, quota) : pas de file, pas
    // de crash — l'agent retape simplement une fois reconnecté.
    return null;
  }
}

export function writePending(action: PendingClockAction): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  } catch {
    // Ignoré, cf. readPending.
  }
}

export function clearPending(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignoré, cf. readPending.
  }
}
