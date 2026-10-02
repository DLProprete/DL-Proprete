import { Badge, type BadgeTone } from "@/components/badge";
import { contractState } from "@/server/scanned-documents/contract-extract";

const UI: Record<ReturnType<typeof contractState>, { label: string; tone: BadgeTone }> = {
  EN_COURS: { label: "En cours", tone: "success" },
  RECONDUIT: { label: "Reconduit tacitement (à vérifier)", tone: "warning" },
  TERMINE: { label: "Terminé", tone: "muted" },
  INCONNU: { label: "Dates à compléter", tone: "neutral" },
};

export function ContractStateBadge({ endsOn, tacitRenewal }: { endsOn: Date | null; tacitRenewal: boolean | null }) {
  const { label, tone } = UI[contractState(endsOn, tacitRenewal)];
  return <Badge tone={tone} label={label} />;
}
