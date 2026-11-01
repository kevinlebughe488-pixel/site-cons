import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUpdate } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/visuals";
import { formatDate } from "@/lib/format";
import type { CampaignUpdate } from "@/lib/types";

export const metadata: Metadata = { title: "Nouvelles · Back-office" };

type Row = CampaignUpdate & {
  campaign: { title: string; slug: string; backers_count: number } | null;
  club: { name: string; slug: string } | null;
};

export default async function AdminUpdatesPage() {
  await requirePermission("update:review", "/admin/nouvelles");
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaign_updates")
    .select("*, campaign:campaigns(title, slug, backers_count), club:clubs(name, slug)")
    .eq("status", "pending")
    .order("created_at");
  const updates = (data ?? []) as Row[];

  return (
    <>
      <h2>Nouvelles à relire</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Nouvelles des campagnes, actualités des clubs et messages réservés aux contributeurs sont relus avant
        publication : pas de promesse non tenue, pas de données personnelles. À la publication, les destinataires sont
        prévenus dans leurs notifications.
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        {updates.map((u) => (
          <div className="panel" key={u.id} style={{ display: "grid", gap: 8 }}>
            <span className="small muted">
              {formatDate(u.created_at, true)} · {u.club?.name ?? "Club"} ·{" "}
              {u.campaign ? <Link href={`/campagnes/${u.campaign.slug}`}>{u.campaign.title}</Link> : "actualité du club"}
            </span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {u.audience === "contributors" ? (
                <Pill tone="gold">Message aux {u.campaign?.backers_count ?? 0} contributeurs</Pill>
              ) : u.campaign ? (
                <Pill tone="info">Nouvelle publique de la campagne</Pill>
              ) : (
                <Pill tone="info">Actualité publique du club</Pill>
              )}
            </div>
            <h3>{u.title}</h3>
            <p style={{ whiteSpace: "pre-line" }}>{u.body}</p>
            <ActionForm action={reviewUpdate} className="inline-form">
              <input type="hidden" name="update_id" value={u.id} />
              {/* Entrée dans le champ du motif = refus (premier bouton du formulaire), jamais une publication. */}
              <input type="text" name="note" placeholder="Motif si vous refusez (communiqué au club)" aria-label="Motif du refus" />
              <SubmitButton className="btn btn-ghost btn-sm" name="publish" value="false">
                Refuser
              </SubmitButton>
              <SubmitButton className="btn btn-primary btn-sm" name="publish" value="true">
                Publier
              </SubmitButton>
            </ActionForm>
          </div>
        ))}
        {updates.length === 0 ? (
          <div className="panel empty">
            <p className="muted">Aucune nouvelle en attente.</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
