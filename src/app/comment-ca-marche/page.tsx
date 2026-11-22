import type { Metadata } from "next";
import { FieldSvg } from "@/components/visuals";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Comment ça marche" };

const SUPPORTER_STEPS = [
  ["Il crée son compte", "« Je suis supporter » : e-mail, nom et numéro Mobile Money. Au-delà de 1 000 $ cumulés, il déclare une pièce d'identité."],
  ["Il choisit une campagne", "Rénovation du terrain, matériel pour les jeunes, déplacement… Chaque fiche affiche l'objectif, le montant collecté, la contribution minimum et la durée restante."],
  ["Il paie", "Par M-Pesa, Airtel Money ou Orange Money : la demande arrive sur son téléphone, il la valide avec son code secret."],
  ["Il reçoit une confirmation", "L'opérateur confirme le paiement, la contribution est inscrite au registre avec sa référence."],
  ["Il fait connaître la campagne", "Il la partage sur WhatsApp ou Facebook avec son lien d'ambassadeur, et commente pour poser ses questions au club."],
  ["Il suit l'avancement", "Notifications à chaque étape : objectif atteint, nouvelles et messages du club, preuves des jalons, clôture."],
];
function clubSteps(fee: number) {
  return [
    ["Il crée son compte", "« Je représente un club » : le compte personnel du représentant, confirmé par SMS. L'inscription est gratuite."],
    [
      "Il remplit le dossier du club",
      "Nom officiel, sigle, discipline, ville et adresse du siège, date de création, identifiant juridique s'il existe, représentant légal et ses coordonnées, compte de versement au nom du club.",
    ],
    ["Il dépose les documents", "Un document qui atteste l'existence du club (statuts, enregistrement, affiliation) et la pièce d'identité du représentant légal, puis il envoie le dossier."],
    [
      "L'équipe vérifie le club",
      "Trois contrôles : existence du club, représentant légal, compte de versement. Elle peut demander des compléments. L'inscription seule ne permet pas de lancer une campagne.",
    ],
    [
      "Il dépose une campagne",
      "Objectif, budget détaillé égal à l'objectif, durée de la collecte, contribution minimum (et maximum par supporter si besoin), jalons et photo du projet.",
    ],
    [
      "L'équipe instruit le dossier",
      "Trois critères : clarté, faisabilité, cohérence. Décision motivée : publié, à corriger ou refusé. Au-delà de 20 000 $, validation par un administrateur.",
    ],
    [
      "La campagne est publiée",
      fee > 0
        ? `Les frais d'instruction et de publication (${formatMoney(fee)}) sont facturés au club, puis la collecte s'ouvre pour la durée choisie. Les supporters qui suivent le club sont prévenus.`
        : "La collecte s'ouvre pour la durée choisie. Les supporters qui suivent le club sont prévenus.",
    ],
    ["Le club rend compte", "Nouvelles et messages aux contributeurs publiés directement (l'équipe retire ceux contraires aux règles), réponses aux commentaires, preuves de chaque jalon, rapport final."],
  ];
}

export default async function HowItWorksPage() {
  // Un gestionnaire n'a besoin que du parcours d'un club (pas du parcours du don).
  const viewer = await getViewer();
  const clubOnly = can(viewer?.profile.role, "club:manage");
  const fee = (await getSettings(await createClient())).publication_fee;
  const CLUB_STEPS = clubSteps(fee);
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
            <div key={title} id={title === "Le parcours d'un club" ? "club" : undefined} style={{ scrollMarginTop: 90 }}>
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
                  <td>
                    Inscription gratuite. Pour chaque campagne publiée
                    {fee > 0 ? (
                      <>
                        {" "}: <b className="num">{formatMoney(fee)}</b> de frais d&apos;instruction et de publication (rien si le
                        dossier est refusé), puis
                      </>
                    ) : " :"}{" "}
                    une commission de 5 % sur les fonds effectivement collectés.
                  </td>
                </tr>
                <tr>
                  <th>Si l&apos;objectif n&apos;est pas atteint</th>
                  <td>
                    Aucune commission. Chaque supporter est remboursé sur son compte Mobile Money.
                    {fee > 0 ? " Les frais d'instruction et de publication restent dus : le dossier a été instruit et mis en ligne." : null}
                  </td>
                </tr>
                <tr>
                  <th>Accompagnement (facultatif)</th>
                  <td>Aide à la préparation du budget, à la présentation du projet et au suivi des jalons : sur devis.</td>
                </tr>
                <tr>
                  <th>À quoi servent les frais</th>
                  <td>
                    Les frais d&apos;instruction et de publication paient la vérification du dossier et sa mise en ligne. La
                    commission paie le support, l&apos;hébergement, la sécurité et les frais du prestataire de paiement.
                  </td>
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

        <div id="plumes-capital">
          <h2 style={{ marginBottom: 8 }}>Qui est derrière Tribune</h2>
          <p className="muted" style={{ marginBottom: 16, maxWidth: "48em" }}>
            Tribune est une plateforme de Plumes Capital, société par actions simplifiée de droit OHADA établie en
            République démocratique du Congo. Plumes Capital organise la rencontre entre les porteurs de projets et ceux
            qui les financent&nbsp;: instruction des dossiers, information claire et homogène, collecte, puis suivi de
            l&apos;utilisation des fonds.
          </p>
          <div className="tbl-wrap">
            <table>
              <tbody>
                <tr>
                  <th style={{ width: "30%" }}>Notre rôle</th>
                  <td>
                    Intermédiaire non financier : Plumes Capital ne reçoit pas de dépôts du public, ne prête pas et
                    n&apos;investit pas pour son propre compte. Chaque projet reste sous la responsabilité du club qui le porte.
                  </td>
                </tr>
                <tr>
                  <th>Contrôle</th>
                  <td>
                    La personne qui instruit un dossier n&apos;enregistre pas les paiements. Identification des contributeurs
                    et vigilance contre le blanchiment de capitaux, conformément au cadre applicable en RDC.
                  </td>
                </tr>
                <tr>
                  <th>Gouvernance</th>
                  <td>
                    Une direction identifiée (Président, directeur général, directeur général adjoint) et des décisions
                    tracées : chaque publication, refus, suspension ou remboursement est inscrit au journal d&apos;audit.
                  </td>
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
            <summary>Qu&apos;est-ce qu&apos;un ambassadeur ?</summary>
            <p>
              Chaque supporter a un lien de partage personnel. Quand quelqu&apos;un contribue après l&apos;avoir suivi, la
              contribution est attribuée à l&apos;ambassadeur dans le classement. Vous choisissez d&apos;y apparaître sous
              votre prénom ou anonymement.
            </p>
          </details>
          <details>
            <summary>Pourquoi un maximum par supporter sur certaines campagnes ?</summary>
            <p>
              Un club peut plafonner le total versé par une même personne pour que le projet soit porté par le plus grand
              nombre de supporters. Le plafond est affiché sur la fiche avant de payer.
            </p>
          </details>
          <details>
            <summary>Mon club vient de s&apos;inscrire : pourquoi ne peut-il pas encore lancer de campagne ?</summary>
            <p>
              L&apos;inscription ouvre un dossier. L&apos;équipe Tribune vérifie d&apos;abord l&apos;existence du club, son
              représentant légal et son compte de versement, à partir des documents déposés. Une fois le club vérifié, il
              peut déposer sa première campagne.
            </p>
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
