import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumePortalToken, PortalTokenInvalidError } from "@/server/client-portal/tokens";
import { createPortalSession, PORTAL_COOKIE_NAME } from "@/server/client-portal/session";

// Jeton du lien magique : base64url de 32 octets (createPortalToken).
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{20,128}$/;

function invalid(request: Request) {
  return NextResponse.redirect(new URL("/portal?error=invalid", request.url), 303);
}

// GET ne consomme rien : les antivirus de messagerie ouvrent les liens avant
// le destinataire, ils épuiseraient le jeton et obtiendraient la session.
// La page ne fait que proposer le bouton, le jeton part en POST.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!TOKEN_FORMAT.test(token)) return invalid(request);

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Espace client DL Propreté</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #fafafa; font-family: system-ui, sans-serif; color: #18181b; }
  main { max-width: 22rem; margin: 1.5rem; padding: 1.5rem; background: #fff; border: 1px solid #e4e4e7;
    border-radius: .5rem; text-align: center; }
  button { margin-top: 1rem; width: 100%; padding: .75rem; border: 0; border-radius: .375rem;
    background: #243746; color: #fff; font-size: 1rem; cursor: pointer; }
</style>
</head>
<body>
<main>
  <h1 style="font-size:1.125rem;margin:0">Espace client DL Propreté</h1>
  <form method="post" action="/api/client-portal/verify">
    <input type="hidden" name="token" value="${token}">
    <button type="submit">Accéder à mon espace</button>
  </form>
</main>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const token = formData?.get("token");
  if (typeof token !== "string" || !TOKEN_FORMAT.test(token)) return invalid(request);

  let clientId: string;
  try {
    clientId = await consumePortalToken(token);
  } catch (error) {
    if (error instanceof PortalTokenInvalidError) return invalid(request);
    throw error;
  }

  const session = await createPortalSession(clientId);
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: session.expiresAt,
  });

  // 303 : le navigateur suit la redirection en GET après le POST.
  return NextResponse.redirect(new URL("/portal", request.url), 303);
}
