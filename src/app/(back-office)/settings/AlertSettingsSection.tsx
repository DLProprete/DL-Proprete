import { mailFromAddress } from "@/lib/email";
import { alertRecipient } from "@/server/errors/report";

// Réglages non secrets, modifiables sans redéploiement. Les secrets (base,
// mots de passe SMTP, clés) restent dans les variables d'environnement.
export async function AlertSettingsSection({
  action,
  errorAlertEmail,
  mailFromName,
  saved,
  error,
}: {
  action: (formData: FormData) => Promise<void>;
  errorAlertEmail: string | null;
  mailFromName: string | null;
  saved: boolean;
  error?: string;
}) {
  const [recipient, from] = await Promise.all([alertRecipient(), mailFromAddress()]);
  const source = (inApp: string | null) => (inApp ? "réglé ici" : "variable d'environnement");

  return (
    <section id="alertes" className="space-y-3 pt-4">
      <h2 className="text-xl font-semibold">Alertes et e-mails</h2>
      {saved && <p className="alert alert-info">Réglages enregistrés.</p>}
      {error && <p className="alert alert-danger">{error}</p>}
      <form action={action} className="card space-y-4">
        <div>
          <label htmlFor="errorAlertEmail" className="block text-sm text-zinc-700">
            Destinataire des alertes d&apos;erreur
          </label>
          <input
            id="errorAlertEmail"
            name="errorAlertEmail"
            type="email"
            defaultValue={errorAlertEmail ?? ""}
            placeholder="vous@exemple.fr"
            className="mt-1 w-full field"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Un e-mail au plus par heure quand l&apos;outil rencontre une erreur (détail dans Audit). Actuellement :{" "}
            {recipient ? `${recipient} (${source(errorAlertEmail)})` : "aucun envoi"}. Vide = valeur de la variable
            d&apos;environnement.
          </p>
        </div>
        <div>
          <label htmlFor="mailFromName" className="block text-sm text-zinc-700">
            Nom d&apos;expéditeur des e-mails
          </label>
          <input
            id="mailFromName"
            name="mailFromName"
            maxLength={80}
            defaultValue={mailFromName ?? ""}
            placeholder="DL Propreté"
            className="mt-1 w-full field"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Nom affiché aux destinataires (factures, relances, messagerie) ; l&apos;adresse reste celle de la boîte
            e-mail de l&apos;entreprise. Actuellement : {from} ({source(mailFromName)}).
          </p>
        </div>
        <button type="submit" className="btn btn-primary">
          Enregistrer
        </button>
      </form>
    </section>
  );
}
