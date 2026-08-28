"use server";

import { ZodError } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/server/auth/session";
import { createContract, ContractOverlapError } from "@/server/contracts/actions";
import { createServiceTemplate, setServiceTemplateActive } from "@/server/service-templates/actions";

export async function createContractAction(formData: FormData) {
  const user = await requireSession();
  let contractId: string;
  try {
    const contract = await createContract(user, Object.fromEntries(formData));
    contractId = contract.id;
  } catch (error) {
    if (error instanceof ContractOverlapError) {
      const params = new URLSearchParams({ error: "overlap" });
      redirect(`/contracts/new?${params.toString()}`);
    }
    throw error;
  }
  revalidatePath("/contracts");
  redirect(`/contracts/${contractId}`);
}

export async function createServiceTemplateAction(formData: FormData) {
  const user = await requireSession();
  const contractId = String(formData.get("contractId") ?? "");

  try {
    await createServiceTemplate(user, {
      contractId,
      name: formData.get("name"),
      daysOfWeek: formData.getAll("daysOfWeek"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      durationMinutes: formData.get("durationMinutes"),
      requiredAgents: formData.get("requiredAgents"),
      instructions: formData.get("instructions"),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      const message = error.issues[0]?.message ?? "Données invalides.";
      redirect(`/contracts/${contractId}?error=${encodeURIComponent(message)}`);
    }
    throw error;
  }

  revalidatePath(`/contracts/${contractId}`);
  redirect(`/contracts/${contractId}`);
}

export async function setServiceTemplateActiveAction(
  contractId: string,
  id: string,
  isActive: boolean,
) {
  const user = await requireSession();
  await setServiceTemplateActive(user, id, isActive);
  revalidatePath(`/contracts/${contractId}`);
}
