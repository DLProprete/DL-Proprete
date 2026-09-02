// Aucune infrastructure d'envoi n'existe encore dans ce dépôt. Plutôt que
// d'ajouter une dépendance pour un seul appel POST, on parle directement à
// l'API REST de Resend (choisi dans le chantier numérique) via fetch. Sans
// clé configurée (dev local), on journalise à la place — testable de bout
// en bout sans compte externe.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] (RESEND_API_KEY absent, non envoyé)\nÀ : ${to}\nSujet : ${subject}\n${html}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "DL Propreté <no-reply@dlproprete.fr>",
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Échec de l'envoi de l'e-mail (${response.status}) : ${body}`);
  }
}
