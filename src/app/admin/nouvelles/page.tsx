import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUpdate } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { formatDate } from "@/lib/format";
import type { CampaignUpdate } from "@/lib/types";

export const metadata: Metadata = { title: "Nouvelles · Back-office" };

export default async function AdminUpdatesPage() {
  await requirePermission("update:review", "/admin/nouvelles");
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaign_updates")
    .select("*, campaign:campaigns(title, slug, club:clubs(name))")
    .eq("status", "pending")
    .order("created_at");
  const updates = (data ?? []) as (CampaignUpdate & { campaign: { title: string; slug: string; club: { name: string } } })[];

  return (
    <>
      <h2>Nouvelles à relire</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Les nouvelles des clubs sont relues avant publication : pas de promesse non tenue, pas de données personnelles.
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        {updates.map((u) => (
          <div className="panel" key={u.id} style={{ display: "grid", gap: 8 }}>
            <span className="small muted">
              {formatDate(u.created_at, true)} · {u.campaign.club.name} ·{" "}
              <Link href={`/campagnes/${u.campaign.slug}`}>{u.campaign.title}</Link>
            </span>
            <h3>{u.title}</h3>
            <p style={{ whiteSpace: "pre-line" }}>{u.body}</p>
            <ActionForm action={reviewUpdate} className="inline-form">
              <input type="hidden" name="update_id" value={u.id} />
              <SubmitButton className="btn btn-primary btn-sm" name="publish" value="true">
                Publier
              </SubmitButton>
              <SubmitButton className="btn btn-ghost btn-sm" name="publish" value="false">
                Refuser
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
