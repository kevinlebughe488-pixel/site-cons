import Link from "next/link";
import { coverUrl, Crest, FieldSvg, ProgressBar } from "@/components/visuals";
import { daysLeft, formatMoney, formatNumber, percent, plural } from "@/lib/format";
import type { CampaignWithClub } from "@/lib/types";

export type FollowedClub = { id: string; slug: string; name: string; short_name: string; color_primary: string; color_secondary: string; logo_path: string | null };

type Stats = { total_raised: number; supporters: number; funded_campaigns: number; active_campaigns: number };

/**
 * Héros de l'accueil. Visiteur : une phrase, deux boutons, trois chiffres.
 * Supporter connecté : « Bonjour », une question et trois raccourcis ; la
 * campagne de son club passe à la une. Peu de texte dans les deux cas.
 */
export function HomeHero({
  firstName,
  liveCount,
  myTotal,
  followed,
  featured,
  featuredIsMine,
  stats,
}: {
  /** Prénom du supporter connecté (null : visiteur). */
  firstName: string | null;
  liveCount: number;
  myTotal: number;
  followed: FollowedClub | null;
  featured: CampaignWithClub | null;
  featuredIsMine: boolean;
  stats: Stats | null;
}) {
  return (
    <section className={`hero on-pitch${firstName ? " hero-me" : ""}`}>
      <FieldSvg opacity={0.7} />
      <div className="wrap">
        {firstName ? (
          <div>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>
              Bonjour {firstName}
            </div>
            <h1 style={{ marginTop: 10 }}>
              Quel projet <span style={{ whiteSpace: "nowrap" }}>soutenez-vous</span> <em>aujourd&apos;hui</em>&nbsp;?
            </h1>
            <nav className="quick" aria-label="Raccourcis">
              <Link href="/campagnes">
                <b className="num">{liveCount}</b>
                <span>{liveCount > 1 ? "campagnes ouvertes" : "campagne ouverte"}</span>
              </Link>
              <Link href="/compte">
                <b className="num">{formatMoney(myTotal)}</b>
                <span>mes contributions</span>
              </Link>
              <Link href={followed ? `/clubs/${followed.slug}` : "/clubs"}>
                {followed ? <Crest club={followed} size={30} /> : <b>+</b>}
                <span>{followed ? followed.name : "suivre un club"}</span>
              </Link>
            </nav>
          </div>
        ) : (
          <div>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>
              Financement participatif des clubs
            </div>
            <h1 style={{ marginTop: 12 }}>
              Le club, c&apos;est vous. <em>Financez-le.</em>
            </h1>
            <p className="lead">Payez par Mobile Money. Suivez chaque dollar, photos et factures à l&apos;appui.</p>
            <div className="ctas">
              <Link className="btn btn-gold" href="/campagnes">
                Voir les campagnes
              </Link>
              <Link className="btn btn-ghost" href="/inscription?profil=supporter">
                Créer mon compte
              </Link>
            </div>
            {stats ? (
              <div className="facts num">
                <div>
                  <b>{formatMoney(stats.total_raised)}</b>collectés
                </div>
                <div>
                  <b>{formatNumber(stats.supporters)}</b>supporters
                </div>
                <div>
                  <b>{stats.active_campaigns}</b>
                  {stats.active_campaigns > 1 ? "campagnes" : "campagne"} en cours
                </div>
              </div>
            ) : null}
          </div>
        )}
        {featured ? (
          <Link className="board" href={`/campagnes/${featured.slug}`} aria-label={`À la une : ${featured.title}`}>
            {featured.cover_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="board-photo" src={coverUrl(featured.cover_path)} alt="" decoding="async" />
            ) : null}
            <div className="head">
              <Crest club={featured.club} size={36} />
              <div>
                <div className="club">{featured.club.name}</div>
                <div className="small" style={{ opacity: 0.8 }}>
                  {featuredIsMine ? "Votre club" : "À la une"}
                </div>
              </div>
            </div>
            <h3 style={{ marginTop: 12 }}>{featured.title}</h3>
            <div className="score num">
              <div>
                <div className="v">{formatMoney(featured.raised_amount, featured.currency)}</div>
                <div className="l">Collectés</div>
              </div>
              <div className="sep">/</div>
              <div className="r">
                <div className="v">{formatMoney(featured.goal_amount, featured.currency)}</div>
                <div className="l">Objectif</div>
              </div>
            </div>
            <ProgressBar raised={featured.raised_amount} goal={featured.goal_amount} />
            <div className="meta num">
              <span>{percent(featured.raised_amount, featured.goal_amount)} % atteint</span>
              <span>{plural(daysLeft(featured.end_date), "jour restant", "jours restants")}</span>
            </div>
            <span className="btn btn-gold">Voir le projet</span>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
