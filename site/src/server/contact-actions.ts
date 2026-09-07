"use server";

import { sendEmail } from "@/lib/email";
import { business } from "@/lib/business";

export type DevisFormState = { status: "idle" | "ok" | "error"; error?: string };

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

// email/commune finissent dans des en-têtes SMTP (replyTo, subject) : un \r\n
// injecté par un client qui contourne le navigateur permettrait d'ajouter des
// en-têtes arbitraires (header injection). On les réduit à une seule ligne.
function stripCrLf(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function submitDevisRequest(
  _prev: DevisFormState,
  formData: FormData,
): Promise<DevisFormState> {
  // Honeypot : un humain ne voit ni ne remplit ce champ (masqué en CSS).
  if (field(formData, "societe_site")) {
    return { status: "ok" };
  }

  const nom = field(formData, "nom");
  const email = stripCrLf(field(formData, "email"));
  const commune = stripCrLf(field(formData, "commune"));
  const consent = formData.get("consent") === "on";

  if (!nom || !email || !commune) {
    return { status: "error", error: "Nom, e-mail et commune sont obligatoires." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", error: "Adresse e-mail invalide." };
  }
  if (!consent) {
    return {
      status: "error",
      error: "Merci d'accepter l'utilisation de vos données pour traiter la demande.",
    };
  }

  const societe = field(formData, "societe");
  const telephone = field(formData, "telephone");
  const typeLocal = field(formData, "typeLocal");
  const surface = field(formData, "surface");
  const frequence = field(formData, "frequence");
  const message = field(formData, "message");

  const lines: string[] = [`Nom : ${nom}`];
  if (societe) lines.push(`Société : ${societe}`);
  lines.push(`E-mail : ${email}`);
  if (telephone) lines.push(`Téléphone : ${telephone}`);
  lines.push(`Commune : ${commune}`);
  if (typeLocal) lines.push(`Type de local : ${typeLocal}`);
  if (surface) lines.push(`Surface approximative : ${surface}`);
  if (frequence) lines.push(`Fréquence souhaitée : ${frequence}`);
  lines.push("", message || "(pas de message complémentaire)");

  await sendEmail({
    to: business.email,
    replyTo: email,
    subject: `Demande de devis — ${commune}`,
    text: lines.join("\n"),
  });

  return { status: "ok" };
}
