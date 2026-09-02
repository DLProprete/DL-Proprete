import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { contractSiteInputSchema } from "@/lib/zod/contract-site";
import { hasOverlappingActiveContract, ContractOverlapError } from "@/server/contracts/overlap";
import { logAudit } from "@/server/audit/log";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

// Ajoute un site sous un contrat-cadre existant, avec son propre tarif —
// c'est ici, pas à la création du contrat, que le check de chevauchement a
// un sens (un cadre sans site ne couvre encore rien).
export async function createContractSite(user: SessionUser, input: unknown) {
  requireRole(user, [...MANAGE_ROLES]);
  const data = contractSiteInputSchema.parse(input);

  const [contract, site] = await Promise.all([
    prisma.contract.findUniqueOrThrow({ where: { id: data.contractId } }),
    prisma.site.findUniqueOrThrow({ where: { id: data.siteId } }),
  ]);

  if (contract.status === "ACTIVE") {
    const overlap = await hasOverlappingActiveContract(data.siteId, contract.startsOn, contract.endsOn);
    if (overlap) {
      throw new ContractOverlapError(
        "Un contrat ACTIVE existe déjà sur ce site pour une période qui chevauche.",
      );
    }
  }

  const contractSite = await prisma.contractSite.create({
    data: {
      contractId: data.contractId,
      siteId: data.siteId,
      hourlyRateHT: data.hourlyRateHT,
      billingBasis: data.billingBasis,
      indicativeMonthlyHours: data.indicativeMonthlyHours,
    },
  });
  await logAudit(prisma, {
    actorUserId: user.id,
    action: "CONTRACT_SITE_CREATED",
    entityType: "Contract",
    entityId: contract.id,
    summary: `Site ajouté au contrat ${contract.reference} : ${site.name}`,
  });
  return contractSite;
}
