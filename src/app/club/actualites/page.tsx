import type { Metadata } from "next";
import Link from "next/link";
import { requireClubSpace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Pill } from "@/components/visuals";
import { formatDate } from "@/lib/format";
import { updateStatusLabel } from "@/lib/labels";
import type { CampaignUpdate } from "@/lib/types";
import { NewsForm } from "./NewsForm";

export const metadata: Metadata = { title: "Actualités du club" };

export default async function ClubNewsPage(props: PageProps<"/club/actualites">) {
  const { club } = await requireClubSpace("/club/actualites");
  const { campagne } = await props.searchParams;
  const supabase = await createClient();
  const [{ data: newsData }, { data: campaignData }] = await Promise.all([
    supabase
      .from("campaign_updates")
      .select("id, campaign_id, club_id, audience, title, body, status, review_note, created_at, published_at")
      .eq("club_id", club.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("campaigns").select("id, title, status, backers_count").eq("club_id", club.id).order("created_at", { ascending: false }),
  ]);
  const news = (newsData ?? []) as CampaignUpdate[];
  const campaignRows = (campaignData ?? []) as { id: string; title: string; status: string; backers_count: number }[];
  const titleOf = new Map(campaignRows.map((c) => [c.id, c.title]));
  // Nouvelles possibles une fois la campagne publiée (comme le vérifie la base).
  const newsCampaigns = campaignRows
    .filter((c) => ["published", "suspended", "funded", "failed"].includes(c.status))
    .map((c) => ({ id: c.id, title: c.title, backers: c.backers_count }));

  return (
    <div className="wrap page">
      <div className="split half">
        <div className="panel">
          <h2 style={{ fontSize: "1.5rem" }}>Publier une nouvelle</h2>
          <p className="small muted" style={{ margin: "8px 0 12px" }}>
            Une actualité du club, une nouvelle d&apos;une campagne publiée ou un message à ses seuls contributeurs : tout se publie
            ici, tout de suite, et les destinataires sont prévenus. L&apos;équipe Tribune relit les publications et retire celles qui
            ne respectent pas les règles (promesse non tenue, données personnelles, propos injurieux) : vous recevez alors le motif.
          </p>
          {club.status === "verified" ? (
            <NewsForm campaigns={newsCampaigns} preselected={typeof campagne === "string" ? campagne : null} />
          ) : (
            <p className="small muted">Indisponible tant que le club est suspendu.</p>
          )}
        </div>
        <div className="panel">
          <h2 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Nouvelles et messages publiés</h2>
          {news.length ? (
            news.map((u) => (
              <div className="update" key={u.id}>
                <span className="small muted">
                  {formatDate(u.created_at)} ·{" "}
                  {u.campaign_id ? <Link href={`/club/campagnes/${u.campaign_id}`}>{titleOf.get(u.campaign_id) ?? "Campagne"}</Link> : "Actualité du club"}
                  {u.audience === "contributors" ? " · contributeurs seulement" : ""}
                </span>
                <h4>
                  {u.title} <Pill tone={updateStatusLabel(u).tone}>{updateStatusLabel(u).label}</Pill>
                </h4>
                {u.status === "rejected" && u.review_note ? (
                  <p className="small muted">
                    {u.published_at ? "Motif du retrait" : "Motif"} : {u.review_note}
                  </p>
                ) : null}
              </div>
            ))
          ) : (
            <p className="small muted">Aucune nouvelle pour l&apos;instant.</p>
          )}
        </div>
      </div>
    </div>
  );
}
