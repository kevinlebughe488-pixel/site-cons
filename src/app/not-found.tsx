import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap page" style={{ maxWidth: 640 }}>
      <div className="panel empty">
        <h1 style={{ fontSize: "2.2rem" }}>Page introuvable</h1>
        <p className="muted" style={{ marginTop: 10 }}>
          Cette page n&apos;existe pas, ou elle n&apos;est pas visible avec votre compte.
        </p>
        <p style={{ marginTop: 18 }}>
          <Link className="btn btn-primary" href="/campagnes">
            Voir les campagnes
          </Link>
        </p>
      </div>
    </div>
  );
}
