import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { moderateComment } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/visuals";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Commentaires · Back-office" };

type Row = {
  id: string;
  body: string;
  author_label: string;
  author_kind: "supporter" | "club";
  status: "visible" | "hidden" | "deleted";
  report_count: number;
  moderation_note: string | null;
  created_at: string;
  campaign: { title: string; slug: string } | null;
};

const TABS = [
  { id: "signales", label: "Signalés" },
  { id: "recents", label: "Récents" },
  { id: "masques", label: "Masqués" },
] as const;

export default async function AdminCommentsPage(props: PageProps<"/admin/commentaires">) {
  await requirePermission("comment:moderate", "/admin/commentaires");
  const { vue } = await props.searchParams;
  const tab = TABS.some((t) => t.id === vue) ? (vue as (typeof TABS)[number]["id"]) : "signales";
  const supabase = await createClient();
  let query = supabase
    .from("campaign_comments")
    .select("id, body, author_label, author_kind, status, report_count, moderation_note, created_at, campaign:campaigns(title, slug)")
    .limit(100);
  if (tab === "signales") query = query.eq("status", "visible").gt("report_count", 0).order("report_count", { ascending: false });
  else if (tab === "masques") query = query.eq("status", "hidden").order("created_at", { ascending: false });
  else query = query.neq("status", "deleted").order("created_at", { ascending: false });
  const { data } = await query;
  const rows = (data ?? []) as unknown as Row[];

  return (
    <>
      <h2>Commentaires</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Les commentaires paraissent tout de suite ; l&apos;équipe masque ceux qui contiennent des insultes, des données
        personnelles, de la publicité ou des accusations sans fondement. Chaque décision est inscrite au journal.
      </p>
      <nav className="tabs" aria-label="Filtrer les commentaires">
        {TABS.map((t) => (
          <Link key={t.id} href={`/admin/commentaires?vue=${t.id}`} aria-current={t.id === tab ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      <div style={{ display: "grid", gap: 14 }}>
        {rows.map((c) => (
          <div className="panel" key={c.id} style={{ display: "grid", gap: 8 }}>
            <span className="small muted">
              {formatDate(c.created_at, true)} · <b>{c.author_label}</b>
              {c.author_kind === "club" ? " (club)" : ""} ·{" "}
              {c.campaign ? <Link href={`/campagnes/${c.campaign.slug}#commentaire-${c.id}`}>{c.campaign.title}</Link> : "—"}
            </span>
            <p style={{ whiteSpace: "pre-line" }}>{c.body}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {c.report_count > 0 ? <Pill tone="warn">{c.report_count} signalement{c.report_count > 1 ? "s" : ""}</Pill> : null}
              {c.status === "hidden" ? <Pill tone="bad">Masqué{c.moderation_note ? ` : ${c.moderation_note}` : ""}</Pill> : null}
            </div>
            <ActionForm action={moderateComment} className="inline-form">
              <input type="hidden" name="comment_id" value={c.id} />
              {c.status === "visible" ? (
                <>
                  <input type="text" name="note" placeholder="Motif du masquage (obligatoire)" aria-label="Motif" />
                  <SubmitButton className="btn btn-primary btn-sm" name="hide" value="true">
                    Masquer
                  </SubmitButton>
                  {c.report_count > 0 ? (
                    <SubmitButton className="btn btn-ghost btn-sm" name="hide" value="false">
                      Conserver
                    </SubmitButton>
                  ) : null}
                </>
              ) : (
                <SubmitButton className="btn btn-ghost btn-sm" name="hide" value="false">
                  Rétablir
                </SubmitButton>
              )}
            </ActionForm>
          </div>
        ))}
        {rows.length === 0 ? (
          <div className="panel empty">
            <p className="muted">{tab === "signales" ? "Aucun commentaire signalé." : "Aucun commentaire."}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
