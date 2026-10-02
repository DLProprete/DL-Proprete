import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { companyProfileInputSchema } from "@/lib/zod/company-profile";
import { alertSettingsSchema } from "@/lib/zod/alert-settings";
import { getCompanyProfile } from "./queries";

export async function updateAlertSettings(user: SessionUser, input: unknown) {
  requireRole(user, ["ADMIN"]);
  const data = alertSettingsSchema.parse(input);
  await getCompanyProfile(); // crée la fiche par défaut si elle n'existe pas encore
  return prisma.companyProfile.update({ where: { id: "default" }, data });
}

export async function updateCompanyProfile(user: SessionUser, input: unknown) {
  requireRole(user, ["ADMIN"]);
  const data = companyProfileInputSchema.parse(input);
  return prisma.companyProfile.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}
