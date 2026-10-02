import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runPurge } from "@/server/retention/purge";

// Purge de conservation, appelée chaque nuit : cron Vercel (vercel.json, qui
// envoie « Authorization: Bearer $CRON_SECRET »), puis crontab sur le VPS.
// Sans CRON_SECRET configuré, la route refuse tout.
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

// Suppression des fichiers une par une : le temps maximal du plan gratuit
// Vercel. Interrompue, la purge reprend sans dommage au passage suivant.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const report = await runPurge();
  return NextResponse.json(report);
}
