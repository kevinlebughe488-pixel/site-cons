import type { Metadata } from "next";
import Link from "next/link";
import { requireClubSpace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { postNews } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/visuals";
import { formatDate } from "@/lib/format";
import { updateStatusLabel } from "@/lib/labels";
import type { CampaignUpdate } from "@/lib/types";

export const metadata: Metadata = { title: "Actualités du club" };

export default async function ClubNewsPage() {
  const { club } = await requireClubSpace("/club/actualites");
  const supabase = await createClient();
  const [{ data: newsData }, { data: campaignData }] = await Promise.all([
    supabase
      .from("campaign_updates")
      .select("id, campaign_id, club_id, audience, title, body, status, review_note, created_at, published_at")
      .eq("club_id", club.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("campaigns").select("id, title").eq("club_id", club.id),
  ]);
  const news = (newsData ?? []) as CampaignUpdate[];
  const titleOf = new Map(((campaignData ?? []) as { id: string; title: string }[]).map((c) => [c.id, c.title]));

  return (
    <div className="wrap page">
      <div className="split half">
        <div className="panel">
          <h2 style={{ fontSize: "1.5rem" }}>Publier une actualité du club</h2>
          <p className="small muted" style={{ margin: "8px 0 12px" }}>
            Résultats, vie du club, remerciements : publiée tout de suite sur la page du club et envoyée à ses supporters (ceux
            qui le suivent et les contributeurs de ses campagnes). Pour une nouvelle liée à un projet, ou un message aux seuls
            contributeurs, passez par la page de la campagne (rubrique Campagnes).
          </p>
          <p className="small muted" style={{ marginBottom: 12 }}>
            L&apos;équipe Tribune relit les publications et retire celles qui ne respectent pas les règles (promesse non tenue,
            données personnelles, propos injurieux) : vous recevez alors le motif.
          </p>
          {club.status === "verified" ? (
            <ActionForm action={postNews}>
              <input type="hidden" name="audience" value="public" />
              <div className="field">
                <label htmlFor="news-title">Titre</label>
                <input type="text" id="news-title" name="title" maxLength={140} required minLength={3} />
              </div>
              <div className="field">
                <label htmlFor="news-body">Texte</label>
                <textarea id="news-body" name="body" required minLength={10} />
              </div>
              <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Publication…">
                Publier
              </SubmitButton>
            </ActionForm>
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
