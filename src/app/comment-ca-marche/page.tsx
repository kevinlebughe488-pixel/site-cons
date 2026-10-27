import type { Metadata } from "next";
import { FieldSvg } from "@/components/visuals";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "Comment ça marche" };

const SUPPORTER_STEPS = [
  ["Il crée son compte", "Avec son e-mail, son nom et son numéro Mobile Money. Au-delà de 1 000 $ cumulés, il déclare une pièce d'identité."],
  ["Il choisit une campagne", "Rénovation du terrain, matériel pour les jeunes, déplacement…"],
  ["Il paie", "Par M-Pesa, Airtel Money ou Orange Money : la demande arrive sur son téléphone, il la valide avec son code secret."],
  ["Il reçoit une confirmation", "L'opérateur confirme le paiement, la contribution est inscrite au registre avec sa référence."],
  ["Il suit l'avancement", "Le club publie ses nouvelles et les preuves de chaque jalon."],
];
const CLUB_STEPS = [
  ["Il inscrit le club", "Nom, président, contact et compte Mobile Money qui recevra les versements."],
  ["L'équipe vérifie le club", "Identité du club et de ses dirigeants. Le club est alors « vérifié »."],
  ["Il dépose une campagne", "Objectif, budget détaillé égal à l'objectif, calendrier et jalons."],
  ["L'équipe instruit le dossier", "Décision motivée : publié, à corriger ou refusé. Au-delà de 20 000 $, validation par un administrateur."],
  ["Le club rend compte", "Nouvelles relues avant publication, preuves de chaque jalon, rapport final."],
];

export default async function HowItWorksPage() {
  // Un gestionnaire n'a besoin que du parcours d'un club (pas du parcours du don).
  const viewer = await getViewer();
  const clubOnly = can(viewer?.profile.role, "club:manage");
  const journeys: [string, string[][]][] = clubOnly
    ? [["Le parcours d'un club", CLUB_STEPS]]
    : [
        ["Le parcours d'un supporter", SUPPORTER_STEPS],
        ["Le parcours d'un club", CLUB_STEPS],
      ];
  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Comment ça marche
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>Des règles simples, les mêmes pour tous les clubs</h1>
          <p>Tribune met en relation les supporters et leurs clubs. Nous vérifions les projets, suivons l&apos;argent et publions les preuves.</p>
        </div>
      </div>
      <div className="wrap page" style={{ display: "grid", gap: 48 }}>
        <div className={journeys.length > 1 ? "split half" : undefined}>
          {journeys.map(([title, steps]) => (
            <div key={title}>
              <h2 style={{ marginBottom: 16 }}>{title}</h2>
              <ol className="steps">
                {steps.map(([t, d], i) => (
                  <li key={t} className="done">
                    <span className="dot">{i + 1}</span>
                    <div>
                      <b>{t}</b>
                      <span className="small muted">{d}</span>
                    </div>
                    <span />
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {clubOnly ? null : (
          <div id="argent">
            <div className="sec-head">
              <div>
                <div className="eyebrow">Où va votre argent</div>
                <h2 style={{ marginTop: 6 }}>Le site ne garde pas l&apos;argent</h2>
                <p className="muted">
                  Votre paiement passe par pawaPay, un prestataire agréé relié à M-Pesa, Airtel Money et Orange Money.
                  Tribune enregistre la contribution, prélève une commission unique affichée avant de payer, et le club
                  reçoit le reste selon les règles de la campagne.
                </p>
              </div>
            </div>
            <div className="flow">
              <div className="node">
                <div className="eyebrow">1 · Vous</div>
                <h4>Vous donnez 20 $</h4>
                <p className="small muted">Vous validez le paiement sur votre téléphone avec votre code secret.</p>
              </div>
              <div className="arrow" aria-hidden="true">
                →
              </div>
              <div className="node hl">
                <div className="eyebrow">2 · Prestataire de paiement</div>
                <h4>Encaisse et confirme</h4>
                <p className="small">Tribune n&apos;a jamais accès à votre compte ni à votre code Mobile Money.</p>
              </div>
              <div className="arrow" aria-hidden="true">
                →
              </div>
              <div className="node">
                <div className="eyebrow">3 · Votre club</div>
                <h4 className="num">19 $ pour le projet</h4>
                <p className="small muted num">1 $ (5 %) finance la plateforme : vérifications, support, sécurité.</p>
              </div>
            </div>
          </div>
        )}

        <div id="frais">
          <h2 style={{ marginBottom: 16 }}>Frais</h2>
          <div className="tbl-wrap">
            <table>
              <tbody>
                <tr>
                  <th style={{ width: "30%" }}>Pour le supporter</th>
                  <td>Aucun frais en plus. Vous payez exactement le montant choisi.</td>
                </tr>
                <tr>
                  <th>Pour le club</th>
                  <td>Commission unique de 5 % sur les fonds effectivement collectés. Pas de frais d&apos;inscription ni de dossier.</td>
                </tr>
                <tr>
                  <th>Si l&apos;objectif n&apos;est pas atteint</th>
                  <td>Aucune commission. Chaque supporter est remboursé sur son compte Mobile Money.</td>
                </tr>
                <tr>
                  <th>À quoi sert la commission</th>
                  <td>Vérification des dossiers, support, hébergement, sécurité et frais du prestataire de paiement.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="securite">
          <h2 style={{ marginBottom: 16 }}>Sécurité et confiance</h2>
          <div className="tbl-wrap">
            <table>
              <tbody>
                <tr>
                  <th style={{ width: "30%" }}>Paiements</th>
                  <td>Encaissés par pawaPay, prestataire agréé relié à M-Pesa, Airtel Money et Orange Money. Tribune ne voit jamais votre code secret.</td>
                </tr>
                <tr>
                  <th>Droits d&apos;accès</th>
                  <td>
                    Chaque rôle (supporter, gestionnaire de club, conformité, administrateur) ne voit que ce qui le concerne.
                    Les règles sont appliquées par la base de données elle-même.
                  </td>
                </tr>
                <tr>
                  <th>Traçabilité</th>
                  <td>Chaque contribution et chaque décision de l&apos;équipe est enregistrée avec la date et l&apos;auteur.</td>
                </tr>
                <tr>
                  <th>Données personnelles</th>
                  <td>Consentement à l&apos;inscription, données limitées au nécessaire, numéros et pièces d&apos;identité jamais publiés.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="faq" id="faq">
          <h2 style={{ marginBottom: 8 }}>Questions fréquentes</h2>
          <details>
            <summary>Que se passe-t-il si le club n&apos;utilise pas l&apos;argent comme prévu ?</summary>
            <p>
              L&apos;argent est versé par tranches, après la preuve de chaque jalon. En cas de doute, la campagne est
              suspendue, les justificatifs sont demandés et les supporters informés.
            </p>
          </details>
          <details>
            <summary>Puis-je donner sans créer de compte ?</summary>
            <p>Non. Le compte permet de vous envoyer le reçu, de vous rembourser si l&apos;objectif n&apos;est pas atteint et de vous tenir informé.</p>
          </details>
          <details>
            <summary>Je n&apos;ai pas reçu la demande de paiement sur mon téléphone.</summary>
            <p>Vérifiez le numéro et l&apos;opérateur choisis, puis réessayez. Une demande non validée expire au bout de quelques minutes sans débit.</p>
          </details>
          <details>
            <summary>Pourquoi me demande-t-on une pièce d&apos;identité ?</summary>
            <p>Au-delà de 1 000 $ cumulés, nous devons vérifier l&apos;identité des contributeurs (lutte contre le blanchiment). La pièce reste confidentielle.</p>
          </details>
        </div>
      </div>
    </>
  );
}
