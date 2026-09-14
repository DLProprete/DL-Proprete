type ShiftWithEntries = {
  timeEntries: { status: string }[];
};

// Un pointage REJECTED ne compte pas comme "terminé" : l'agent doit pouvoir
// repointer sur cette vacation. Plus d'état "en cours" depuis le 12/09 :
// "Terminer" crée et clôt le pointage dans le même geste, il n'y a jamais
// de ligne OPEN à observer entre les deux.
export function shiftState(shift: ShiftWithEntries): "done" | "upcoming" {
  if (shift.timeEntries.some((entry) => entry.status === "SUBMITTED" || entry.status === "VALIDATED")) {
    return "done";
  }
  return "upcoming";
}
