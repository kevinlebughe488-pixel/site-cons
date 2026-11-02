import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { navigationFor } from "@/lib/navigation";

export async function Footer() {
  const nav = navigationFor(await getViewer());
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="logo" style={{ marginBottom: 10 }}>
              Tribune
            </div>
            <p style={{ opacity: 0.85, maxWidth: "28em" }}>{nav.footerBlurb}</p>
          </div>
          {nav.footer.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              {col.links.map((l) => (
                <Link key={l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="legal">
          Tribune est une plateforme de Plumes Capital, société par actions simplifiée de droit OHADA (RDC). Plumes
          Capital organise la mise en relation entre les clubs et leurs supporters : elle ne reçoit pas de dépôts du
          public, ne prête pas et n&apos;investit pas pour son propre compte. Les paiements Mobile Money sont encaissés
          par un prestataire agréé (pawaPay) et chaque contribution est tracée. Commission de 5&nbsp;% sur les fonds
          collectés, affichée avant chaque paiement.
          <div className="legal-links">
            <Link href="/conditions">Conditions d&apos;utilisation</Link> · <Link href="/confidentialite">Confidentialité et cookies</Link> ·{" "}
            <Link href="/conditions#mentions-legales">Mentions légales</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
