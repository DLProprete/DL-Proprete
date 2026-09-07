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

// visibleToClient: false reste une frontière ADMIN/PLANNER — un client ne
// doit jamais la voir, même sur ses propres sites.
export async function listMySiteReports(clientId: string) {
  return prisma.siteLog.findMany({
    where: { visibleToClient: true, site: { clientId } },
    include: { site: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
