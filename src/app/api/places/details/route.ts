import { NextResponse } from "next/server";
import { requireRole, requireSession } from "@/server/auth/session";
import { getPlaceAddressComponents } from "@/lib/places";

export async function GET(request: Request) {
  const user = await requireSession();
  requireRole(user, ["ADMIN", "PLANNER"]);

  const placeId = new URL(request.url).searchParams.get("placeId") ?? "";
  const place = await getPlaceAddressComponents(placeId);
  if (!place) {
    return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
  }
  return NextResponse.json(place);
}
