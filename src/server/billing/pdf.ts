import PDFDocument from "pdfkit";
import type { CompanyProfile, Prisma } from "@prisma/client";
import {
  clientIdentityLines,
  companyProfileToLegalIdentity,
  paymentTermsLines,
  sellerIdentityLines,
  serviceDescriptionLine,
} from "./legal-mentions";

type InvoiceForPdf = Prisma.InvoiceGetPayload<{
  include: { client: true; lines: true };
}>;

export async function generateInvoicePdf(
  invoice: InvoiceForPdf,
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
  doc
    .fontSize(14)
    .text(invoice.status === "DRAFT" ? "BROUILLON" : `Facture ${invoice.number}`, { align: "right" });
  doc
    .fontSize(9)
    .text(invoice.issuedOn ? `Date d'émission : ${formatDate(invoice.issuedOn)}` : "Non émise", {
      align: "right",
    })
    .text(invoice.dueOn ? `Échéance : ${formatDate(invoice.dueOn)}` : "", { align: "right" });

  doc.moveDown(1);
  doc.fontSize(11).text(invoice.client.legalName);
  doc.fontSize(9);
  for (const line of clientIdentityLines(invoice.client)) {
    doc.text(line);
  }

  const periodLine = serviceDescriptionLine(invoice.periodYear, invoice.periodMonth);
  if (periodLine) {
    doc.moveDown(0.8);
    doc.text(periodLine);
  }

  doc.moveDown(2);
  const tableTop = doc.y;
  doc.fontSize(9).font("Helvetica-Bold");
  doc.text("Désignation", 50, tableTop, { width: 220 });
  doc.text("Qté", 280, tableTop, { width: 60, align: "right" });
  doc.text("PU HT", 340, tableTop, { width: 70, align: "right" });
  doc.text("TVA", 410, tableTop, { width: 50, align: "right" });
  doc.text("Total HT", 460, tableTop, { width: 90, align: "right" });
  doc.moveDown(0.5);
  doc
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .stroke();
  doc.font("Helvetica");

  for (const line of invoice.lines) {
    const y = doc.y + 4;
    const lineHT = Number(line.quantity) * Number(line.unitPriceHT);
    doc.text(line.label, 50, y, { width: 220 });
    doc.text(Number(line.quantity).toFixed(2), 280, y, { width: 60, align: "right" });
    doc.text(`${Number(line.unitPriceHT).toFixed(2)} €`, 340, y, { width: 70, align: "right" });
    doc.text(`${Number(line.vatRate).toFixed(0)} %`, 410, y, { width: 50, align: "right" });
    doc.text(`${lineHT.toFixed(2)} €`, 460, y, { width: 90, align: "right" });
    doc.moveDown(1.2);
  }

  doc
    .moveTo(50, doc.y)
    .lineTo(550, doc.y)
    .stroke();
  doc.moveDown(0.5);

  doc.font("Helvetica-Bold");
  doc.text(`Total HT : ${Number(invoice.amountHT).toFixed(2)} €`, { align: "right" });
  doc.text(`TVA : ${Number(invoice.vatAmount).toFixed(2)} €`, { align: "right" });
  doc.text(`Total TTC : ${Number(invoice.amountTTC).toFixed(2)} €`, { align: "right" });

  doc.moveDown(2);
  doc.font("Helvetica").fontSize(8);
  doc.text(
    "Facturation en régie au prévu : heures d'agent planifiées du mois × tarif horaire du contrat.",
    50,
    doc.y,
    { width: 500, align: "left" },
  );
  doc.moveDown(0.5);
  for (const line of paymentTermsLines(identity, invoice.client.paymentTermDays)) {
    doc.text(line, 50, doc.y, { width: 500, align: "left" });
  }
  if (company.iban) {
    doc.moveDown(0.5);
    doc.text(`Règlement par virement — IBAN : ${company.iban}`, 50, doc.y, { width: 500 });
  }

  doc.end();
  return done;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC" }).format(date);
}
