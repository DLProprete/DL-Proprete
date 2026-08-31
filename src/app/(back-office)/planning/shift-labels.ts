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
