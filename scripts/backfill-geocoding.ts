import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocoding";

// Backfill ponctuel : les sites et agents créés avant l'ajout du
// géocodage automatique (voir src/server/sites/actions.ts,
// src/server/team/actions.ts) ont une adresse mais pas de coordonnées.
// Resauvegarder leur fiche depuis l'écran ADMIN ne suffit pas : l'action
// évite volontairement de re-géocoder une adresse inchangée. Ce script
// comble ce trou une fois, à la main, avec GOOGLE_MAPS_API_KEY dans
// l'environnement (.env local) — jamais commis, jamais dans le code.
async function main() {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY absente de l'environnement — rien à faire.");
    process.exit(1);
  }

  const sites = await prisma.site.findMany({
    where: { lat: null },
    select: { id: true, name: true, address: true, postalCode: true, city: true },
  });
  console.log(`${sites.length} site(s) sans coordonnées.`);
  for (const site of sites) {
    const coordinates = await geocodeAddress(`${site.address}, ${site.postalCode} ${site.city}`);
    if (coordinates) {
      await prisma.site.update({ where: { id: site.id }, data: coordinates });
      console.log(`✓ ${site.name} → ${coordinates.lat}, ${coordinates.lng}`);
    } else {
      console.log(`✗ ${site.name} — adresse non géocodable`);
    }
  }

  const agents = await prisma.user.findMany({
    where: { role: "AGENT", homeAddress: { not: null }, homeLat: null },
    select: { id: true, firstName: true, lastName: true, homeAddress: true, homePostalCode: true, homeCity: true },
  });
  console.log(`${agents.length} agent(s) avec adresse sans coordonnées.`);
  for (const agent of agents) {
    const coordinates = await geocodeAddress(
      `${agent.homeAddress}, ${agent.homePostalCode ?? ""} ${agent.homeCity ?? ""}`,
    );
    if (coordinates) {
      await prisma.user.update({
        where: { id: agent.id },
        data: { homeLat: coordinates.lat, homeLng: coordinates.lng },
      });
      console.log(`✓ ${agent.firstName} ${agent.lastName} → ${coordinates.lat}, ${coordinates.lng}`);
    } else {
      console.log(`✗ ${agent.firstName} ${agent.lastName} — adresse non géocodable`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
