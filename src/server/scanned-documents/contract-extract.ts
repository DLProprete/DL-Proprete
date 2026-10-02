// Reconnaissance des contrats papier à partir du texte OCR : type de pièce et
// suggestions de champs. Tout est « meilleur effort » et passe en relecture
// humaine — mieux vaut ne rien proposer qu'une valeur fausse (même règle
// que l'extraction des factures dans ocr.ts).
import { dateOnlyUTC } from "@/lib/dates";

export type DocumentType = "FACTURE" | "CONTRAT" | "AUTRE";

export type ContractSuggestion = {
  clientId: string | null;
  clientNameRaw: string | null;
  signedOn: Date | null;
  contractStartsOn: Date | null;
  contractEndsOn: Date | null;
  tacitRenewal: boolean | null;
  noticeDays: number | null;
  pricing: string | null;
  siteAddresses: string | null;
};

// Minuscules sans accents : l'OCR perd souvent les accents (« fevrier »).
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const CONTRACT_SIGNALS = [
  /contrat/g,
  /prestations? de nettoyage/g,
  /entre les soussignes/g,
  /ci-?apres (?:denomme|designe)/g,
  /reconduction/g,
  /resiliation/g,
  /preavis/g,
  /duree/g,
  /article \d/g,
  /fait a .{1,40}, le/g,
  /en deux exemplaires/g,
];
const INVOICE_SIGNALS = [/facture/g, /total ttc/g, /net a payer/g, /montant ht/g, /\btva\b/g, /echeance/g];

const count = (text: string, patterns: RegExp[]) =>
  patterns.reduce((sum, pattern) => sum + (text.match(pattern)?.length ?? 0), 0);

export function classifyDocument(text: string): DocumentType {
  const normalized = normalize(text);
  const contract = count(normalized, CONTRACT_SIGNALS);
  const invoice = count(normalized, INVOICE_SIGNALS);
  if (contract >= 4 && contract > invoice) return "CONTRAT";
  if (invoice >= 2) return "FACTURE";
  return contract >= 4 ? "CONTRAT" : "AUTRE";
}

const MONTHS: Record<string, number> = {
  janvier: 1, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7,
  aout: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12,
};
const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8,
  neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, trente: 30, soixante: 60,
};

const DATE = String.raw`(\d{1,2})(?:er)?[\s./-]+(\d{1,2}|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)[\s./-]+(\d{2,4})`;

function toDate(day: string, month: string, year: string): Date | null {
  const m = /^\d+$/.test(month) ? Number(month) : MONTHS[month];
  let y = Number(year);
  if (year.length === 2) y += y >= 70 ? 1900 : 2000;
  const d = Number(day);
  if (!m || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) return null;
  const date = dateOnlyUTC(y, m, d);
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null; // rejette le 31/02
}

function dateAfter(normalized: string, cue: string): Date | null {
  const match = normalized.match(new RegExp(`${cue}[^\\d]{0,25}${DATE}`));
  return match ? toDate(match[1], match[2], match[3]) : null;
}

function parseCount(token: string): number | null {
  const cleaned = token.replace(/[()]/g, "").trim();
  if (/^\d+$/.test(cleaned)) return Number(cleaned);
  return NUMBER_WORDS[cleaned.replace(/[\s-]+/g, "_")] ?? null;
}

// « 3 ans », « deux (2) ans » — l'OCR colle souvent la parenthèse à l'unité :
// « deux (2)ans ».
const COUNT_UNIT = String.raw`([a-z0-9-]+)(?:\s*\((\d+)\)\s*|\s+)`;

// « pour une durée d'un an », « de douze (12) mois », « de 3 ans »
function durationMonths(normalized: string): number | null {
  const match = normalized.match(new RegExp(`duree\\s+(?:initiale\\s+)?(?:de|d'|d’)\\s*${COUNT_UNIT}(an|ans|annee|annees|mois)\\b`));
  if (!match) return null;
  const amount = Number(match[2]) || parseCount(match[1]);
  if (!amount) return null;
  return match[3] === "mois" ? amount : amount * 12;
}

function addMonthsMinusOneDay(start: Date, months: number): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, start.getUTCDate() - 1));
}

function noticeDays(normalized: string): number | null {
  // Jusqu'à 15 caractères de bruit (traits, bords de cadre, retour à la ligne)
  // entre « préavis » et « de ».
  const match = normalized.match(new RegExp(`preavis[^a-z0-9]{1,15}(?:minimum\\s+)?(?:de|d'|d’)\\s*${COUNT_UNIT}(mois|jours?)\\b`));
  if (!match) return null;
  const amount = Number(match[2]) || parseCount(match[1]);
  if (!amount) return null;
  return match[3] === "mois" ? amount * 30 : amount;
}

function tacitRenewal(normalized: string): boolean | null {
  if (/(sans|pas de|aucune) (?:tacite )?reconduction|ne (?:sera|pourra) pas (?:etre )?(?:reconduit|renouvele)/.test(normalized)) return false;
  if (/tacite(?:ment)? reconduction|reconduit(?:e)? tacitement|renouvele(?:e)? (?:par )?tacite|tacitement (?:reconduit|renouvele)/.test(normalized)) return true;
  return null;
}

// Phrase contenant un montant en euros, sur le texte d'origine (accents
// conservés pour l'affichage). La virgule décimale est souvent lue « ; » ou « . ».
function pricing(text: string): string | null {
  const match = text.match(/[^.\n]{0,60}\d[\d\s.]*[,;.]\d{2}\s*(?:€|euros?)(?:\s*(?:HT|H\.T\.|TTC))?[^.\n]{0,40}/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : null;
}

const STREET = String.raw`\d{1,4}(?:\s?(?:bis|ter))?,?\s+(?:rue|avenue|av\.|boulevard|bd|place|chemin|allee|allée|impasse|route|quai|cours|square|residence|résidence)\b[^\n,]{2,60}?,?\s+\d{5}\s+[A-ZÉÈa-zéèêç' -]{2,40}`;

function siteAddresses(text: string, excluded: string[]): string | null {
  const excludedNormalized = excluded.map(normalize);
  const found = new Set<string>();
  for (const match of text.matchAll(new RegExp(STREET, "gi"))) {
    const address = match[0].replace(/\s+/g, " ").trim();
    if (!excludedNormalized.some((e) => normalize(address).includes(e))) found.add(address);
  }
  return found.size ? [...found].join("\n") : null;
}

const OWN_NAME = "dl proprete";

function clientNameRaw(text: string): string | null {
  for (const match of text.matchAll(/(?:la soci[ée]t[ée]|le syndicat[^,\n]{0,40}|le cabinet|la r[ée]sidence|l'association|l’association|l'entreprise|l’entreprise)\s+([A-Z0-9«"][^,\n]{2,60})/gi)) {
    const name = match[1].replace(/[«»"]/g, "").trim();
    if (!normalize(name).includes(OWN_NAME)) return name;
  }
  return null;
}

export function suggestContractFields(
  text: string,
  clients: { id: string; legalName: string; tradeName: string | null }[],
  ownAddress = "3 rue de Verdun",
): ContractSuggestion {
  const normalized = normalize(text);
  const client = clients.find((c) =>
    [c.legalName, c.tradeName].some((name) => name && name.length > 2 && normalized.includes(normalize(name))),
  );
  const start =
    dateAfter(normalized, "(?:prend(?:ra)? effet|a compter du|a partir du|date de (?:debut|prise d'effet)|commencer[a-z]* le)");
  const explicitEnd = dateAfter(normalized, "(?:jusqu'au|jusqu’au|se termine[a-z]* le|date de (?:fin|echeance)|expire[a-z]* le)");
  const months = durationMonths(normalized);
  return {
    clientId: client?.id ?? null,
    clientNameRaw: client ? client.legalName : clientNameRaw(text),
    signedOn: dateAfter(normalized, "fait a [a-z' -]{2,30},?\\s*le"),
    contractStartsOn: start,
    contractEndsOn: explicitEnd ?? (start && months ? addMonthsMinusOneDay(start, months) : null),
    tacitRenewal: tacitRenewal(normalized),
    noticeDays: noticeDays(normalized),
    pricing: pricing(text),
    siteAddresses: siteAddresses(text, [ownAddress]),
  };
}

// « En cours » si la date de fin n'est pas passée, ou si le contrat se
// reconduit tacitement (à vérifier : une résiliation n'apparaît pas sur le scan).
// Sans date de fin, on ne sait rien : « dates à compléter ».
export function contractState(endsOn: Date | null, renews: boolean | null, today = new Date()): "EN_COURS" | "RECONDUIT" | "TERMINE" | "INCONNU" {
  if (!endsOn) return "INCONNU";
  if (endsOn >= dateOnlyUTC(today.getFullYear(), today.getMonth() + 1, today.getDate())) return "EN_COURS";
  return renews ? "RECONDUIT" : "TERMINE";
}
