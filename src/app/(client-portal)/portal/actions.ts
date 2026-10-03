"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { deletePortalSession, PORTAL_COOKIE_NAME } from "@/server/client-portal/session";

export async function logoutPortalAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTAL_COOKIE_NAME)?.value;
  if (token) {
    await deletePortalSession(token);
  }
  cookieStore.delete(PORTAL_COOKIE_NAME);
  redirect("/portal");
}
