import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { exportValidatedTimeEntriesCsv } from "@/server/exports/time-entries-csv";

export async function GET(request: Request) {
  const user = await requireSession().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Session requise" }, { status: 401 });
  }
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "Paramètres year/month invalides" }, { status: 400 });
  }

  const csv = await exportValidatedTimeEntriesCsv(user, year, month);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="pointages-${year}-${String(month).padStart(2, "0")}.csv"`,
    },
  });
}
