"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth/session";
import { acceptQuoteAndConvert, createQuote, sendQuoteEmail } from "@/server/quotes/actions";

function linesFrom(formData: FormData) {
  const labels = formData.getAll("label").map(String);
  const quantities = formData.getAll("quantity").map(Number);
  const prices = formData.getAll("unitPriceHT").map(Number);
  const rates = formData.getAll("vatRate").map(Number);
  return labels
    .map((label, index) => ({
      label: label.trim(),
      quantity: quantities[index] || 0,
      unitPriceHT: prices[index] || 0,
      vatRate: Number.isFinite(rates[index]) ? rates[index] : 20,
    }))
    .filter((line) => line.label && line.quantity > 0);
}

export async function createQuoteAction(prospectId: string, formData: FormData) {
  const user = await requireSession();
  const lines = linesFrom(formData);
  if (lines.length === 0) redirect(`/prospects/${prospectId}/quotes/new?error=empty`);
  const quote = await createQuote(user, prospectId, {
    notes: String(formData.get("notes") ?? ""),
    validUntil: String(formData.get("validUntil") ?? "") || undefined,
    lines,
  });
  revalidatePath(`/prospects/${prospectId}`);
  redirect(`/quotes/${quote.id}`);
}

export async function sendQuoteAction(quoteId: string) {
  const user = await requireSession();
  await sendQuoteEmail(user, quoteId);
  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}?sent=1`);
}

export async function acceptQuoteAction(quoteId: string) {
  const user = await requireSession();
  const result = await acceptQuoteAndConvert(user, quoteId);
  redirect(`/contracts/${result.contractId}`);
}
