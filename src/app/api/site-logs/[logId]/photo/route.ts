import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";
import { requireSession } from "@/server/auth/session";
import { agentHasWorkedAtSite } from "@/server/sites/access";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
};

// Sert la photo de main courante via saveUpload/readUpload (Supabase
// Storage ou disque local selon l'environnement) — ne peut plus être un
// fichier statique sous public/ une fois hors du disque local.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ logId: string }> },
) {
  const { logId } = await params;
  const user = await requireSession();

  const log = await prisma.siteLog.findUniqueOrThrow({ where: { id: logId } });
  // Un AGENT ne voit que la main courante des sites où il est (ou a été)
  // affecté — sans ça, changer l'id dans l'URL donnait accès aux photos de
  // n'importe quel client.
  if (user.role === "AGENT" && !(await agentHasWorkedAtSite(user.id, log.siteId))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
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
