import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { DEFAULT_DISPLAY_PREFS } from "@/lib/display-prefs";
import { getDisplayPrefs, requireSession } from "@/server/auth/session";
import { updateDisplayPrefsAction } from "./actions";

const TEXT_SIZES = [
  { value: "NORMAL", label: "Normal", className: "text-base" },
  { value: "LARGE", label: "Grand", className: "text-lg" },
  { value: "XLARGE", label: "Très grand", className: "text-xl" },
] as const;

const OPTIONS = [
  {
    name: "contrast",
    label: "Contraste renforcé",
    description: "Textes plus foncés et bordures marquées, pour la lecture en plein soleil.",
  },
  {
    name: "reducedMotion",
    label: "Mouvements réduits",
    description: "Supprime les animations. Le réglage du téléphone est aussi respecté.",
  },
  {
    name: "dyslexicFont",
    label: "Police dyslexie",
    description: "Police OpenDyslexic, plus lisible pour certaines personnes dyslexiques.",
  },
] as const;

// Page commune à tous les rôles : hors des groupes de routes, donc sans layout
// de rôle ; l'en-tête marine est posé ici.
export default async function DisplayPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const user = await requireSession().catch(() => null);
  if (!user) {
    redirect("/login");
  }
  const prefs = (await getDisplayPrefs()) ?? DEFAULT_DISPLAY_PREFS;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-brand-50">
      <header className="flex items-center justify-between gap-4 bg-brand-700 px-6 py-3">
        <Logo tone="blanc" className="h-5" />
        <Link
          href="/"
          className="inline-flex min-h-[var(--tap-min)] items-center rounded px-2 text-sm text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-white"
        >
          ← Retour
        </Link>
      </header>
      <main className="app-main mx-auto w-full max-w-lg flex-1 space-y-4 px-6 py-6">
        <h1 className="text-xl font-semibold">Mon affichage</h1>
        {saved === "1" && (
          <p role="status" className="alert alert-info">
            Réglages enregistrés.
          </p>
        )}
        <form action={updateDisplayPrefsAction} className="space-y-4">
          <input type="hidden" name="theme" value={prefs.theme} />

          <fieldset className="card">
            <legend className="px-1 text-sm font-medium text-zinc-700">Taille du texte</legend>
            {TEXT_SIZES.map((size) => (
              <div key={size.value} className="flex items-center gap-3">
                <input
                  type="radio"
                  id={`textSize-${size.value}`}
                  name="textSize"
                  value={size.value}
                  defaultChecked={prefs.textSize === size.value}
                  className="h-5 w-5 shrink-0"
                />
                <label
                  htmlFor={`textSize-${size.value}`}
                  className={`flex min-h-[var(--tap-min)] flex-1 cursor-pointer items-center ${size.className}`}
                >
                  {size.label}
                </label>
              </div>
            ))}
          </fieldset>

          {OPTIONS.map((option) => (
            <div key={option.name} className="card flex items-start gap-3">
              <input
                type="checkbox"
                id={option.name}
                name={option.name}
                defaultChecked={prefs[option.name]}
                className="mt-3 h-5 w-5 shrink-0"
              />
              <label htmlFor={option.name} className="block min-h-[var(--tap-min)] flex-1 cursor-pointer py-2">
                <span className="block font-medium">{option.label}</span>
                <span className="block text-sm text-zinc-600">{option.description}</span>
              </label>
            </div>
          ))}

          <button type="submit" className="btn btn-primary btn-field">
            Enregistrer
          </button>
        </form>
      </main>
    </div>
  );
}
