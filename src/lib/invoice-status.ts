import type { BadgeTone } from "@/components/badge";

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ISSUED: "Émise",
  PARTIALLY_PAID: "Partiellement payée",
  PAID: "Payée",
  CANCELLED: "Annulée",
};

// Priorité : en retard (rouge) prime sur le statut ; sinon soldée (vert),
// partiellement payée (gris — un acompte reçu est moins préoccupant qu'un
// impayé total), émise non payée (ambre "Impayée"), brouillon (gris),
// annulée (gris foncé). Le libellé change avec le ton (pas seulement la
// couleur) pour "en retard" et "impayée" — les autres gardent leur libellé
// de statut brut.
export function invoiceStatusBadge(
  invoice: { status: string; dueOn: Date | null; balanceDue: number },
  today: Date,
): { tone: BadgeTone; label: string } {
  const isOverdue =
    (invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID") &&
    invoice.dueOn !== null &&
    invoice.dueOn < today &&
    invoice.balanceDue > 0;
  if (isOverdue) return { tone: "danger", label: "En retard" };
  switch (invoice.status) {
    case "PAID":
      return { tone: "success", label: "Payée" };
    case "PARTIALLY_PAID":
      return { tone: "neutral", label: INVOICE_STATUS_LABELS.PARTIALLY_PAID };
    case "ISSUED":
      return { tone: "warning", label: "Impayée" };
    case "CANCELLED":
      return { tone: "muted", label: INVOICE_STATUS_LABELS.CANCELLED };
    default:
      return { tone: "neutral", label: INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status };
  }
}
