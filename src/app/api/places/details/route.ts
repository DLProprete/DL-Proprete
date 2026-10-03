import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { getPlaceAddressComponents } from "@/lib/places";

export async function GET(request: Request) {
  const user = await requireSession().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Session requise" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "PLANNER") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const placeId = new URL(request.url).searchParams.get("placeId") ?? "";
  const place = await getPlaceAddressComponents(placeId);
  if (!place) {
    return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
  }
  return NextResponse.json(place);
}
