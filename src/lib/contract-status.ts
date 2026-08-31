import type { BadgeTone } from "@/components/badge";

// Extrait de contracts/page.tsx (liste) pour être réutilisé sur la fiche
// contrat aussi (contracts/[contractId]/page.tsx), qui affichait le statut
// en texte brut sans passer par Badge.
export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  ENDED: "Terminé",
};

export const CONTRACT_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  DRAFT: "neutral",
  SUSPENDED: "warning",
  ENDED: "muted",
};
