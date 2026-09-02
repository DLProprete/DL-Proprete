import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumePortalToken, PortalTokenInvalidError } from "@/server/client-portal/tokens";
import { createPortalSession, PORTAL_COOKIE_NAME } from "@/server/client-portal/session";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/portal?error=invalid", request.url));
  }

  let clientId: string;
  try {
    clientId = await consumePortalToken(token);
  } catch (error) {
    if (error instanceof PortalTokenInvalidError) {
      return NextResponse.redirect(new URL("/portal?error=invalid", request.url));
    }
    throw error;
  }

  const session = await createPortalSession(clientId);
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });

  return NextResponse.redirect(new URL("/portal", request.url));
}
