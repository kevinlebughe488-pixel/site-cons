import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUpdate, withdrawUpdate } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/visuals";
import { formatDate } from "@/lib/format";
import type { CampaignUpdate } from "@/lib/types";

export const metadata: Metadata = { title: "Nouvelles des clubs · Back-office" };

type Row = CampaignUpdate & {
  campaign: { title: string; slug: string; backers_count: number } | null;
  club: { name: string; slug: string } | null;
};

const TABS = [
  { id: "publiees", label: "Publiées" },
  { id: "retirees", label: "Retirées" },
] as const;

function Audience({ u }: { u: Row }) {
  return u.audience === "contributors" ? (
    <Pill tone="gold">Message aux {u.campaign?.backers_count ?? 0} contributeurs</Pill>
  ) : u.campaign ? (
    <Pill tone="info">Nouvelle publique de la campagne</Pill>
  ) : (
    <Pill tone="info">Actualité publique du club</Pill>
  );
}

function Where({ u }: { u: Row }) {
  return (
    <span className="small muted">
      {formatDate(u.published_at ?? u.created_at, true)} · {u.club ? <Link href={`/clubs/${u.club.slug}`}>{u.club.name}</Link> : "Club"} ·{" "}
      {u.campaign ? <Link href={`/campagnes/${u.campaign.slug}`}>{u.campaign.title}</Link> : "actualité du club"}
    </span>
  );
}

export default async function AdminUpdatesPage(props: PageProps<"/admin/nouvelles">) {
  await requirePermission("update:review", "/admin/nouvelles");
  const { vue } = await props.searchParams;
  const tab = vue === "retirees" ? "retirees" : "publiees";
  const supabase = await createClient();
  const select = "*, campaign:campaigns(title, slug, backers_count), club:clubs(name, slug)";
  const [{ data: pendingData }, { data }] = await Promise.all([
    // Nouvelles envoyées avant la publication directe : encore à relire.
    supabase.from("campaign_updates").select(select).eq("status", "pending").order("created_at"),
    tab === "publiees"
      ? supabase.from("campaign_updates").select(select).eq("status", "published").order("published_at", { ascending: false }).limit(60)
      : supabase
          .from("campaign_updates")
          .select(select)
          .eq("status", "rejected")
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(60),
  ]);
  const pending = (pendingData ?? []) as Row[];
  const updates = (data ?? []) as Row[];

  return (
    <>
      <h2>Nouvelles des clubs</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Les clubs vérifiés publient eux-mêmes leurs nouvelles, actualités et messages aux contributeurs : ils sont en ligne
        tout de suite et les destinataires sont prévenus. Relisez-les ici. Une publication contraire aux règles (promesse non
        tenue, données personnelles, propos injurieux ou trompeurs) se retire avec un motif : elle disparaît des pages
        publiques et des notifications des supporters, et le club reçoit le motif.
      </p>

      {pending.length ? (
        <section style={{ marginBottom: 28 }}>
          <h3 style={{ marginBottom: 10 }}>Envoyées avant la publication directe, à relire ({pending.length})</h3>
          <div style={{ display: "grid", gap: 14 }}>
            {pending.map((u) => (
              <div className="panel" key={u.id} style={{ display: "grid", gap: 8 }}>
                <Where u={u} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Audience u={u} />
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
          </div>
        </section>
      ) : null}

      <nav className="tabs" aria-label="Filtrer les nouvelles">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/nouvelles?vue=${t.id}`} aria-current={t.id === tab ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div style={{ display: "grid", gap: 14 }}>
        {updates.map((u) => (
          <div className="panel" key={u.id} style={{ display: "grid", gap: 8 }}>
            <Where u={u} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Audience u={u} />
              {u.status === "rejected" ? <Pill tone="bad">Retirée</Pill> : <Pill tone="ok">En ligne</Pill>}
            </div>
            <h3>{u.title}</h3>
            <p style={{ whiteSpace: "pre-line" }}>{u.body}</p>
            {u.status === "published" ? (
              <details>
                <summary className="small" style={{ cursor: "pointer", fontWeight: 600, color: "var(--bad)" }}>
                  Retirer la publication
                </summary>
                <ActionForm action={withdrawUpdate} className="inline-form">
                  <input type="hidden" name="update_id" value={u.id} />
                  <input type="text" name="note" required minLength={3} maxLength={500} placeholder="Motif (communiqué au club)" aria-label="Motif du retrait" />
                  <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…" confirm="Retirer cette publication ? Elle disparaîtra des pages publiques et des notifications des supporters.">
                    Retirer
                  </SubmitButton>
                </ActionForm>
              </details>
            ) : u.review_note ? (
              <p className="small muted">Motif du retrait : {u.review_note}</p>
            ) : null}
          </div>
        ))}
        {updates.length === 0 ? (
          <div className="panel empty">
            <p className="muted">{tab === "publiees" ? "Aucune nouvelle publiée pour l'instant." : "Aucune publication retirée."}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
