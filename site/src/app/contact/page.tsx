import type { Metadata } from "next";
import { Container } from "@/components/container";
import { business } from "@/lib/business";
import { MailIcon, PhoneIcon, PinIcon, SparkleIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez DL Propreté pour une demande de devis de nettoyage professionnel dans le Calvados.",
  alternates: { canonical: "/contact" },
};

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-sm font-semibold text-brand">{label}</p>
        <div className="mt-1 text-foreground/60">{children}</div>
      </div>
    </div>
  );
}

export default function ContactPage() {
  const devisHref = `mailto:${business.email}?subject=${encodeURIComponent(
    "Demande de devis — DL Propreté",
  )}&body=${encodeURIComponent(
    "Bonjour,\n\nJe souhaite obtenir un devis pour :\n- Type de local : \n- Adresse : \n- Fréquence souhaitée : \n\nMerci,\n",
  )}`;

  return (
    <section className="py-16">
      <Container className="grid gap-12 md:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent">
            <SparkleIcon className="h-4 w-4" />
            Contact
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand">
            Parlons de votre projet
          </h1>
          <p className="mt-4 max-w-md text-foreground/60">
            Décrivez-nous votre local et vos besoins par e-mail, nous revenons
            vers vous avec une proposition adaptée.
          </p>
          <a
            href={devisHref}
            className="mt-8 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:-translate-y-0.5 hover:bg-accent-dark"
          >
            Écrire pour un devis
          </a>
        </div>

        <div className="space-y-6 rounded-2xl border border-black/5 bg-surface-muted p-8">
          <InfoRow icon={PinIcon} label="Adresse">
            <address className="not-italic">
              {business.address.street}
              <br />
              {business.address.postalCode} {business.address.city}
            </address>
          </InfoRow>

          <InfoRow icon={MailIcon} label="E-mail">
            <a href={`mailto:${business.email}`} className="hover:text-brand">
              {business.email}
            </a>
          </InfoRow>

          <InfoRow icon={PhoneIcon} label="Téléphone">
            {business.phone ? (
              <a href={`tel:${business.phone}`} className="hover:text-brand">
                {business.phone}
              </a>
            ) : (
              <p>Nous contacter par e-mail, un numéro sera indiqué prochainement.</p>
            )}
          </InfoRow>

          <div className="border-t border-black/5 pt-6">
            <p className="text-sm font-semibold text-brand">
              Zone d&apos;intervention
            </p>
            <p className="mt-1 text-foreground/60">
              {business.serviceArea.join(" · ")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
