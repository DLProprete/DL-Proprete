"use server";

import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { generateMonthlyInvoices } from "@/server/billing/generate-invoices";
import { addAdhocLine, issueInvoice, recordPayment } from "@/server/billing/actions";

export async function generateInvoicesAction(formData: FormData) {
  const user = await requireSession();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await generateMonthlyInvoices(user, year, month);
  revalidatePath("/invoices");
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
