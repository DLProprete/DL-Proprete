import { prisma } from "@/lib/prisma";

// DRAFT est pre-emission et modifiable cote interne, jamais visible d'un
// client — memes filtres que la logique de relance (src/server/billing).
export async function listMyInvoices(clientId: string) {
  return prisma.invoice.findMany({
    where: { clientId, status: { not: "DRAFT" } },
    include: { payments: true },
    orderBy: { issuedOn: "desc" },
  });
}
