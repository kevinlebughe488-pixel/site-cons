import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Crest, FieldSvg } from "@/components/visuals";
import { formatDate } from "@/lib/format";
import type { Club } from "@/lib/types";

export const metadata: Metadata = {
  title: "Actualités des clubs",
  description: "Les nouvelles publiées par les clubs : avancement des projets, remerciements, vie du club. Chaque actualité est relue par l'équipe Tribune.",
};

type NewsRow = {
  id: string;
  title: string;
  body: string;
  published_at: string;
  campaign: { slug: string; title: string } | null;
  club: Pick<Club, "slug" | "name" | "short_name" | "color_primary" | "color_secondary" | "logo_path">;
};

export default async function NewsPage(props: PageProps<"/actualites">) {
  const { club: clubFilter } = await props.searchParams;
  const viewer = await getViewer();
  const supabase = await createClient();
  let query = supabase
    .from("campaign_updates")
    .select("id, title, body, published_at, campaign:campaigns(slug, title), club:clubs!inner(slug, name, short_name, color_primary, color_secondary, logo_path)")
    .eq("status", "published")
    .eq("audience", "public")
    .order("published_at", { ascending: false })
    .limit(40);
  if (typeof clubFilter === "string" && /^[a-z0-9-]{1,80}$/.test(clubFilter)) query = query.eq("club.slug", clubFilter);
  const [{ data }, { data: followed }] = await Promise.all([
    query,
    viewer?.profile.followed_club_id
      ? supabase.from("clubs").select("slug, name").eq("id", viewer.profile.followed_club_id).maybeSingle<{ slug: string; name: string }>()
      : Promise.resolve({ data: null }),
  ]);
  const news = (data ?? []) as unknown as NewsRow[];
  const filtered = typeof clubFilter === "string" && news.length ? news[0].club.name : null;

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Actualités
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>{filtered ? `Actualités · ${filtered}` : "Les nouvelles des clubs"}</h1>
          <p>Avancement des projets, remerciements, vie des clubs : chaque actualité est relue par l&apos;équipe Tribune avant publication.</p>
        </div>
      </div>
      <div className="wrap page" style={{ maxWidth: 900 }}>
        <nav className="tabs" aria-label="Filtrer les actualités">
          <Link href="/actualites" aria-current={!clubFilter ? "page" : undefined}>
            Tous les clubs
          </Link>
          {followed ? (
            <Link href={`/actualites?club=${followed.slug}`} aria-current={clubFilter === followed.slug ? "page" : undefined}>
              {followed.name}
            </Link>
          ) : null}
        </nav>
        {news.length ? (
          <ul className="newsfeed">
            {news.map((u) => (
              <li key={u.id} className="panel">
                <div className="club-line">
                  <Crest club={u.club} size={24} />
                  <Link href={`/clubs/${u.club.slug}#actualites`}>
                    <b>{u.club.name}</b>
                  </Link>
                  <span className="small muted">· {formatDate(u.published_at)}</span>
                </div>
                <h3 style={{ margin: "10px 0 6px" }}>{u.title}</h3>
                <p style={{ whiteSpace: "pre-line" }}>{u.body.length > 600 ? `${u.body.slice(0, 600)}…` : u.body}</p>
                {u.campaign ? (
                  <p className="small" style={{ marginTop: 10 }}>
                    <Link href={`/campagnes/${u.campaign.slug}#nouvelles`}>Campagne : {u.campaign.title} →</Link>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <div className="panel empty">
            <p className="muted">Aucune actualité pour l&apos;instant.</p>
          </div>
        )}
        {!viewer ? (
          <p className="small muted" style={{ marginTop: 20 }}>
            <Link href="/inscription?profil=supporter">Créez un compte supporter</Link> et suivez votre club : ses actualités
            et ses nouveaux projets arriveront dans vos notifications.
          </p>
        ) : null}
      </div>
    </>
  );
}
