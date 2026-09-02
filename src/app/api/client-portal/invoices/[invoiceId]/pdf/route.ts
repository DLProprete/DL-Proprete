import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClientSession } from "@/server/client-portal/session";
import { generateInvoicePdf } from "@/server/billing/pdf";
import { getCompanyProfile } from "@/server/settings/queries";

export async function GET(_request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const session = await requireClientSession().catch(() => null);
  if (!session) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: true, lines: true },
  });
  // Meme reponse (404) que la facture soit inexistante ou appartienne a un
  // autre client — ne pas confirmer l'existence d'une facture qu'on n'a pas
  // le droit de voir.
  if (!invoice || invoice.clientId !== session.clientId || invoice.status === "DRAFT") {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }

  const company = await getCompanyProfile();
  const pdf = await generateInvoicePdf(invoice, company);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.number ?? "brouillon"}.pdf"`,
    },
  });
}
