import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Accès refusé" };

export default function ForbiddenPage() {
  return (
    <div className="wrap page" style={{ maxWidth: 640 }}>
      <div className="panel empty">
        <h1 style={{ fontSize: "2.2rem" }}>Accès refusé</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Votre compte n&apos;a pas les droits nécessaires pour cette page. Si vous pensez que c&apos;est une erreur,
          contactez l&apos;équipe Tribune.
        </p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-primary" href="/">
            Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
