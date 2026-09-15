import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { CSV_BOM, csvField } from "@/lib/csv";
import { formatDateOnly } from "@/lib/dates";

const MANAGE_ROLES = ["ADMIN"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  COMPTABLE: "Comptable",
  ACHATS: "Achats",
  STOCK: "Stock",
};

// Export exploitable par la comptabilité de Cassandre — uniquement les
// documents validés (jamais une donnée non relue par un humain), jamais
// les documents sensibles (RH/santé) dans cet export.
export async function exportScannedDocumentsCsv(
  user: SessionUser,
  category?: "COMPTABLE" | "ACHATS" | "STOCK",
): Promise<string> {
  requireRole(user, [...MANAGE_ROLES]);

  const documents = await prisma.scannedDocument.findMany({
    where: {
      status: "VALIDATED",
      isSensitive: false,
      ...(category ? { category } : {}),
    },
    orderBy: [{ documentDate: "asc" }, { createdAt: "asc" }],
  });

  const decimal = (value: number) => value.toFixed(2).replace(".", ",");

  const header = ["Date", "Catégorie", "Fournisseur", "Référence", "Montant TTC", "Fichier"].join(";");

  const rows = documents.map((document) =>
    [
      csvField(document.documentDate ? formatDateOnly(document.documentDate) : ""),
      csvField(CATEGORY_LABELS[document.category ?? ""] ?? ""),
      csvField(document.supplierName ?? ""),
      csvField(document.reference ?? ""),
      document.amountTtc !== null ? decimal(Number(document.amountTtc)) : "",
      csvField(document.originalName),
    ].join(";"),
  );

  return [CSV_BOM + header, ...rows].join("\r\n");
}
