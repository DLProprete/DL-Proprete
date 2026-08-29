import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { contractInputSchema } from "@/lib/zod/contract";
import { hasOverlappingActiveContract } from "./overlap";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export class ContractOverlapError extends Error {}

// billingMode reste TIME_AND_MATERIALS_PLANNED (valeur par défaut du schéma,
// seule option existante au MVP) : pas de champ dans le formulaire.
export async function createContract(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = contractInputSchema.parse(input);

  const site = await prisma.site.findUniqueOrThrow({ where: { id: data.siteId } });

  if (data.status === "ACTIVE") {
    const overlap = await hasOverlappingActiveContract(data.siteId, data.startsOn, data.endsOn);
    if (overlap) {
      throw new ContractOverlapError(
        "Un contrat ACTIVE existe déjà sur ce site pour une période qui chevauche.",
      );
    }
  }

  return prisma.contract.create({
    data: {
      clientId: site.clientId,
      siteId: data.siteId,
      reference: data.reference,
      startsOn: data.startsOn,
      endsOn: data.endsOn,
      hourlyRateHT: data.hourlyRateHT,
      status: data.status,
      billingBasis: data.billingBasis,
      indicativeMonthlyHours: data.indicativeMonthlyHours,
      notes: data.notes,
    },
  });
}
