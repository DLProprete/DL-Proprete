import type { BadgeTone } from "@/components/badge";

export const PROSPECT_STATUS_LABELS: Record<string, string> = {
  NEW: "Nouveau",
  CONTACTED: "Contacté",
  QUOTE_SENT: "Devis envoyé",
  WON: "Signé",
  LOST: "Perdu",
};

// Priorité : relance en retard (rouge) prime sur le statut, sauf issue déjà
// tranchée (signé/perdu) — pas la peine d'alerter sur une relance dépassée
// d'un prospect qui n'est plus actif.
export function prospectStatusBadge(
  prospect: { status: string; nextFollowUpAt: Date | null },
  today: Date,
): { tone: BadgeTone; label: string } {
  const isOverdue =
    prospect.status !== "WON" &&
    prospect.status !== "LOST" &&
    prospect.nextFollowUpAt !== null &&
    prospect.nextFollowUpAt < today;
  if (isOverdue) return { tone: "danger", label: "Relance en retard" };
  switch (prospect.status) {
    case "WON":
      return { tone: "success", label: PROSPECT_STATUS_LABELS.WON };
    case "LOST":
      return { tone: "muted", label: PROSPECT_STATUS_LABELS.LOST };
    default:
      return { tone: "neutral", label: PROSPECT_STATUS_LABELS[prospect.status] ?? prospect.status };
  }
}
