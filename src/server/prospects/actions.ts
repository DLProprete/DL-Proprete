import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { prospectInputSchema } from "@/lib/zod/prospect";
import { clientInputSchema } from "@/lib/zod/client";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export class ProspectAlreadyConvertedError extends Error {}

export async function createProspect(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = prospectInputSchema.parse(input);
  return prisma.prospect.create({
    data: { ...data, email: data.email || null, nextFollowUpAt: data.nextFollowUpAt || null },
  });
}

export async function updateProspect(user: SessionUser, id: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = prospectInputSchema.parse(input);
  return prisma.prospect.update({
    where: { id },
    data: { ...data, email: data.email || null, nextFollowUpAt: data.nextFollowUpAt || null },
  });
}

// Formulaire dedie (pas un simple clic) : Client.billingAddress est requis,
// un prospect fraichement cree ne l'a pas forcement — voir
// prospects/[prospectId]/convert/page.tsx.
export async function convertProspectToClient(user: SessionUser, prospectId: string, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
  if (!prospect) throw new Error("Prospect introuvable");
  if (prospect.convertedClientId) throw new ProspectAlreadyConvertedError("Ce prospect a déjà été converti");

  const data = clientInputSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const client = await tx.client.create({ data: { ...data, email: data.email || null } });
    await tx.prospect.update({
      where: { id: prospectId },
      data: { status: "WON", convertedClientId: client.id },
    });
    return client;
  });
}
