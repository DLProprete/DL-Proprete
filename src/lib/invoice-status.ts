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
// impayé total), émise non payée (ambre), brouillon (gris), annulée (gris foncé).
export function invoiceStatusTone(
  invoice: { status: string; dueOn: Date | null; balanceDue: number },
  today: Date,
): BadgeTone {
  const isOverdue =
    (invoice.status === "ISSUED" || invoice.status === "PARTIALLY_PAID") &&
    invoice.dueOn !== null &&
    invoice.dueOn < today &&
    invoice.balanceDue > 0;
  if (isOverdue) return "danger";
  switch (invoice.status) {
    case "PAID":
      return "success";
    case "PARTIALLY_PAID":
      return "neutral";
    case "ISSUED":
      return "warning";
    case "CANCELLED":
      return "muted";
    default:
      return "neutral";
  }
}
