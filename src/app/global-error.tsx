"use client";

// Dernier filet : la mise en page racine elle-même a planté. Remplace tout
// le document, sans les styles globaux — d'où les styles en ligne.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", color: "#243746", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 24 }}>
        <title>DL Propreté — erreur</title>
        <div style={{ maxWidth: 360, textAlign: "center" }}>
          <h1 style={{ fontSize: 18 }}>Une erreur est survenue</h1>
          <p style={{ fontSize: 14 }}>L&apos;application n&apos;a pas pu s&apos;afficher. Réessayez dans un instant.</p>
          {error.digest && <p style={{ fontSize: 12, opacity: 0.7 }}>Référence : {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{ background: "#243746", color: "#fff", border: 0, borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
