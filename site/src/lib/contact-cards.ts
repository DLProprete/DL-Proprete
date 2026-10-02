import { business, site } from "./business";

// Fiches imprimées sur les cartes de visite (QR code → /c/<slug>). Le slug est
// gravé dans les QR déjà imprimés : ne jamais le renommer ni le supprimer.
// Modifier les autres champs puis redéployer suffit à mettre la carte à jour.
export const contactCards = [
  {
    slug: "cassandre",
    firstName: "Cassandre",
    lastName: "Lemière",
    title: "Gérante",
    services: "Nettoyage de bureaux, locaux professionnels et industriels, parties communes",
    zone: "Caen et Calvados",
    email: "cassandre@dlproprete.fr",
    phone: business.phone,
  },
] as const;

export type ContactCard = (typeof contactCards)[number];

export function getContactCard(slug: string): ContactCard | undefined {
  return contactCards.find((card) => card.slug === slug);
}

const toIntlPhone = (phone: string) => `+33${phone.replace(/\s/g, "").slice(1)}`;

// RFC 2426 : virgule, point-virgule et antislash sont des séparateurs en vCard.
const esc = (value: string) => value.replace(/[\\,;]/g, (c) => `\\${c}`);

// vCard 3.0 : la version lue sans surprise par iOS et Android.
export function toVCard(card: ContactCard): string {
  const { street, postalCode, city } = business.address;
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(card.lastName)};${esc(card.firstName)};;;`,
    `FN:${esc(`${card.firstName} ${card.lastName}`)}`,
    `ORG:${esc(business.name)}`,
    `TITLE:${esc(card.title)}`,
    `TEL;TYPE=WORK,VOICE:${toIntlPhone(card.phone)}`,
    `EMAIL;TYPE=INTERNET,WORK:${card.email}`,
    `ADR;TYPE=WORK:;;${esc(street)};${esc(city)};;${postalCode};France`,
    `URL:${site.url}`,
    `NOTE:${esc(`${card.services}. Zone d'intervention : ${card.zone}.`)}`,
    "END:VCARD",
    "",
  ].join("\r\n");
}
