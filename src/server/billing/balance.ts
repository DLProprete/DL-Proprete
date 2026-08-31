import type { Prisma } from "@prisma/client";

// Peut être négatif (trop-perçu) — l'arrondi/plancher à 0 est un choix
// d'affichage laissé à l'appelant, pas à cette fonction.
export function computeBalanceDue(invoice: {
  amountTTC: Prisma.Decimal | number;
  payments: { amount: Prisma.Decimal | number }[];
}): number {
  const totalPaid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  return Number(invoice.amountTTC) - totalPaid;
}
