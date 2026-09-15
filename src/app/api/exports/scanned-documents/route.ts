import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { exportScannedDocumentsCsv } from "@/server/exports/scanned-documents-csv";

const CATEGORIES = ["COMPTABLE", "ACHATS", "STOCK"] as const;

export async function GET(request: Request) {
  const user = await requireSession();
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
      "Content-Disposition": `attachment; filename="documents-numerises${suffix}.csv"`,
    },
  });
}
