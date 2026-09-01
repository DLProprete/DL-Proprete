import { prisma } from "@/lib/prisma";

// Valeurs connues (docs/SPEC.md section 1). Le capital social et l'IBAN
// restent a saisir : on ne les invente pas, l'ecran Parametres les signale
// comme manquants tant qu'ils ne sont pas renseignes.
const DEFAULTS = {
  id: "default",
  legalName: "DL PROPRETE",
  address: "3 rue de Verdun, 14460 Colombelles",
  legalForm: "SAS",
  rcsCity: "Caen",
  siret: "531 739 241 00044",
  vatNumber: "FR64 531 739 241",
  reminderWindowDays: 7,
};

export async function getCompanyProfile() {
  return prisma.companyProfile.upsert({
    where: { id: "default" },
    update: {},
    create: DEFAULTS,
  });
}
