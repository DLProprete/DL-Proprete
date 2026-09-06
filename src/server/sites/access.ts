import { prisma } from "@/lib/prisma";

// Un AGENT ne doit voir/écrire que sur les sites où il a (ou a eu) une
// vacation affectée — sans ça, n'importe quel agent peut lire la main
// courante (et ses photos) de n'importe quel client en devinant un id.
// Pas de restriction pour ADMIN/PLANNER, qui gèrent tous les sites.
export async function agentHasWorkedAtSite(userId: string, siteId: string): Promise<boolean> {
  const assignment = await prisma.assignment.findFirst({
    where: { userId, shift: { siteId } },
    select: { id: true },
  });
  return assignment !== null;
}
