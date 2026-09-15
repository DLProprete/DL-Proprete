import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/uploads";
import { requireSession } from "@/server/auth/session";

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSession();
  if (user.role !== "ADMIN" && user.role !== "PLANNER") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const document = await prisma.scannedDocument.findUniqueOrThrow({ where: { id } });
  if (document.isSensitive && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const buffer = await readUpload(document.filePath);
  const extension = document.filePath.split(".").pop() ?? "";

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream" },
  });
}
