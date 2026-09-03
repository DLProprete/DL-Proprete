import type { BadgeTone } from "@/components/badge";

// Suivi manuel du flux de signature (interface web Yousign, palier
// gratuit, hors outil) — mêmes forme et usage que contract-status.ts.
export const CONTRACT_SIGNATURE_STATUS_LABELS: Record<string, string> = {
  NOT_SENT: "Non envoyé",
  SENT: "Envoyé",
  SIGNED: "Signé",
};

export const CONTRACT_SIGNATURE_STATUS_TONE: Record<string, BadgeTone> = {
  NOT_SENT: "neutral",
  SENT: "warning",
  SIGNED: "success",
};
