"use client";

// Coche/décoche toutes les cases `name={targetName}` du formulaire englobant.
// Pas d'état React : la source de vérité reste les checkboxes du DOM (déjà
// nécessaire pour que le Server Action lise `formData.getAll(targetName)`).
export function SelectAllCheckbox({ targetName }: { targetName: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Tout sélectionner"
      className="h-4 w-4"
      onChange={(event) => {
        const form = event.currentTarget.form;
        if (!form) return;
        const boxes = form.querySelectorAll<HTMLInputElement>(`input[name="${targetName}"]`);
        boxes.forEach((box) => {
          box.checked = event.currentTarget.checked;
        });
      }}
    />
  );
}
