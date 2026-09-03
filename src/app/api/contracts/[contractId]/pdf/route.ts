import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/session";
import { generateContractPdf } from "@/server/contracts/pdf";
import { getCompanyProfile } from "@/server/settings/queries";

const MANAGE_ROLES = ["ADMIN", "PLANNER"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const { contractId } = await params;
  const user = await requireSession();
  if (!MANAGE_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { client: true, contractSites: { include: { site: true } } },
  });
  if (!contract) {
    return NextResponse.json({ error: "Contrat introuvable" }, { status: 404 });
  }

  const company = await getCompanyProfile();
  const pdf = await generateContractPdf(contract, company);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${contract.reference}.pdf"`,
    },
  });
}
