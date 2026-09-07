import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";
import { requireClientSession } from "@/server/client-portal/session";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
};

// Pendant de src/app/api/site-logs/[logId]/photo/route.ts, côté client :
// mêmes règles de service, mais l'autorisation porte sur visibleToClient
// et l'appartenance du site au client de la session — pas sur le rôle.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ logId: string }> },
) {
  const { logId } = await params;
  const session = await requireClientSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
  }

  const log = await prisma.siteLog.findUnique({
    where: { id: logId },
    include: { site: { select: { clientId: true } } },
  });
  // Même réponse (404) que le rapport soit inexistant, masqué au client ou
  // appartienne à un autre client — ne pas confirmer l'existence d'un
  // rapport qu'on n'a pas le droit de voir (même logique que la route
  // invoices/[invoiceId]/pdf).
  if (!log || !log.visibleToClient || log.site.clientId !== session.clientId) {
    return NextResponse.json({ error: "Rapport introuvable" }, { status: 404 });
  }
  if (!log.photoPath) {
    return NextResponse.json({ error: "Aucune photo" }, { status: 404 });
  }

  const buffer = await readUpload(log.photoPath);
  const extension = log.photoPath.split(".").pop() ?? "";

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream" },
  });
}
