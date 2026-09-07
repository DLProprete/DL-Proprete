"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitDevisRequest, type DevisFormState } from "@/server/contact-actions";

const TYPES_LOCAL = ["Bureaux", "Copropriété", "Industriel / entrepôt", "Commerce", "Autre"];
const FREQUENCES = ["Ponctuel", "Hebdomadaire", "Plusieurs fois par semaine", "Mensuel", "Autre"];

const FIELD_CLASS =
  "mt-1 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40";

const initialState: DevisFormState = { status: "idle" };

export function DevisForm({ defaultCommune }: { defaultCommune?: string }) {
  const [state, formAction, pending] = useActionState(submitDevisRequest, initialState);

  if (state.status === "ok") {
    return (
      <div className="rounded-2xl border border-accent/20 bg-surface-mint p-6 text-sm">
        <p className="font-semibold text-brand">Merci, votre demande est bien envoyée.</p>
        <p className="mt-1 text-foreground/60">Nous revenons vers vous sous 24 h ouvrées.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="hidden" aria-hidden="true">
        <label htmlFor="societe_site">Ne pas remplir ce champ</label>
        <input id="societe_site" name="societe_site" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom" name="nom" required />
        <Field label="Société" name="societe" />
        <Field label="E-mail" name="email" type="email" required />
        <Field label="Téléphone" name="telephone" type="tel" />
        <Field label="Commune" name="commune" required defaultValue={defaultCommune} />
        <SelectField label="Type de local" name="typeLocal" options={TYPES_LOCAL} />
        <Field label="Surface approximative" name="surface" placeholder="ex. 300 m²" />
        <SelectField label="Fréquence souhaitée" name="frequence" options={FREQUENCES} />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-brand">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Contraintes d'accès, horaires souhaités, particularités du site..."
          className={FIELD_CLASS}
        />
      </div>

      <label className="flex items-start gap-2 text-xs text-foreground/60">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        <span>
          J&apos;accepte que ces informations soient utilisées par DL Propreté pour traiter ma
          demande de devis, conformément à notre{" "}
          <Link href="/politique-confidentialite" className="underline hover:text-brand">
            politique de confidentialité
          </Link>
          .
        </span>
      </label>

      {state.status === "error" && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-accent-dark px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-darker disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "Envoi..." : "Envoyer la demande"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-brand">
        {label}
        {required && " *"}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={FIELD_CLASS}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-brand">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue=""
        className={FIELD_CLASS}
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
