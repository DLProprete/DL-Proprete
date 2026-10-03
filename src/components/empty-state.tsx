import { BatimentIcon, IndustrielIcon, InterventionIcon, ProduitsIcon } from "./brand-icons";

const ICONS = {
  batiment: BatimentIcon,
  industriel: IndustrielIcon,
  produits: ProduitsIcon,
  intervention: InterventionIcon,
};

// Écran vide : un pictogramme métier marine plutôt qu'une ligne grise.
export function EmptyState({ icon, children }: { icon: keyof typeof ICONS; children: React.ReactNode }) {
  const Icon = ICONS[icon];
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center text-sm text-zinc-600">
      <Icon className="h-8 w-8 text-brand-700" />
      <p>{children}</p>
    </div>
  );
}
