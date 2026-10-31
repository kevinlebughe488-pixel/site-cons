"use client";

/** Dernier recours, si l'en-tête ou la mise en page elle-même ne peut pas s'afficher. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, background: "#f6f4ee", color: "#1b1f1c" }}>
        <div style={{ maxWidth: 560, margin: "12vh auto", padding: "0 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.8rem" }}>Tribune est momentanément indisponible</h1>
          <p style={{ color: "#5c645e", lineHeight: 1.5 }}>
            Le site n&apos;a pas pu se charger, souvent à cause d&apos;une connexion instable. Réessayez dans un instant.
          </p>
          <p style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ background: "#1d5237", color: "#fff", border: 0, borderRadius: 10, padding: "12px 20px", fontWeight: 700, cursor: "pointer" }}
            >
              Réessayer
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ padding: "12px 20px", color: "#1d5237", fontWeight: 700 }}>
              Accueil
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
