import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { closeCampaign, recordPublicationFee, refundCampaign, reviewCampaign, suspendCampaign } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { CampaignPill, Crest, Pill } from "@/components/visuals";
import { CampaignPhotos } from "@/app/club/campagnes/CampaignPhotos";
import { CLUB_STATUS_LABELS, CONTRIBUTION_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatMoney, percent, plural, todayInKinshasa } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import type { ComplianceReport } from "@/lib/compliance";
import { ComplianceReportView } from "@/components/ComplianceReport";
import { CampaignDocuments } from "@/app/club/campagnes/CampaignDocuments";
import {
  REVIEW_CRITERIA,
  type BudgetLine,
  type Campaign,
  type CampaignDocument,
  type CampaignPhoto,
  type Club,
  type Contribution,
  type Milestone,
  type PublicationFee,
} from "@/lib/types";

export const metadata: Metadata = { title: "Instruction · Back-office" };

type Detail = Campaign & { club: Club; budget: BudgetLine[]; milestones: Milestone[]; photos: CampaignPhoto[] };

export default async function AdminCampaignPage(props: PageProps<"/admin/campagnes/[id]">) {
  const { id } = await props.params;
  const { profile } = await requirePermission("backoffice:access", `/admin/campagnes/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const role = profile.role;

  const supabase = await createClient();
  const [{ data: c }, { data: contribs }, { data: fee }, settings, { data: documents }, { data: report }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*, club:clubs(*), budget:campaign_budget_lines(id, position, label, amount, quantity, reference_id), milestones:campaign_milestones(id, position, label, target_label, done_at, proof_note), photos:campaign_photos(id, campaign_id, file_path, caption, taken_on, position, created_at)")
      .eq("id", id)
      .maybeSingle<Detail>(),
    supabase.from("contributions").select("status, amount").eq("campaign_id", id),
    supabase.from("publication_fees").select("*").eq("campaign_id", id).maybeSingle<PublicationFee>(),
    getSettings(supabase),
    supabase.from("campaign_documents").select("*").eq("campaign_id", id).order("created_at"),
    supabase.rpc("campaign_compliance", { p_campaign_id: id }),
  ]);
  if (!c) notFound();
  const control = report as ComplianceReport | null;
  const blocked = control?.level === "block";

  const budget = [...c.budget].sort((a, b) => a.position - b.position);
  const milestones = [...c.milestones].sort((a, b) => a.position - b.position);
  const budgetTotal = budget.reduce((s, b) => s + Number(b.amount), 0);
  const byStatus = new Map<string, { n: number; total: number }>();
  for (const row of (contribs ?? []) as Pick<Contribution, "status" | "amount">[]) {
    const cur = byStatus.get(row.status) ?? { n: 0, total: 0 };
    byStatus.set(row.status, { n: cur.n + 1, total: cur.total + Number(row.amount) });
  }
  const large = Number(c.goal_amount) > 20000;

  return (
    <>
      <div className="crumbs muted">
        <Link href={`/admin/campagnes?statut=${c.status}`}>← Campagnes</Link>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "8px 0 18px" }}>
        <h2>{c.title}</h2>
        <CampaignPill status={c.status} />
      </div>

      <div className="split">
        <div style={{ display: "grid", gap: 20 }}>
          <div className="panel" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Crest club={c.club} size={44} />
            <div style={{ flex: 1 }}>
              <b>{c.club.name}</b>
              <div className="small muted">
                {c.club.city} · président : {c.club.president_name} · {CLUB_STATUS_LABELS[c.club.status]}
              </div>
            </div>
            <Link className="btn btn-ghost btn-sm" href={`/campagnes/${c.slug}`}>
              Page de la campagne
            </Link>
          </div>

          {control ? (
            <div className="panel">
              <h3>Contrôle automatique</h3>
              <p className="small muted" style={{ marginBottom: 12 }}>
                Authenticité et prix, recalculés à l&apos;ouverture de cette page. Un point bloquant empêche la publication.
              </p>
              <ComplianceReportView report={control} showLines />
              {can(role, "campaign:review") ? (
                <p className="small" style={{ marginTop: 10 }}>
                  <Link href="/admin/prix">Référentiel des prix →</Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="panel">
            <h3>Devis des fournisseurs</h3>
            <p className="small muted" style={{ marginBottom: 10 }}>
              Recoupez chaque devis avec le budget et appelez le fournisseur avant de cocher « Authenticité ».
            </p>
            <CampaignDocuments
              campaignId={c.id}
              documents={(documents ?? []) as CampaignDocument[]}
              editable={false}
              removable={can(role, "campaign:review")}
            />
            {(documents ?? []).length === 0 ? (
              <p className="small" style={{ color: "var(--bad)", marginTop: 8 }}>
                Aucun devis envoyé par le club : demandez-lui des corrections. L&apos;équipe n&apos;envoie pas de fichier à sa place.
              </p>
            ) : null}
          </div>

          <div className="panel">
            <h3>Dossier</h3>
            <div className="recap small" style={{ marginBottom: 14 }}>
              <div>
                <span className="muted">Thème</span>
                <span>{c.category}</span>
              </div>
              <div>
                <span className="muted">Objectif</span>
                <b>{formatMoney(c.goal_amount, c.currency)}</b>
              </div>
              <div>
                <span className="muted">Durée de la collecte</span>
                <span>{plural(c.duration_days, "jour")}</span>
              </div>
              <div>
                <span className="muted">{c.published_at ? "Fin de la collecte" : "Fin si publiée aujourd'hui"}</span>
                <span>{formatDate(c.end_date)}</span>
              </div>
              <div>
                <span className="muted">Contribution minimum</span>
                <span>{formatMoney(c.min_contribution, c.currency)}</span>
              </div>
              <div>
                <span className="muted">Maximum par supporter</span>
                <span>{c.max_contribution === null ? "Aucun" : formatMoney(c.max_contribution, c.currency)}</span>
              </div>
              <div>
                <span className="muted">Envoyée en revue</span>
                <span>{formatDate(c.submitted_at, true)}</span>
              </div>
            </div>
            {c.summary ? <p><b>{c.summary}</b></p> : null}
            <p style={{ whiteSpace: "pre-line", marginTop: 8 }}>{c.description || <span className="muted">Pas de description.</span>}</p>
          </div>

          <div className="panel">
            <h3>Photos de la situation actuelle</h3>
            <p className="small muted" style={{ marginBottom: 10 }}>
              Vérifiez qu&apos;elles montrent bien la situation du club (lieu, date) et ne contiennent pas de donnée personnelle.
            </p>
            <CampaignPhotos
              campaignId={c.id}
              photos={[...c.photos].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))}
              coverPath={c.cover_path}
              editable={false}
              removable={can(role, "campaign:review")}
              today={todayInKinshasa()}
            />
          </div>

          <div className="panel">
            <h3>Budget</h3>
            <div className="alloc">
              {budget.map((b) => (
                <div key={b.id} className="row num">
                  <span>
                    {b.label}
                    {Number(b.quantity) !== 1 ? (
                      <span className="muted">
                        {" "}
                        · {Number(b.quantity).toLocaleString("fr-FR")} × {formatMoney(Number(b.amount) / Number(b.quantity), c.currency)}
                      </span>
                    ) : null}
                  </span>
                  <b>{formatMoney(b.amount, c.currency)}</b>
                </div>
              ))}
              <div className="row num" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <b>Total</b>
                <b style={{ color: budgetTotal === Number(c.goal_amount) ? "var(--ok)" : "var(--bad)" }}>
                  {formatMoney(budgetTotal, c.currency)} {budgetTotal === Number(c.goal_amount) ? "= objectif" : "≠ objectif"}
                </b>
              </div>
            </div>
          </div>

          <div className="panel">
            <h3>Jalons</h3>
            <ol className="steps">
              {milestones.map((m, i) => (
                <li key={m.id} className={m.done_at ? "done" : ""}>
                  <span className="dot">{m.done_at ? "✓" : i + 1}</span>
                  <div>
                    <b>{m.label}</b>
                    {m.done_at ? <span className="small muted">Preuve : {m.proof_note}</span> : null}
                  </div>
                  <span className="when">{m.target_label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
          {c.status === "in_review" && can(role, "campaign:review") ? (
            <div className="panel">
              <h3>Décision</h3>
              {large && !can(role, "campaign:approve_large") ? (
                <p className="flash info">Objectif supérieur à 20 000 $ : la publication doit être validée par un administrateur.</p>
              ) : null}
              {blocked ? (
                <p className="flash error">
                  Le contrôle automatique bloque la publication. Demandez des corrections au club (ou corrigez le référentiel des prix
                  s&apos;il est faux).
                </p>
              ) : null}
              <ActionForm action={reviewCampaign}>
                <input type="hidden" name="campaign_id" value={c.id} />
                <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
                  <legend style={{ fontWeight: 700, marginBottom: 6 }}>Critères d&apos;instruction (obligatoires pour publier)</legend>
                  {REVIEW_CRITERIA.map((k) => (
                    <label key={k.id} className="check">
                      <input type="checkbox" name="criteria" value={k.id} />
                      <span>
                        <b>{k.label}</b> · <span className="small muted">{k.hint}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <div className="field">
                  <label htmlFor="note">Note pour le club</label>
                  <textarea id="note" name="note" placeholder="Obligatoire pour demander des corrections ou refuser." />
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <SubmitButton
                    className="btn btn-primary btn-sm"
                    name="decision"
                    value="approve"
                    disabled={blocked}
                    confirm={
                      settings.publication_fee > 0
                        ? `Publier cette campagne ? Les frais d'instruction et de publication (${formatMoney(settings.publication_fee)}) seront facturés au club.`
                        : "Publier cette campagne ?"
                    }
                  >
                    Publier
                  </SubmitButton>
                  <SubmitButton className="btn btn-ghost btn-sm" name="decision" value="request_changes">
                    Demander des corrections
                  </SubmitButton>
                  <SubmitButton className="btn btn-ghost btn-sm" name="decision" value="reject" confirm="Refuser définitivement ce dossier ?">
                    Refuser
                  </SubmitButton>
                </div>
                <p className="small muted">
                  Si la campagne est publiée, les frais d&apos;instruction et de publication du tarif en vigueur (
                  {formatMoney(settings.publication_fee)}) sont facturés au club.
                </p>
              </ActionForm>
            </div>
          ) : null}

          {fee ? (
            <div className="panel" id="frais">
              <h3>Frais d&apos;instruction et de publication</h3>
              <div className="recap small" style={{ marginBottom: 10 }}>
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
                  {fee.paid_at ? <Pill tone="ok">Réglés le {formatDate(fee.paid_at)}</Pill> : <Pill tone="warn">À encaisser</Pill>}
                </div>
                {fee.payment_ref ? (
                  <div>
                    <span className="muted">Référence</span>
                    <span>{fee.payment_ref}</span>
                  </div>
                ) : null}
              </div>
              {!fee.paid_at && can(role, "fee:record") ? (
                <ActionForm action={recordPublicationFee}>
                  <input type="hidden" name="campaign_id" value={c.id} />
                  <div className="field">
                    <label htmlFor="reference">Référence du paiement reçu</label>
                    <input type="text" id="reference" name="reference" maxLength={120} placeholder="Reçu n°…, transaction Mobile Money…" />
                  </div>
                  <SubmitButton className="btn btn-ghost btn-sm" confirm="Confirmer que les frais ont bien été reçus ?">
                    Enregistrer le règlement
                  </SubmitButton>
                </ActionForm>
              ) : null}
              {!fee.paid_at && !can(role, "fee:record") ? (
                <p className="small muted">Le règlement est enregistré par un administrateur.</p>
              ) : null}
            </div>
          ) : null}

          {(c.status === "published" || c.status === "suspended") && can(role, "campaign:suspend") ? (
            <div className="panel">
              <h3>{c.status === "published" ? "Suspendre" : "Réactiver"}</h3>
              <ActionForm action={suspendCampaign}>
                <input type="hidden" name="campaign_id" value={c.id} />
                <input type="hidden" name="suspend" value={String(c.status === "published")} />
                {c.status === "published" ? (
                  <div className="field">
                    <label htmlFor="snote">Motif (communiqué au club)</label>
                    <textarea id="snote" name="note" />
                  </div>
                ) : null}
                {c.status === "suspended" && c.club.status !== "verified" ? (
                  // Même règle que la base : la campagne d'un club suspendu ne collecte pas.
                  <p className="small muted">
                    Le club est « {CLUB_STATUS_LABELS[c.club.status]} » : réactivez d&apos;abord le club depuis la page{" "}
                    <Link href={`/admin/clubs?statut=${c.club.status}`}>Clubs</Link>.
                  </p>
                ) : (
                  <>
                    <SubmitButton className="btn btn-ghost btn-sm">{c.status === "published" ? "Suspendre la campagne" : "Réactiver la campagne"}</SubmitButton>
                    <p className="small muted">
                      {c.status === "published"
                        ? "La collecte s'arrête ; contributeurs et club sont prévenus. À la reprise, la date de fin est repoussée de la durée de la suspension."
                        : "La collecte reprend, avec une date de fin repoussée de la durée de la suspension ; contributeurs et club sont prévenus."}
                    </p>
                  </>
                )}
              </ActionForm>
            </div>
          ) : null}

          {(c.status === "published" || c.status === "suspended") && can(role, "campaign:close") ? (
            <div className="panel">
              <h3>Clôturer</h3>
              <p className="small muted" style={{ marginBottom: 10 }}>
                Tout ou rien : {percent(c.raised_amount, c.goal_amount)} % atteint. La campagne sera{" "}
                {Number(c.raised_amount) >= Number(c.goal_amount) ? "financée" : "non financée et les supporters remboursés"}.
              </p>
              <ActionForm action={closeCampaign}>
                <input type="hidden" name="campaign_id" value={c.id} />
                <SubmitButton className="btn btn-ghost btn-sm" confirm="Clôturer la campagne maintenant ?">
                  Clôturer la campagne
                </SubmitButton>
              </ActionForm>
            </div>
          ) : null}

          {c.status === "failed" && can(role, "transaction:refund") && (byStatus.get("completed")?.n ?? 0) > 0 ? (
            <div className="panel">
              <h3>Rembourser les supporters</h3>
              <p className="small muted" style={{ marginBottom: 10 }}>
                {byStatus.get("completed")?.n} contribution(s) confirmée(s) à rembourser.
              </p>
              <ActionForm action={refundCampaign}>
                <input type="hidden" name="campaign_id" value={c.id} />
                <SubmitButton className="btn btn-primary btn-sm" confirm="Rembourser toutes les contributions confirmées ?">
                  Lancer les remboursements
                </SubmitButton>
              </ActionForm>
            </div>
          ) : null}

          <div className="panel">
            <h3>Contributions</h3>
            <div className="recap small">
              {[...byStatus.entries()].map(([status, v]) => (
                <div key={status}>
                  <span>
                    <Pill tone={status === "completed" ? "ok" : status === "failed" ? "bad" : "muted"}>
                      {CONTRIBUTION_STATUS_LABELS[status as Contribution["status"]]}
                    </Pill>
                  </span>
                  <span className="num">
                    {v.n} · {formatMoney(v.total, c.currency)}
                  </span>
                </div>
              ))}
              {byStatus.size === 0 ? <p className="muted">Aucune contribution.</p> : null}
            </div>
            {can(role, "transaction:read") ? (
              <p style={{ marginTop: 10 }}>
                <Link className="small" href={`/admin/transactions?campagne=${c.id}`}>
                  Voir les transactions →
                </Link>
              </p>
            ) : null}
          </div>
          {c.review_note ? (
            <div className="panel">
              <h4>Dernière note</h4>
              <p className="small">{c.review_note}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
