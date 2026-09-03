import PDFDocument from "pdfkit";
import type { CompanyProfile, Prisma } from "@prisma/client";
import { clientIdentityLines, companyProfileToLegalIdentity, sellerIdentityLines } from "@/server/billing/legal-mentions";

const BILLING_BASIS_LABELS: Record<string, string> = {
  CALENDAR_SHIFTS: "Au calendrier (heures planifiées du mois)",
  FLAT_INDICATIVE_HOURS: "Forfait mensuel lissé",
};

type ContractForPdf = Prisma.ContractGetPayload<{
  include: { client: true; contractSites: { include: { site: true } } };
}>;

// Document envoye a signer manuellement via l'interface web Yousign (voir
// docs/SPEC.md) : pas de champ de signature integre, juste un contrat
// lisible — le tampon/la signature se posent hors de ce PDF.
export async function generateContractPdf(
  contract: ContractForPdf,
  company: CompanyProfile,
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const identity = companyProfileToLegalIdentity(company);

  doc.fontSize(16).text(company.legalName, { continued: false });
  doc.fontSize(9);
  for (const line of sellerIdentityLines(identity)) {
    doc.text(line);
  }

  doc.moveDown(2);
  doc.fontSize(14).text(`Contrat-cadre ${contract.reference}`, { align: "right" });
  doc
    .fontSize(9)
    .text(
      `Période : ${formatDate(contract.startsOn)} – ${formatDate(contract.endsOn)}`,
      { align: "right" },
    );

  doc.moveDown(1);
  doc.fontSize(11).text(contract.client.legalName);
  doc.fontSize(9);
  for (const line of clientIdentityLines(contract.client)) {
    doc.text(line);
  }

  doc.moveDown(1.5);
  doc.fontSize(9);
  doc.text(`Jour de facturation : le ${contract.billingDayOfMonth} de chaque mois.`);
  doc.text(`Préavis de reconduction : ${contract.renewalNoticeDays} jours.`);
  if (contract.notes) {
    doc.moveDown(0.5);
    doc.text(`Notes : ${contract.notes}`);
  }

  doc.moveDown(2);
  doc.fontSize(11).font("Helvetica-Bold").text("Sites couverts par ce contrat");
  doc.font("Helvetica");

  for (const contractSite of contract.contractSites) {
    doc.moveDown(0.8);
    doc.fontSize(10).font("Helvetica-Bold").text(contractSite.site.name);
    doc.font("Helvetica").fontSize(9);
    doc.text(`${contractSite.site.address}, ${contractSite.site.postalCode} ${contractSite.site.city}`);
    doc.text(
      `Facturation : ${BILLING_BASIS_LABELS[contractSite.billingBasis] ?? contractSite.billingBasis}`,
    );
    doc.text(`Tarif horaire HT : ${Number(contractSite.hourlyRateHT).toFixed(2)} €/h`);
    doc.text(`Taux de TVA : ${Number(contractSite.vatRate).toFixed(0)} %`);
    if (contractSite.indicativeMonthlyHours) {
      doc.text(`Volume mensuel indicatif : ${Number(contractSite.indicativeMonthlyHours).toFixed(2)} h`);
    }
  }

  if (contract.contractSites.length === 0) {
    doc.moveDown(0.5);
    doc.fontSize(9).text("Aucun site pour l'instant.");
  }

  doc.moveDown(3);
  doc.fontSize(8).text(
    "Document à signer manuellement en dehors de cet outil (interface Yousign, ou signature manuscrite).",
    { align: "left" },
  );

  doc.end();
  return done;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(date);
}
