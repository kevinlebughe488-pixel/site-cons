import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { completeMilestone, postUpdate } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { CampaignPill, Pill, ProgressBar } from "@/components/visuals";
import { formatDate, formatMoney, percent, todayInKinshasa } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import type { BudgetLine, Campaign, CampaignUpdate, Milestone, PublicationFee } from "@/lib/types";
import { CampaignEditor } from "../CampaignEditor";
import { FeesNotice } from "../FeesNotice";

export const metadata: Metadata = { title: "Gérer la campagne" };

type Detail = Campaign & { budget: BudgetLine[]; milestones: Milestone[]; updates: CampaignUpdate[] };

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function ManageCampaignPage(props: PageProps<"/club/campagnes/[id]">) {
  const { id } = await props.params;
  const { erreur } = await props.searchParams;
  const viewer = await requirePermission("club:manage", `/club/campagnes/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: c }, { data: fee }, settings] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "*, budget:campaign_budget_lines(id, position, label, amount), milestones:campaign_milestones(id, position, label, target_label, done_at, proof_note), updates:campaign_updates(id, campaign_id, title, body, status, created_at, published_at)",
      )
      .eq("id", id)
      .maybeSingle<Detail>(),
    supabase.from("publication_fees").select("*").eq("campaign_id", id).maybeSingle<PublicationFee>(),
    getSettings(supabase),
  ]);
  if (!c) notFound();
  if (viewer.club?.id !== c.club_id) redirect("/acces-refuse");

  const editable = c.status === "draft" || c.status === "changes_requested";
  const budget = [...c.budget].sort((a, b) => a.position - b.position);
  const milestones = [...c.milestones].sort((a, b) => a.position - b.position);
  const updates = [...c.updates].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const today = todayInKinshasa();

  return (
    <div className="wrap page" style={{ maxWidth: 1000 }}>
      <div className="crumbs muted">
        <Link href="/club">← Espace club</Link>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "10px 0 20px" }}>
        <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.6rem)" }}>{c.title}</h1>
        <CampaignPill status={c.status} />
      </div>
      {typeof erreur === "string" ? <p className="flash error">Brouillon enregistré, mais pas encore envoyé : {erreur}</p> : null}
      {c.review_note && ["changes_requested", "rejected", "suspended"].includes(c.status) ? (
        <p className={`flash ${c.status === "changes_requested" ? "info" : "error"}`}>
          <b>Note de l&apos;équipe Tribune :</b> {c.review_note}
        </p>
      ) : null}
      {c.status === "in_review" ? (
        <p className="flash info">Envoyée le {formatDate(c.submitted_at)}. L&apos;équipe Tribune instruit le dossier ; vous serez informé de la décision ici.</p>
      ) : null}

      {editable ? <FeesNotice publicationFee={settings.publication_fee} /> : null}
      {editable ? (
        <CampaignEditor
          publicationFee={settings.publication_fee}
          minDate={addDays(today, 14)}
          maxDate={addDays(today, 70)}
          initial={{
            id: c.id,
            title: c.title,
            category: c.category,
            summary: c.summary,
            description: c.description,
            goal: String(Number(c.goal_amount)),
            end_date: c.end_date,
            budget: budget.map((b) => ({ label: b.label, amount: String(Number(b.amount)) })),
            milestones: milestones.map((m) => ({ label: m.label, target: m.target_label })),
          }}
        />
      ) : (
        <div className="split">
          <div style={{ display: "grid", gap: 24 }}>
            <div className="panel">
              <div className="big num">{formatMoney(c.raised_amount, c.currency)}</div>
              <p className="muted num" style={{ margin: "4px 0 12px" }}>
                collectés sur {formatMoney(c.goal_amount, c.currency)} · {percent(c.raised_amount, c.goal_amount)} % ·{" "}
                {c.backers_count} supporters · clôture le {formatDate(c.end_date)}
              </p>
              <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
              {["published", "funded", "failed"].includes(c.status) ? (
                <p style={{ marginTop: 14 }}>
                  <Link href={`/campagnes/${c.slug}`}>Voir la page publique →</Link>
                </p>
              ) : null}
            </div>

            <div>
              <h2 style={{ fontSize: "1.6rem", marginBottom: 12 }}>Jalons et preuves</h2>
              <div className="rowlist">
                {milestones.map((m, i) => (
                  <div className="panel" key={m.id} style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <b>
                        {i + 1}. {m.label}
                      </b>
                      <span className="small muted">{m.target_label}</span>
                    </div>
                    {m.done_at ? (
                      <p className="small">
                        <Pill tone="ok">Atteint le {formatDate(m.done_at)}</Pill> {m.proof_note}
                      </p>
                    ) : ["published", "funded"].includes(c.status) ? (
                      <ActionForm action={completeMilestone} className="inline-form">
                        <input type="hidden" name="milestone_id" value={m.id} />
                        <input type="hidden" name="campaign_id" value={c.id} />
                        <input type="text" name="proof" placeholder="Preuve : facture n°…, photos publiées le…" aria-label="Preuve" />
                        <SubmitButton className="btn btn-ghost btn-sm">Marquer atteint</SubmitButton>
                      </ActionForm>
                    ) : (
                      <span className="small muted">À venir</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
            {fee ? (
              <div className="panel">
                <h3>Frais d&apos;instruction et de publication</h3>
                <div className="recap small">
                  <div>
                    <span className="muted">Montant</span>
                    <b className="num">{formatMoney(fee.amount, fee.currency)}</b>
                  </div>
                  <div>
                    <span className="muted">Facturés le</span>
                    <span>{formatDate(fee.invoiced_at)}</span>
                  </div>
                  <div>
                    <span className="muted">Statut</span>
                    {fee.paid_at ? <Pill tone="ok">Réglés le {formatDate(fee.paid_at)}</Pill> : <Pill tone="warn">À régler</Pill>}
                  </div>
                </div>
                {fee.paid_at ? null : (
                  <p className="small muted" style={{ marginTop: 10 }}>
                    L&apos;équipe Tribune vous indique comment les régler (Mobile Money ou virement). Gardez le reçu : sa
                    référence est enregistrée ici.
                  </p>
                )}
              </div>
            ) : c.status === "in_review" && settings.publication_fee > 0 ? (
              <div className="panel">
                <h3>Frais</h3>
                <p className="small">
                  Si la campagne est publiée : <b className="num">{formatMoney(settings.publication_fee)}</b> de frais
                  d&apos;instruction et de publication, puis 5 % des fonds collectés si l&apos;objectif est atteint.
                </p>
              </div>
            ) : null}
            {["published", "suspended", "funded", "failed"].includes(c.status) ? (
              <div className="panel">
                <h3>Publier une nouvelle</h3>
                <ActionForm action={postUpdate}>
                  <input type="hidden" name="campaign_id" value={c.id} />
                  <div className="field">
                    <label htmlFor="title">Titre</label>
                    <input type="text" id="title" name="title" />
                  </div>
                  <div className="field">
                    <label htmlFor="body">Texte</label>
                    <textarea id="body" name="body" placeholder="Où en est le projet ?" />
                  </div>
                  <SubmitButton className="btn btn-ghost btn-sm">Envoyer pour relecture</SubmitButton>
                  <p className="small muted">Chaque nouvelle est relue par Tribune avant publication.</p>
                </ActionForm>
              </div>
            ) : null}
            {updates.length ? (
              <div className="panel">
                <h3>Nouvelles envoyées</h3>
                {updates.map((u) => (
                  <div className="update" key={u.id}>
                    <span className="small muted">
                      {formatDate(u.created_at)} ·{" "}
                      <Pill tone={u.status === "published" ? "ok" : u.status === "pending" ? "info" : "bad"}>
                        {u.status === "published" ? "Publiée" : u.status === "pending" ? "En relecture" : "Refusée"}
                      </Pill>
                    </span>
                    <h4>{u.title}</h4>
                  </div>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
