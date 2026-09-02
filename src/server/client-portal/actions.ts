import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/server/auth/session";
import { createPortalToken } from "./tokens";
import { sendEmail } from "@/lib/email";

const MANAGE_ROLES = ["ADMIN", "PLANNER"] as const;

export class ClientEmailMissingError extends Error {}

export async function sendPortalLink(user: SessionUser, clientId: string): Promise<void> {
  requireRole(user, [...MANAGE_ROLES]);
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) throw new Error("Client introuvable");
  if (!client.email) throw new ClientEmailMissingError("Ce client n'a pas d'adresse e-mail renseignée");

  const token = await createPortalToken(clientId);
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/api/client-portal/verify?token=${token}`;

  await sendEmail({
    to: client.email,
    subject: "Votre accès à l'espace client DL Propreté",
    html: `
      <p>Bonjour,</p>
      <p>Voici votre lien d'accès à l'espace client DL Propreté (valable 15 minutes) :</p>
      <p><a href="${link}">${link}</a></p>
      <p>Vous y retrouverez vos factures.</p>
    `,
  });
}
