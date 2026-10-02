import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { contractState, normalize } from "./contract-extract";
import { requireRole, type SessionUser } from "@/server/auth/session";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

// Un PLANNER ne voit jamais les documents marqués sensibles (RH/santé) —
// garde plus stricte que le reste du module, cohérent avec la règle dure
// "pas de diagnostic médical".
export async function listScannedDocuments(user: SessionUser, status?: "PENDING" | "OCR_DONE" | "VALIDATED" | "REJECTED") {
  requireRole(user, [...MANAGE_ROLES]);
  return prisma.scannedDocument.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(user.role === "ADMIN" ? {} : { isSensitive: false }),
    },
    orderBy: { createdAt: "desc" },
  });
}

// Doit rester identique à l'index de la migration 20261002180000_scanned_contracts.
const SEARCH_VECTOR = Prisma.sql`to_tsvector('french'::regconfig, translate(lower(
    coalesce("ocrText", '') || ' ' || coalesce("clientNameRaw", '') || ' ' ||
    coalesce("supplierName", '') || ' ' || coalesce("originalName", '')),
    'àâäáãéèêëíìîïóòôöõúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'))`;

export type DocumentSearch = {
  q?: string;
  type?: "FACTURE" | "CONTRAT" | "AUTRE";
  state?: ReturnType<typeof contractState>;
  year?: number;
};

// Recherche plein texte (insensible aux accents) + filtres. Mêmes règles de
// visibilité que listScannedDocuments (documents sensibles réservés à l'ADMIN).
export async function searchScannedDocuments(user: SessionUser, search: DocumentSearch) {
  requireRole(user, [...MANAGE_ROLES]);
  const q = search.q ? normalize(search.q).trim() : "";
  let ids: string[] | undefined;
  if (q) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "ScannedDocument"
      WHERE ${SEARCH_VECTOR} @@ websearch_to_tsquery('french', ${q})
      ORDER BY ts_rank(${SEARCH_VECTOR}, websearch_to_tsquery('french', ${q})) DESC
      LIMIT 200`;
    ids = rows.map((row) => row.id);
  }
  const yearRange = search.year
    ? { gte: new Date(Date.UTC(search.year, 0, 1)), lt: new Date(Date.UTC(search.year + 1, 0, 1)) }
    : undefined;
  const documents = await prisma.scannedDocument.findMany({
    where: {
      ...(ids ? { id: { in: ids } } : {}),
      ...(search.type ? { documentType: search.type } : {}),
      ...(yearRange
        ? { OR: [{ signedOn: yearRange }, { contractStartsOn: yearRange }, { documentDate: yearRange }] }
        : {}),
      ...(user.role === "ADMIN" ? {} : { isSensitive: false }),
    },
    include: { client: { select: { legalName: true } } },
    orderBy: { createdAt: "desc" },
  });
  const filtered = search.state
    ? documents.filter(
        (d) => d.documentType === "CONTRAT" && contractState(d.contractEndsOn, d.tacitRenewal) === search.state,
      )
    : documents;
  // Ordre de pertinence conservé quand il y a une recherche texte.
  return ids ? filtered.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) : filtered;
}

export async function getScannedDocument(user: SessionUser, id: string) {
  requireRole(user, [...MANAGE_ROLES]);
  const document = await prisma.scannedDocument.findUnique({ where: { id } });
  if (document?.isSensitive && user.role !== "ADMIN") return null;
  return document;
}
