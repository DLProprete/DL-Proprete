import type { Prisma, PrismaClient } from "@prisma/client";

// Atomique grâce à l'upsert (verrou de ligne Postgres implicite sur
// InvoiceSequence.year) : sûr même si deux émissions concurrentes visent la
// même année. Séquence remise à zéro chaque année civile (docs/
// ARCHITECTURE.md section 3).
export async function nextInvoiceNumber(
  tx: PrismaClient | Prisma.TransactionClient,
  year: number,
): Promise<string> {
  const sequence = await tx.invoiceSequence.upsert({
    where: { year },
    create: { year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return `F-${year}-${String(sequence.lastNumber).padStart(4, "0")}`;
}
