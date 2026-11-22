import type { Metadata } from "next";
import Link from "next/link";
import { requireClubSpace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CampaignPill } from "@/components/visuals";
import { formatMoney } from "@/lib/format";
import type { Campaign } from "@/lib/types";

export const metadata: Metadata = { title: "Campagnes du club" };

const NEXT_STEP: Partial<Record<Campaign["status"], string>> = {
  draft: "Terminer le parcours puis envoyer en revue",
  changes_requested: "Corriger selon la note de l'équipe Tribune",
  in_review: "En revue par l'équipe Tribune",
  published: "Donner des nouvelles au moins une fois par mois",
  suspended: "Répondre à l'équipe Tribune",
  funded: "Prouver chaque jalon pour recevoir les fonds",
  failed: "Les contributeurs sont remboursés",
  rejected: "Dossier refusé",
};

export default async function ClubCampaignsPage() {
  const { club } = await requireClubSpace("/club/campagnes");
  const supabase = await createClient();
  const [{ data }, { data: fees }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("club_id", club.id).order("created_at", { ascending: false }),
    supabase.from("publication_fees").select("campaign_id").is("paid_at", null),
  ]);
  const campaigns = (data ?? []) as Campaign[];
  const unpaid = new Set((fees ?? []).map((f: { campaign_id: string }) => f.campaign_id));

  return (
    <div className="wrap page">
      <div className="sec-head">
        <h2 style={{ fontSize: "1.8rem" }}>Campagnes</h2>
        {club.status === "verified" ? (
          <Link className="btn btn-primary btn-sm" href="/club/campagnes/nouvelle">
            Nouvelle campagne
          </Link>
        ) : null}
      </div>
      {campaigns.length ? (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Campagne</th>
                <th>Statut</th>
                <th className="r">Collecté</th>
                <th className="r">Objectif</th>
                <th>Prochaine étape</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/club/campagnes/${c.id}`}>{c.title}</Link>
                  </td>
                  <td>
                    <CampaignPill status={c.status} />
                  </td>
                  <td className="r num">{formatMoney(c.raised_amount, c.currency)}</td>
                  <td className="r num">{formatMoney(c.goal_amount, c.currency)}</td>
                  <td className="small">{unpaid.has(c.id) ? "Régler les frais d'instruction et de publication" : (NEXT_STEP[c.status] ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel empty">
          <p>
            <b>Aucune campagne pour l&apos;instant.</b>
          </p>
          {club.status === "verified" ? (
            <p className="small muted">Créez votre première campagne : elle reste un brouillon tant que vous ne l&apos;envoyez pas en revue.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
