import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, safeReturnPath } from "@/lib/auth";
import { FieldSvg } from "@/components/visuals";
import { RegisterForm } from "./RegisterForm";
import { formatMoney, KYC_THRESHOLD } from "@/lib/format";

export const metadata: Metadata = { title: "Inscription" };

type Kind = "supporter" | "club";

function ClubIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2.5 20 5.5v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10v-6Z" />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" />
    </svg>
  );
}

function SupporterIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" />
    </svg>
  );
}

/** Premier écran : le visiteur dit s'il représente un club ou s'il est supporter. */
function AccountChoice({ returnTo }: { returnTo: string }) {
  const suite = returnTo !== "/" ? `&suite=${encodeURIComponent(returnTo)}` : "";
  return (
    <div className="split">
      <div className="panel" style={{ padding: 0 }}>
        <div className="choices" role="list">
          <Link className="choice" role="listitem" href="/inscription?profil=club">
            <span className="ic club">
              <ClubIcon />
            </span>
            <span>
              <b>Je représente un club</b>
              <span className="small muted">
                Créer un compte pour enregistrer un club, soumettre des projets et suivre les financements.
              </span>
            </span>
            <span className="go" aria-hidden="true">
              →
            </span>
          </Link>
          <Link className="choice" role="listitem" href={`/inscription?profil=supporter${suite}`}>
            <span className="ic">
              <SupporterIcon />
            </span>
            <span>
              <b>Je suis supporter</b>
              <span className="small muted">
                Créer un compte personnel pour découvrir les campagnes, contribuer et suivre ses contributions.
              </span>
            </span>
            <span className="go" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
      <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <div className="panel">
          <h3>Déjà inscrit ?</h3>
          <Link className="btn btn-ghost btn-sm" href={`/connexion?suite=${encodeURIComponent(returnTo)}`}>
            Me connecter
          </Link>
        </div>
        <div className="panel">
          <h3>Un compte, un rôle</h3>
          <p className="small muted">
            Un club ne peut pas lancer de campagne dès son inscription : l&apos;équipe Tribune vérifie d&apos;abord son
            existence, son représentant légal et son compte de versement.
          </p>
        </div>
      </aside>
    </div>
  );
}

export default async function RegisterPage(props: PageProps<"/inscription">) {
  const { suite, profil } = await props.searchParams;
  const returnTo = safeReturnPath(suite, "/");
  if (await getViewer()) redirect(returnTo);

  // Un visiteur qui vient d'une campagne (« suite ») veut contribuer : formulaire supporter direct.
  const kind: Kind | null = profil === "club" ? "club" : profil === "supporter" || typeof suite === "string" ? "supporter" : null;

  const supabase = await createClient();
  const { data: clubs } =
    kind === "supporter" ? await supabase.from("clubs").select("id, name").eq("status", "verified").order("name") : { data: [] };

  const head =
    kind === "club"
      ? {
          eyebrow: "Inscription · club",
          title: "Inscrire mon club",
          lead: "Commencez par votre compte personnel de représentant. Vous remplirez ensuite le dossier du club ; l'équipe Tribune le vérifie avant toute campagne.",
        }
      : kind === "supporter"
        ? {
            eyebrow: "Inscription · supporter",
            title: "Devenir supporter inscrit",
            lead: "Votre compte relie chacune de vos contributions à votre nom. C'est la garantie que l'argent peut être retracé, du paiement jusqu'au club.",
          }
        : {
            eyebrow: "Inscription",
            title: "Créer un compte",
            lead: "Choisissez le compte qui vous correspond : celui d'un club qui veut financer ses projets, ou celui d'un supporter qui veut les soutenir.",
          };

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            {head.eyebrow}
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>{head.title}</h1>
          <p>{head.lead}</p>
        </div>
      </div>
      <div className="wrap page">
        {kind === null ? (
          <AccountChoice returnTo={returnTo} />
        ) : (
          <div className="split">
            <RegisterForm kind={kind} clubs={clubs ?? []} returnTo={kind === "club" ? "/club" : returnTo} />
            <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
              {kind === "club" ? (
                <div className="panel">
                  <h3>Les étapes pour un club</h3>
                  <ol className="steps">
                    {[
                      ["Votre compte", "Nom, téléphone et e-mail du représentant, confirmés par un code SMS."],
                      ["Le dossier du club", "Nom officiel, sigle, discipline, siège, date de création, représentant légal, compte de versement."],
                      ["Les documents", "Statuts (ou enregistrement, affiliation) et pièce d'identité du représentant légal, envoyés dès qu'ils sont choisis."],
                      ["La vérification", "L'équipe Tribune contrôle le dossier et peut demander des compléments."],
                      ["Votre première campagne", "Une fois le club vérifié : objectif, budget, durée, jalons."],
                    ].map(([title, text], i) => (
                      <li key={title} className={i === 0 ? "now" : ""}>
                        <span className="dot">{i + 1}</span>
                        <div>
                          <b>{title}</b>
                          <span className="small muted">{text}</span>
                        </div>
                        <span />
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <div className="panel">
                  <h3>Ce que nous enregistrons</h3>
                  <div className="rules">
                    <div>
                      <span className="ck">✓</span>
                      <span>Votre identité et votre numéro Mobile Money</span>
                    </div>
                    <div>
                      <span className="ck">✓</span>
                      <span>La date de votre consentement</span>
                    </div>
                    <div>
                      <span className="ck">✓</span>
                      <span>Chaque contribution : date, campagne, montant, commission, référence de l&apos;opérateur</span>
                    </div>
                    <div>
                      <span className="ck">✓</span>
                      <span>Au-delà de {formatMoney(KYC_THRESHOLD)} cumulés : le type de pièce d&apos;identité</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="panel">
                <h3>{kind === "club" ? "Vous êtes supporter ?" : "Vous représentez un club ?"}</h3>
                <Link className="btn btn-ghost btn-sm" href={kind === "club" ? "/inscription?profil=supporter" : "/inscription?profil=club"}>
                  {kind === "club" ? "Créer un compte supporter" : "Inscrire mon club"}
                </Link>
                <p className="small muted" style={{ marginTop: 12 }}>
                  Déjà inscrit ? <Link href={`/connexion?suite=${encodeURIComponent(kind === "club" ? "/club" : returnTo)}`}>Me connecter</Link>
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
