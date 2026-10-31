"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Affichée à la place de la page quand un chargement échoue (réseau lent,
 * base momentanément injoignable…). L'en-tête et le pied de page restent
 * visibles, et le visiteur peut réessayer sans recharger tout le site.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="wrap page" style={{ maxWidth: 640 }}>
      <div className="panel empty">
        <h1 style={{ fontSize: "2.2rem" }}>Un souci de chargement</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          La page n&apos;a pas pu s&apos;afficher, souvent à cause d&apos;une connexion instable. Vos données ne sont pas
          perdues : réessayez dans un instant.
        </p>
        <p style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button className="btn btn-primary" type="button" onClick={() => reset()}>
            Réessayer
          </button>
          <Link className="btn btn-ghost" href="/">
            Retour à l&apos;accueil
          </Link>
        </p>
        {error.digest ? <p className="small muted" style={{ marginTop: 14 }}>Référence : {error.digest}</p> : null}
      </div>
    </div>
  );
}
