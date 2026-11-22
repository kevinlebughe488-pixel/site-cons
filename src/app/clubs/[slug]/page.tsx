import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { followClub } from "@/lib/actions/community";
import { CAMPAIGN_WITH_CLUB } from "@/lib/campaigns";
import { ActionForm, SubmitButton } from "@/components/forms";
import { CampaignCard } from "@/components/CampaignCard";
import { Crest, FieldSvg } from "@/components/visuals";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { CampaignUpdate, CampaignWithClub, Club } from "@/lib/types";

type PublicClub = Pick<
  Club,
  "id" | "slug" | "name" | "short_name" | "sport" | "city" | "commune" | "founded_year" | "description" | "color_primary" | "color_secondary" | "logo_path" | "status"
>;

const loadClub = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clubs")
    .select("id, slug, name, short_name, sport, city, commune, founded_year, description, color_primary, color_secondary, logo_path, status")
    .eq("slug", slug)
    .maybeSingle<PublicClub>();
  return { supabase, club: data };
});

export async function generateMetadata(props: PageProps<"/clubs/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { club } = await loadClub(slug);
  if (!club) return { title: "Club" };
  const description = `${club.name} (${club.sport}, ${club.city}) : projets financés par ses supporters, actualités et preuves de chaque jalon sur Tribune.`;
  return { title: club.name, description, openGraph: { title: club.name, description, siteName: "Tribune", locale: "fr_FR" } };
}

export default async function ClubPublicPage(props: PageProps<"/clubs/[slug]">) {
  const { slug } = await props.params;
  const [{ supabase, club }, viewer] = await Promise.all([loadClub(slug), getViewer()]);
  if (!club || club.status !== "verified") notFound();

  const [{ data: stats }, { data: campaignData }, { data: newsData }] = await Promise.all([
    supabase.rpc("club_stats", { p_club_id: club.id }).maybeSingle<{ supporters: number; raised: number; funded: number; active: number }>(),
    supabase
      .from("campaigns")
      .select(CAMPAIGN_WITH_CLUB)
      .eq("club_id", club.id)
      .in("status", ["published", "funded", "failed"])
      .order("published_at", { ascending: false })
      .limit(24),
    supabase
      .from("campaign_updates")
      .select("id, campaign_id, club_id, audience, title, body, status, review_note, created_at, published_at, campaign:campaigns(slug, title)")
      .eq("club_id", club.id)
      .eq("status", "published")
      .eq("audience", "public")
      .order("published_at", { ascending: false })
      .limit(20),
  ]);
  const campaigns = (campaignData ?? []) as CampaignWithClub[];
  const news = (newsData ?? []) as unknown as (CampaignUpdate & { campaign: { slug: string; title: string } | null })[];
  const supporter = can(viewer?.profile.role, "contribution:create");
  const following = viewer?.profile.followed_club_id === club.id;

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <Crest club={club} size={64} />
          <div style={{ flex: "1 1 260px" }}>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>
              {club.sport} · {[club.commune, club.city].filter(Boolean).join(", ")}
              {club.founded_year ? ` · fondé en ${club.founded_year}` : ""}
            </div>
            <h1 style={{ fontSize: "clamp(2rem,4.5vw,3rem)", marginTop: 4 }}>{club.name}</h1>
            <p style={{ marginTop: 6 }}>Club vérifié par l&apos;équipe Tribune.</p>
          </div>
          {supporter ? (
            <ActionForm action={followClub} className="inline-form">
              <input type="hidden" name="club_id" value={club.id} />
              <input type="hidden" name="follow" value={following ? "false" : "true"} />
              <SubmitButton className={following ? "btn btn-ghost btn-sm" : "btn btn-gold btn-sm"} pendingLabel="…">
                {following ? "Vous suivez ce club · Ne plus suivre" : "Suivre ce club"}
              </SubmitButton>
            </ActionForm>
          ) : !viewer ? (
            <Link className="btn btn-gold btn-sm" href={`/inscription?profil=supporter&suite=${encodeURIComponent(`/clubs/${club.slug}`)}`}>
              Suivre ce club
            </Link>
          ) : null}
        </div>
      </div>
      <div className="wrap page">
        <div className="kpis" style={{ marginTop: 0 }}>
          <div className="kpi">
            <div className="l">Supporters contributeurs</div>
            <div className="v num">{formatNumber(Number(stats?.supporters ?? 0))}</div>
          </div>
          <div className="kpi">
            <div className="l">Collecté sur Tribune</div>
            <div className="v num">{formatMoney(Number(stats?.raised ?? 0))}</div>
          </div>
          <div className="kpi">
            <div className="l">Projets financés</div>
            <div className="v num">{Number(stats?.funded ?? 0)}</div>
          </div>
          <div className="kpi">
            <div className="l">Campagnes en cours</div>
            <div className="v num">{Number(stats?.active ?? 0)}</div>
          </div>
        </div>
        {supporter && !following ? (
          <p className="small muted" style={{ marginBottom: 20 }}>
            Suivez le club pour être prévenu de ses nouveaux projets et de ses actualités.
            {viewer?.profile.followed_club_id ? " Vous ne suivez qu'un club à la fois : il remplacera celui que vous suivez." : ""}
          </p>
        ) : null}

        <div className="sec-head">
          <h2 style={{ fontSize: "1.8rem" }}>Les projets du club</h2>
        </div>
        {campaigns.length ? (
          <div className="grid" style={{ marginBottom: 40 }}>
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        ) : (
          <div className="panel empty" style={{ marginBottom: 40 }}>
            <p className="muted">Aucune campagne publiée pour l&apos;instant.</p>
          </div>
        )}

        <div className="split">
          <div id="actualites" className="block">
            <h2>Actualités du club</h2>
            {news.length ? (
              news.map((u) => (
                <div className="update" key={u.id}>
                  <span className="small muted">
                    {formatDate(u.published_at)}
                    {u.campaign ? (
                      <>
                        {" "}
                        · <Link href={`/campagnes/${u.campaign.slug}#nouvelles`}>{u.campaign.title}</Link>
                      </>
                    ) : null}
                  </span>
                  <h4>{u.title}</h4>
                  <p style={{ whiteSpace: "pre-line" }}>{u.body}</p>
                </div>
              ))
            ) : (
              <p className="muted">Pas encore d&apos;actualité.</p>
            )}
          </div>
          <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
            {club.description ? (
              <div className="panel">
                <h3>Le club</h3>
                <p className="small" style={{ whiteSpace: "pre-line" }}>
                  {club.description}
                </p>
              </div>
            ) : null}
            <div className="panel">
              <h3>Un club vérifié</h3>
              <p className="small muted">
                Avant toute campagne, l&apos;équipe Tribune a vérifié l&apos;existence du club, son représentant légal et le
                compte qui reçoit les fonds. Ses actualités sont relues par l&apos;équipe, qui retire celles contraires aux règles.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
