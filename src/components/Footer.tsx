import Link from "next/link";

export function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="logo" style={{ marginBottom: 10 }}>
              Tribune
            </div>
            <p style={{ opacity: 0.85, maxWidth: "28em" }}>
              Plateforme de financement participatif des clubs de football par leurs supporters. Chaque campagne est
              vérifiée avant publication et suivie jusqu&apos;à sa clôture.
            </p>
          </div>
          <div>
            <h4>Supporters</h4>
            <Link href="/campagnes">Toutes les campagnes</Link>
            <Link href="/comment-ca-marche">Comment ça marche</Link>
            <Link href="/compte">Mon compte</Link>
          </div>
          <div>
            <h4>Clubs</h4>
            <Link href="/club">Proposer une campagne</Link>
            <Link href="/comment-ca-marche#frais">Frais et règles</Link>
          </div>
          <div>
            <h4>Confiance</h4>
            <Link href="/comment-ca-marche#securite">Sécurité des paiements</Link>
            <Link href="/comment-ca-marche#securite">Données personnelles</Link>
            <Link href="/comment-ca-marche#faq">Réclamations</Link>
          </div>
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
