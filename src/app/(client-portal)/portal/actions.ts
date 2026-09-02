"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PORTAL_COOKIE_NAME } from "@/server/client-portal/session";

export async function logoutPortalAction() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(PORTAL_COOKIE_NAME)?.value;
  if (sessionId) {
    await prisma.clientPortalSession.deleteMany({ where: { id: sessionId } });
  }
  cookieStore.delete(PORTAL_COOKIE_NAME);
  redirect("/portal");
}
