import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";
import { requireSession } from "@/server/auth/session";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSession().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Session requise" }, { status: 401 });
  }

  const absence = await prisma.absence.findUnique({ where: { id } });
  if (!absence) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
  // Document sensible (justificatif d'arrêt maladie) : ADMIN ou l'agent
  // concerné uniquement, pas PLANNER (règle plus stricte que la
  // restriction "own data" générale, qui ne vaut que pour AGENT).
  if (user.role !== "ADMIN" && user.id !== absence.userId) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  if (!absence.documentPath) {
    return NextResponse.json({ error: "Aucun justificatif" }, { status: 404 });
  }

  const buffer = await readUpload(absence.documentPath);
  const extension = absence.documentPath.split(".").pop() ?? "";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "private, no-store",
    },
  });
}
