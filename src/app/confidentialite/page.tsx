import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { ResetCookieChoice } from "@/components/CookieBanner";
import { LEGAL } from "@/lib/legal";
import { formatMoney, KYC_THRESHOLD } from "@/lib/format";

export const metadata: Metadata = { title: "Confidentialité et cookies" };

const COOKIES: [string, string, string, string][] = [
  ["Session de connexion (sb-…-auth-token)", "Vous garder connecté après le code SMS", "Nécessaire", "Durée de la session"],
  ["Vérification par SMS (tribune_verif)", "Retrouver le code en cours de validation", "Nécessaire", "30 minutes"],
  ["Choix des cookies (tribune_cookies)", "Retenir votre réponse au bandeau", "Nécessaire", "12 mois"],
  ["Ambassadeur (tribune_ref)", "Attribuer votre contribution à la personne qui vous a envoyé le lien", "Avec votre accord", "30 jours"],
];

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Confidentialité"
      title="Vos données personnelles et les cookies"
      intro="Ce que Tribune collecte, pourquoi, qui y a accès, combien de temps nous le gardons et comment exercer vos droits."
      sections={[
        {
          title: "Responsable",
          body: (
            <p>
              {LEGAL.company} ({LEGAL.address}). Contact pour vos données : {LEGAL.email}.
            </p>
          ),
        },
        {
          title: "Ce que nous collectons",
          body: (
            <ul>
              <li><b>Votre compte :</b> nom, prénom, téléphone, e-mail, ville et pays, club suivi, date de votre consentement.</li>
              <li><b>Vos contributions :</b> montant, date, campagne, numéro Mobile Money débité, opérateur et références du paiement.</li>
              <li><b>Vérification d&apos;identité</b> au-delà de {formatMoney(KYC_THRESHOLD)} cumulés : le type de pièce et ses 4 derniers caractères seulement.</li>
              <li><b>Pour un club :</b> informations du club, représentant légal, compte de versement et documents du dossier.</li>
              <li><b>Ce que vous publiez :</b> commentaires, nouvelles et messages.</li>
            </ul>
          ),
        },
        {
          title: "Pourquoi",
          body: (
            <p>
              Tenir votre compte et sécuriser la connexion (codes SMS) ; traiter les paiements et les remboursements ;
              retracer les fonds et respecter les obligations de lutte contre le blanchiment ; vérifier les clubs ; vous
              informer des campagnes que vous suivez ; prévenir la fraude. Pas de publicité, pas de revente de données.
            </p>
          ),
        },
        {
          title: "Qui y a accès",
          body: (
            <ul>
              <li>L&apos;équipe Tribune, chacun selon son rôle. Toutes ses décisions sont tracées.</li>
              <li>Le public ne voit jamais votre téléphone ni votre e-mail : le registre affiche votre prénom et l&apos;initiale de votre nom, ou « anonyme ».</li>
              <li>Nos prestataires, pour ce qui les concerne : pawaPay (paiements), Twilio (SMS), Supabase (base de données, Union européenne), Vercel (hébergement, États-Unis). Certains sont hors de RDC.</li>
            </ul>
          ),
        },
        {
          title: "Combien de temps",
          body: (
            <p>
              Votre compte est conservé tant qu&apos;il est actif. Les contributions et les informations de vérification sont
              gardées pendant la durée imposée par les obligations de lutte contre le blanchiment, puis supprimées ou
              anonymisées. Les codes SMS expirent au bout de 10 minutes.
            </p>
          ),
        },
        {
          title: "Vos droits",
          body: (
            <p>
              Vous pouvez consulter et corriger vos informations dans <Link href="/compte">Mon compte</Link>, refuser les
              nouvelles des campagnes, et <b>demander la suppression de votre compte</b> depuis la même page. Les données
              que la loi nous oblige à garder (contributions) sont alors conservées à part, puis effacées à la fin de cette
              durée. Pour toute question : {LEGAL.email}. Tribune est réservée aux personnes de 18 ans ou plus.
            </p>
          ),
        },
        {
          id: "cookies",
          title: "Cookies",
          body: (
            <>
              <p>
                Tribune n&apos;utilise ni cookie publicitaire ni outil de mesure d&apos;audience. Les cookies nécessaires
                font fonctionner la connexion ; le cookie « ambassadeur » n&apos;est déposé qu&apos;avec votre accord.
              </p>
              <div className="tbl-wrap" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Cookie</th>
                      <th>À quoi il sert</th>
                      <th>Type</th>
                      <th>Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COOKIES.map(([name, use, type, length]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td className="small">{use}</td>
                        <td className="small">{type}</td>
                        <td className="small">{length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14 }}>
                <ResetCookieChoice />
              </div>
            </>
          ),
        },
      ]}
    />
  );
}
