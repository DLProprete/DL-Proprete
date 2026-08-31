import type { BadgeTone } from "@/components/badge";

export const ABSENCE_TYPE_LABELS: Record<string, string> = {
  PAID_LEAVE: "Congé payé",
  RTT: "RTT",
  SICK: "Arrêt maladie",
  OTHER: "Autre",
};

export const ABSENCE_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
};

export const ABSENCE_STATUS_TONE: Record<string, BadgeTone> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "muted",
};
