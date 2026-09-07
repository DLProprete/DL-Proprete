import { NextResponse } from "next/server";
import { requireRole, requireSession } from "@/server/auth/session";
import { autocompleteAddress } from "@/lib/places";

// Le navigateur n'appelle jamais Google directement : la clé reste
// côté serveur (même principe que geocodeAddress).
export async function GET(request: Request) {
  const user = await requireSession();
  requireRole(user, ["ADMIN", "PLANNER"]);

  const input = new URL(request.url).searchParams.get("input") ?? "";
  const suggestions = await autocompleteAddress(input);
  return NextResponse.json({ suggestions });
}
