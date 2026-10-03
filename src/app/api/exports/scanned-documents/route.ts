import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { exportScannedDocumentsCsv } from "@/server/exports/scanned-documents-csv";

const CATEGORIES = ["COMPTABLE", "ACHATS", "STOCK"] as const;

export async function GET(request: Request) {
  const user = await requireSession().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Session requise" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const categoryParam = searchParams.get("category");
  const category = CATEGORIES.find((c) => c === categoryParam);
  if (categoryParam && !category) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const csv = await exportScannedDocumentsCsv(user, category);
  const suffix = category ? `-${category.toLowerCase()}` : "";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="documents-numerises${suffix}.csv"`,
    },
  });
}
