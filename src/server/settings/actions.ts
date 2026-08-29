import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { companyProfileInputSchema } from "@/lib/zod/company-profile";

export async function updateCompanyProfile(user: SessionUser, input: unknown) {
  requireRole(user, ["ADMIN"]);
  const data = companyProfileInputSchema.parse(input);
  return prisma.companyProfile.upsert({
    where: { id: "default" },
    update: data,
    create: { id: "default", ...data },
  });
}
