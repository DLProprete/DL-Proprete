"use client";

import { useFormStatus } from "react-dom";

export function SendPortalLinkButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-secondary" disabled={pending}>
      {pending ? "Envoi en cours…" : "Envoyer un lien d'accès à l'espace client"}
    </button>
  );
}
