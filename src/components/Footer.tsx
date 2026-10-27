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
          Tribune n&apos;est pas une banque : les paiements Mobile Money sont encaissés par un prestataire agréé
          (pawaPay) et la plateforme conserve la trace de chaque contribution. Commission unique de 5 % sur les fonds
          collectés, affichée avant chaque paiement.
        </div>
      </div>
    </footer>
  );
}
