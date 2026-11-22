import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { can, canUseClubSpace, isStaff } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { Crest, FieldSvg } from "@/components/visuals";
import { formatMoney, plural } from "@/lib/format";
import type { Club } from "@/lib/types";

export const metadata: Metadata = {
  title: "Clubs · Inscrire votre club",
  description:
    "Inscrivez votre club sur Tribune : dossier en ligne, vérification par l'équipe, puis campagnes financées par vos supporters et payées par Mobile Money.",
};

type DirectoryClub = Pick<Club, "id" | "slug" | "name" | "short_name" | "sport" | "city" | "color_primary" | "color_secondary" | "logo_path">;

const STEPS: [string, string][] = [
  ["Créez votre compte", "« Je représente un club » : votre compte personnel, confirmé par un code SMS."],
  ["Remplissez le dossier du club", "Identité du club, siège, représentant légal et compte de versement au nom du club."],
  ["Ajoutez les documents", "Au moins un document qui atteste l'existence du club, puis envoyez le dossier."],
  ["L'équipe Tribune vérifie", "Existence du club, représentant légal, compte de versement. Elle peut demander des compléments."],
  ["Lancez votre première campagne", "Objectif, budget, durée de collecte, contribution minimum, jalons et photo du projet."],
];

const PREPARE: [string, string][] = [
  ["Les statuts du club", "ou son enregistrement officiel (personnalité juridique, arrêté, RCCM), ou l'attestation d'affiliation à la fédération ou à la ligue."],
  ["La pièce d'identité du représentant légal", "le président ou la personne qui engage le club ; un mandat si ce n'est pas vous."],
  ["Un compte au nom du club", "Mobile Money (M-Pesa, Airtel Money, Orange Money) ou compte bancaire, avec un justificatif."],
  ["Les informations du club", "nom officiel, sigle, discipline, date de création, adresse du siège, identifiant juridique s'il existe."],
  ["Le logo du club", "facultatif : sans logo, un blason est dessiné aux couleurs du club."],
];

export default async function ClubsPage() {
  const [viewer, supabase] = await Promise.all([getViewer(), createClient()]);
  const [{ data }, settings] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, slug, name, short_name, sport, city, color_primary, color_secondary, logo_path")
      .eq("status", "verified")
      .order("name"),
    getSettings(supabase),
  ]);
  const clubs = (data ?? []) as DirectoryClub[];
  const role = viewer?.profile.role;

  // Le bouton principal mène là où la personne en est.
  const cta = !viewer
    ? { href: "/inscription?profil=club", label: "Inscrire mon club" }
    : isStaff(role)
      ? { href: "/admin/clubs", label: "Inscriptions à vérifier" }
      : can(role, "club:manage")
        ? { href: "/club", label: "Mon espace club" }
        : canUseClubSpace(role)
          ? { href: "/club", label: viewer.club && viewer.club.status !== "rejected" ? "Suivre mon dossier" : "Inscrire mon club" }
          : null;

  // L'équipe Tribune et les clubs déjà inscrits ne sont pas invités à « inscrire leur club ».
  const registered = isStaff(role) || can(role, "club:manage");

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Clubs
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>
            {registered ? "Les clubs sur Tribune" : "Inscrire votre club sur Tribune"}
          </h1>
          {isStaff(role) ? (
            <p>Page publique des clubs, telle que la voient les visiteurs : parcours d&apos;inscription et annuaire des clubs vérifiés.</p>
          ) : registered ? (
            <p>Le parcours d&apos;un club sur Tribune et l&apos;annuaire des clubs vérifiés.</p>
          ) : (
            <p>
              Vos supporters financent vos projets (terrain, équipements, déplacements) et paient par Mobile Money.
              L&apos;inscription est gratuite. L&apos;équipe Tribune vérifie chaque club avant sa première campagne.
            </p>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
            {cta ? (
              <Link className="btn btn-gold" href={cta.href}>
                {cta.label}
              </Link>
            ) : null}
            <Link className="btn btn-ghost" href="/comment-ca-marche#club">
              Les règles pour les clubs
            </Link>
          </div>
        </div>
      </div>

      <div className="wrap page" style={{ display: "grid", gap: 44 }}>
        <div className="split half">
          <section>
            <h2 style={{ fontSize: "1.8rem", marginBottom: 16 }}>Les étapes de l&apos;inscription</h2>
            <ol className="steps">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="done">
                  <span className="dot">{i + 1}</span>
                  <div>
                    <b>{title}</b>
                    <span className="small muted">{text}</span>
                  </div>
                  <span />
                </li>
              ))}
            </ol>
            <p className="small muted">
              L&apos;inscription ne donne pas le droit de lancer une campagne : elle déclenche une vérification. Vous
              suivez chaque étape dans votre espace club et dans vos notifications.
            </p>
          </section>
          <section>
            <h2 style={{ fontSize: "1.8rem", marginBottom: 16 }}>Ce qu&apos;il faut préparer</h2>
            <div className="panel">
              <div className="rules">
                {PREPARE.map(([title, text]) => (
                  <div key={title}>
                    <span className="ck">✓</span>
                    <span>
                      <b>{title}</b> : {text}
                    </span>
                  </div>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: 14 }}>
                Une photo prise au téléphone suffit : elle est allégée automatiquement avant l&apos;envoi. Les documents
                ne sont visibles que par les gestionnaires du club et l&apos;équipe Tribune.
              </p>
            </div>
            <div className="panel" style={{ marginTop: 16 }}>
              <h3>Frais</h3>
              <p className="small">
                Inscription gratuite.{" "}
                {settings.publication_fee > 0
                  ? `${formatMoney(settings.publication_fee)} de frais d'instruction et de publication par campagne publiée (rien si elle est refusée), puis `
                  : "Pour chaque campagne : "}
                5 % des fonds collectés, seulement si l&apos;objectif est atteint.{" "}
                <Link href="/comment-ca-marche#frais">Détail des frais</Link>
              </p>
            </div>
          </section>
        </div>

        <section>
          <div className="sec-head">
            <div>
              <div className="eyebrow">Annuaire</div>
              <h2 style={{ marginTop: 6, fontSize: "1.8rem" }}>Les clubs vérifiés</h2>
            </div>
            <span className="small muted">{plural(clubs.length, "club vérifié", "clubs vérifiés")}</span>
          </div>
          {clubs.length ? (
            <div className="club-grid">
              {clubs.map((k) => (
                <Link key={k.id} className="club-tile" href={`/clubs/${k.slug}`}>
                  <Crest club={k} size={40} />
                  <span style={{ minWidth: 0 }}>
                    <b>{k.name}</b>
                    <span className="small muted">
                      {k.sport} · {k.city}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="panel empty">
              <p className="muted">Aucun club vérifié pour l&apos;instant : le vôtre peut être le premier.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
