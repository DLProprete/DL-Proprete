"use client";

import { useState, type ReactNode } from "react";

type DocumentType = "FACTURE" | "CONTRAT" | "AUTRE";

// Bascule entre les champs facture et contrat sans perdre la saisie : la
// section masquée reste dans le formulaire (hidden), le serveur n'applique
// les champs contrat que si le type validé est CONTRAT.
export function DocumentTypeSections({
  initialType,
  invoiceFields,
  contractFields,
}: {
  initialType: DocumentType;
  invoiceFields: ReactNode;
  contractFields: ReactNode;
}) {
  const [type, setType] = useState<DocumentType>(initialType);
  return (
    <>
      <div>
        <label htmlFor="documentType" className="block text-sm text-zinc-700">
          Type de document
        </label>
        <select
          id="documentType"
          name="documentType"
          value={type}
          onChange={(event) => setType(event.target.value as DocumentType)}
          className="mt-1 w-full field"
        >
          <option value="FACTURE">Facture</option>
          <option value="CONTRAT">Contrat</option>
          <option value="AUTRE">Autre</option>
        </select>
      </div>
      <div hidden={type === "CONTRAT"} className="space-y-4">
        {invoiceFields}
      </div>
      <div hidden={type !== "CONTRAT"} className="space-y-4">
        {contractFields}
      </div>
    </>
  );
}
