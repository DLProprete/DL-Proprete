import type { BadgeTone } from "@/components/badge";

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  UNSTAFFED: "Non pourvu",
  PARTIALLY_STAFFED: "Partiellement pourvu",
  PLANNED: "Pourvu",
  DONE: "Terminé",
  CANCELLED: "Annulé",
};

export const SHIFT_STATUS_TONE: Record<string, BadgeTone> = {
  PLANNED: "success",
  DONE: "success",
  PARTIALLY_STAFFED: "warning",
  UNSTAFFED: "warning",
  CANCELLED: "muted",
};

// Filet de couleur à gauche des blocs du planning. Dans une grille de
// 16 agents sur 7 jours, une pastille par cellule devient du bruit : le
// statut passe par le bord, la pastille ne reste que pour l'anormal.
export const SHIFT_STATUS_EDGE: Record<string, string> = {
  PLANNED: "border-l-emerald-500",
  DONE: "border-l-emerald-600",
  PARTIALLY_STAFFED: "border-l-amber-500",
  UNSTAFFED: "border-l-amber-500",
  CANCELLED: "border-l-zinc-300",
};
