import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { exportSalesJournalCsv } from "@/server/exports/sales-journal-csv";

export async function GET(request: Request) {
  const user = await requireSession();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const monthParam = searchParams.get("month");
  const month = monthParam ? Number(monthParam) : undefined;
  if (!year || (month !== undefined && (month < 1 || month > 12))) {
    return NextResponse.json({ error: "Paramètres year/month invalides" }, { status: 400 });
  }

  const csv = await exportSalesJournalCsv(user, year, month);
  const suffix = month ? `-${String(month).padStart(2, "0")}` : "";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="journal-ventes-${year}${suffix}.csv"`,
    },
  });
}
