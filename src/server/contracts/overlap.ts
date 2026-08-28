import { prisma } from "@/lib/prisma";

// Chevauchement de deux plages [aStart, aEnd] et [bStart, bEnd] inclusives
// (dates calendaires, pas d'instants) : deux contrats ne peuvent pas être
// ACTIVE sur le même site le même jour.
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export async function hasOverlappingActiveContract(
  siteId: string,
  startsOn: Date,
  endsOn: Date,
  excludeContractId?: string,
): Promise<boolean> {
  const candidates = await prisma.contract.findMany({
    where: {
      siteId,
      status: "ACTIVE",
      ...(excludeContractId ? { id: { not: excludeContractId } } : {}),
    },
    select: { startsOn: true, endsOn: true },
  });
  return candidates.some((candidate) =>
    rangesOverlap(candidate.startsOn, candidate.endsOn, startsOn, endsOn),
  );
}
