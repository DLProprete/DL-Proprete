import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { autocompleteAddress } from "@/lib/places";

// Le navigateur n'appelle jamais Google directement : la clé reste
// côté serveur (même principe que geocodeAddress).
export async function GET(request: Request) {
  const user = await requireSession().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Session requise" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "PLANNER") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const input = new URL(request.url).searchParams.get("input") ?? "";
  const suggestions = await autocompleteAddress(input);
  return NextResponse.json({ suggestions });
}
