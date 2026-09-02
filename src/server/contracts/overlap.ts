import { prisma } from "@/lib/prisma";

export class ContractOverlapError extends Error {}

// Chevauchement de deux plages [aStart, aEnd] et [bStart, bEnd] inclusives
// (dates calendaires, pas d'instants) : deux contrats ne peuvent pas être
// ACTIVE sur le même site le même jour.
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

// Les dates vivent sur Contract (le cadre), le tarif/site sur ContractSite —
// on interroge ContractSite pour le site, en passant par sa relation
// contract pour le statut et la période.
export async function hasOverlappingActiveContract(
  siteId: string,
  startsOn: Date,
  endsOn: Date,
  excludeContractSiteId?: string,
): Promise<boolean> {
  const candidates = await prisma.contractSite.findMany({
    where: {
      siteId,
      contract: { status: "ACTIVE" },
      ...(excludeContractSiteId ? { id: { not: excludeContractSiteId } } : {}),
    },
    select: { contract: { select: { startsOn: true, endsOn: true } } },
  });
  return candidates.some((candidate) =>
    rangesOverlap(candidate.contract.startsOn, candidate.contract.endsOn, startsOn, endsOn),
  );
}
