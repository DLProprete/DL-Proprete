"use server";

import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { generateMonthlyInvoices } from "@/server/billing/generate-invoices";
import { describeCoverageWarning } from "@/server/billing/planned-hours";
import { addAdhocLine, issueInvoice, markInvoiceReminded, recordPayment } from "@/server/billing/actions";

export async function generateInvoicesAction(formData: FormData) {
  const user = await requireSession();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const result = await generateMonthlyInvoices(user, year, month);
  revalidatePath("/invoices");

  // Les brouillons suspects (planning incomplet, ecart au volume contractuel)
  // remontent a l'ecran : une facture minoree ne doit jamais passer
  // silencieusement de la generation a l'emission.
  const alerts = result.warnings.flatMap((entry) =>
    entry.warnings.map((warning) => `${entry.contractReference} — ${describeCoverageWarning(warning)}`),
  );
  // "Déjà facturé pour cette période" est le fonctionnement normal d'une
  // relance de génération, pas une anomalie : on ne le remonte pas.
  const skipped = result.skipped
    .filter((entry) => !entry.reason.startsWith("Déjà facturé"))
    .map((entry) => entry.reason);
  const messages = [...alerts, ...skipped];
  if (messages.length > 0) {
    redirect(`/invoices?alerte=${encodeURIComponent(messages.join("|"))}`);
  }
  redirect("/invoices");
}

export async function issueInvoiceAction(invoiceId: string) {
  const user = await requireSession();
  await issueInvoice(user, invoiceId);
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function addAdhocLineAction(invoiceId: string, formData: FormData) {
  const user = await requireSession();
  try {
    await addAdhocLine(user, invoiceId, Object.fromEntries(formData));
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Données invalides.";
      redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function recordPaymentAction(invoiceId: string, formData: FormData) {
  const user = await requireSession();
  try {
    await recordPayment(user, invoiceId, Object.fromEntries(formData));
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Données invalides.";
      redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}`);
}

export async function markInvoiceRemindedAction(invoiceId: string, formData: FormData) {
  const user = await requireSession();
  try {
    await markInvoiceReminded(user, invoiceId, Object.fromEntries(formData));
  } catch (error) {
    if (error instanceof ZodError) {
      redirect(`/invoices/reminders?error=${encodeURIComponent(error.issues[0]?.message ?? "Données invalides.")}`);
    }
    throw error;
  }
  revalidatePath("/invoices/reminders");
}
