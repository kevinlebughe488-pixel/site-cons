import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { navigationFor } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { CAMPAIGN_WITH_CLUB, listCampaigns } from "@/lib/campaigns";
import { CampaignCard } from "@/components/CampaignCard";
import { coverUrl, Crest, FieldSvg, ProgressBar } from "@/components/visuals";
import { daysLeft, formatMoney, formatNumber, percent, plural } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignWithClub, Milestone } from "@/lib/types";

type FollowedClub = { id: string; slug: string; name: string; short_name: string; color_primary: string; color_secondary: string; logo_path: string | null };

/** Total des contributions confirmées du supporter connecté. */
async function myContributions(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase.from("contributions").select("amount").eq("user_id", userId).eq("status", "completed");
  return (data ?? []).reduce((s, c) => s + Number(c.amount), 0);
}

async function followedClub(supabase: SupabaseClient, clubId: string | null): Promise<FollowedClub | null> {
  if (!clubId) return null;
  const { data } = await supabase
    .from("clubs")
    .select("id, slug, name, short_name, color_primary, color_secondary, logo_path")
    .eq("id", clubId)
    .maybeSingle<FollowedClub>();
  return data;
}

export default async function HomePage() {
  // L'accueil public s'adresse aux supporters : les autres rôles vont sur leur espace.
  const viewer = await getViewer();
  const home = navigationFor(viewer).home;
  if (home !== "/") redirect(home);

  const supabase = await createClient();
  const [live, statsRes, provenRes, settings] = await Promise.all([
    listCampaigns(supabase, ["published"]),
    supabase.rpc("platform_stats").single<{
      total_raised: number;
      supporters: number;
      funded_campaigns: number;
      active_campaigns: number;
    }>(),
    supabase
      .from("campaigns")
      .select(`${CAMPAIGN_WITH_CLUB}, milestones:campaign_milestones(id, position, label, target_label, done_at)`)
      .eq("status", "funded")
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle<CampaignWithClub & { milestones: Milestone[] }>(),
    getSettings(supabase),
  ]);
  const stats = statsRes.data;
  const followedId = viewer?.profile.followed_club_id ?? null;
  // Connecté : la campagne du club suivi passe à la une, s'il en a une en cours.
  const byProgress = [...live].sort((a, b) => percent(b.raised_amount, b.goal_amount) - percent(a.raised_amount, a.goal_amount));
  const mine = followedId ? live.find((c) => c.club.id === followedId) : undefined;
  const featured = mine ?? byProgress[0];
  const proven = provenRes.data;
  const [myTotal, followed] = viewer ? await Promise.all([myContributions(supabase, viewer.profile.id), followedClub(supabase, followedId)]) : [0, null];

  return (
    <>
      <section className={`hero on-pitch${viewer ? " hero-me" : ""}`}>
        <FieldSvg opacity={0.7} />
        <div className="wrap">
          {viewer ? (
            <div>
              <div className="eyebrow" style={{ color: "var(--gold)" }}>
                Bonjour {viewer.profile.first_name}
              </div>
              <h1 style={{ marginTop: 10 }}>
                Quel projet soutenez-vous <em>aujourd&apos;hui</em>&nbsp;?
              </h1>
              <nav className="quick" aria-label="Raccourcis">
                <Link href="/campagnes">
                  <b className="num">{live.length}</b>
                  <span>{live.length > 1 ? "campagnes ouvertes" : "campagne ouverte"}</span>
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
                    {featured === mine ? "Votre club" : "À la une"}
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

      <section className="band">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="eyebrow">En cours</div>
              <h2 style={{ marginTop: 6 }}>Les campagnes ouvertes</h2>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link className="btn btn-ghost btn-sm" href="/classement">
                Les plus soutenues
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/campagnes">
                Toutes les campagnes →
              </Link>
            </div>
          </div>
          {live.length ? (
            <div className="grid">
              {live.slice(0, 6).map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          ) : (
            <div className="panel empty">
              <p>
                <b>Aucune campagne ouverte pour le moment.</b>
              </p>
              <p className="small muted">Les premières campagnes vérifiées apparaîtront ici.</p>
            </div>
          )}
        </div>
      </section>

      {proven ? (
        <section className="band">
          <div className="wrap">
            <div className="proof">
              <div>
                <div className="eyebrow">La preuve après le don</div>
                <h2 style={{ marginTop: 6 }}>
                  {proven.club.name} : {formatMoney(proven.raised_amount, proven.currency)} collectés,{" "}
                  {proven.milestones.filter((m) => m.done_at).length} jalon(s) sur {proven.milestones.length} prouvés
                </h2>
                <p className="muted" style={{ marginTop: 12 }}>
                  Chaque campagne financée publie ses jalons, ses justificatifs et un rapport final.
                </p>
                <div style={{ marginTop: 20 }}>
                  <Link className="btn btn-primary" href={`/campagnes/${proven.slug}`}>
                    Voir la campagne
                  </Link>
                </div>
              </div>
              <ol className="steps">
                {[...proven.milestones]
                  .sort((a, b) => a.position - b.position)
                  .map((m, i) => (
                    <li key={m.id} className={m.done_at ? "done" : ""}>
                      <span className="dot">{i + 1}</span>
                      <div>
                        <b>{m.label}</b>
                      </div>
                      <span className="when">{m.target_label}</span>
                    </li>
                  ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      <section className="band">
        <div className="wrap">
          <div className="proof" style={{ background: "var(--pitch)", color: "var(--on-pitch)", border: 0 }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--gold)" }}>
                Pour les clubs
              </div>
              <h2 style={{ marginTop: 6 }}>Votre club a un projet ? Proposez-le.</h2>
              <p style={{ marginTop: 12, opacity: 0.9 }}>
                Inscrivez votre club, déposez votre projet : l&apos;équipe Tribune vérifie tout avant la publication.
              </p>
            </div>
            <div style={{ display: "grid", gap: 12, alignContent: "center" }}>
              <div className="rules" style={{ opacity: 0.95 }}>
                <div>
                  <span style={{ color: "var(--gold)" }}>✓</span>
                  <span>
                    Inscription gratuite
                    {settings.publication_fee > 0 ? `, ${formatMoney(settings.publication_fee)} de frais de dossier par campagne publiée` : ""},
                    5 % des fonds collectés
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--gold)" }}>✓</span>
                  <span>Si l&apos;objectif n&apos;est pas atteint, les supporters sont remboursés</span>
                </div>
                <div>
                  <span style={{ color: "var(--gold)" }}>✓</span>
                  <span>Versement au club par tranches, à chaque jalon prouvé</span>
                </div>
              </div>
              <Link className="btn btn-gold" href={viewer ? "/club" : "/clubs"} style={{ justifySelf: "start" }}>
                {viewer ? "Mon espace club" : "Inscrire mon club"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
