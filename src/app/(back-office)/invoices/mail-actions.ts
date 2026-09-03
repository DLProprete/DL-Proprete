"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import {
  InvoiceClientEmailMissingError,
  InvoiceNotSendableError,
  sendInvoiceByEmail,
  sendInvoiceReminderEmail,
} from "@/server/billing/send-documents";

export async function sendInvoiceEmailAction(invoiceId: string) {
  const user = await requireSession();
  try {
    await sendInvoiceByEmail(user, invoiceId);
  } catch (error) {
    const message =
      error instanceof InvoiceClientEmailMissingError || error instanceof InvoiceNotSendableError
        ? error.message
        : "Envoi impossible.";
    redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/invoices/${invoiceId}`);
  redirect(`/invoices/${invoiceId}?sent=1`);
}

export async function sendInvoiceReminderAction(invoiceId: string) {
  const user = await requireSession();
  try {
    await sendInvoiceReminderEmail(user, invoiceId);
  } catch (error) {
    const message =
      error instanceof InvoiceClientEmailMissingError || error instanceof InvoiceNotSendableError
        ? error.message
        : "Relance impossible.";
    redirect(`/invoices/reminders?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/invoices/reminders");
  redirect("/invoices/reminders?sent=1");
}
