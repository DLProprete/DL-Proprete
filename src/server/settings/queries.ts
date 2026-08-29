import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  id: "default",
  legalName: "DL PROPRETE",
  address: "3 rue de Verdun, 14460 Colombelles",
  siret: "531 739 241 00044",
  vatNumber: "FR64 531 739 241",
};

export async function getCompanyProfile() {
  return prisma.companyProfile.upsert({
    where: { id: "default" },
    update: {},
    create: DEFAULTS,
  });
}
