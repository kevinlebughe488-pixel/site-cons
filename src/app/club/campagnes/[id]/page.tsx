import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { completeMilestone, postNews } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { CampaignPill, Pill, ProgressBar } from "@/components/visuals";
import { campaignTiming, formatDate, formatMoney, percent, plural, todayInKinshasa } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { listPriceReferences } from "@/lib/campaigns";
import type { ComplianceReport } from "@/lib/compliance";
import type { BudgetLine, Campaign, CampaignDocument, CampaignPhoto, CampaignUpdate, Milestone, PublicationFee } from "@/lib/types";
import { ComplianceReportView } from "@/components/ComplianceReport";
import { CampaignDocuments } from "../CampaignDocuments";
import { CampaignEditor } from "../CampaignEditor";
import { CampaignPhotos } from "../CampaignPhotos";
import { FeesNotice } from "../FeesNotice";

export const metadata: Metadata = { title: "Gérer la campagne" };

type Detail = Campaign & { budget: BudgetLine[]; milestones: Milestone[]; updates: CampaignUpdate[]; photos: CampaignPhoto[] };

export default async function ManageCampaignPage(props: PageProps<"/club/campagnes/[id]">) {
  const { id } = await props.params;
  const { erreur } = await props.searchParams;
  const viewer = await requirePermission("club:manage", `/club/campagnes/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: c }, { data: fee }, settings, references, { data: documents }, { data: report }] = await Promise.all([
    supabase
      .from("campaigns")
      .select(
        "*, budget:campaign_budget_lines(id, position, label, amount, quantity, reference_id), milestones:campaign_milestones(id, position, label, target_label, done_at, proof_note), updates:campaign_updates(id, campaign_id, club_id, audience, title, body, status, review_note, created_at, published_at), photos:campaign_photos(id, campaign_id, file_path, caption, taken_on, position, created_at)",
      )
      .eq("id", id)
      .maybeSingle<Detail>(),
    supabase.from("publication_fees").select("*").eq("campaign_id", id).maybeSingle<PublicationFee>(),
    getSettings(supabase),
    listPriceReferences(supabase),
    supabase.from("campaign_documents").select("*").eq("campaign_id", id).order("created_at"),
    supabase.rpc("campaign_compliance", { p_campaign_id: id }),
  ]);
  const docs = (documents ?? []) as CampaignDocument[];
  const control = report as ComplianceReport | null;
  if (!c) notFound();
  if (viewer.club?.id !== c.club_id) redirect("/acces-refuse");

  const editable = c.status === "draft" || c.status === "changes_requested";
  const budget = [...c.budget].sort((a, b) => a.position - b.position);
  const milestones = [...c.milestones].sort((a, b) => a.position - b.position);
  const updates = [...c.updates].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const photos = [...c.photos].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
  const timing = campaignTiming(c);

  return (
    <div className="wrap page">
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
        <div className="split">
          <CampaignEditor
            publicationFee={settings.publication_fee}
            today={todayInKinshasa()}
            references={references}
            initial={{
              id: c.id,
              title: c.title,
              category: c.category,
              summary: c.summary,
              description: c.description,
              goal: String(Number(c.goal_amount)),
              duration_days: String(c.duration_days),
              min_contribution: String(Number(c.min_contribution)),
              max_contribution: c.max_contribution === null ? "" : String(Number(c.max_contribution)),
              budget: budget.map((b) => ({
                label: b.label,
                amount: String(Number(b.amount)),
                quantity: String(Number(b.quantity)),
                reference_id: b.reference_id ?? "",
              })),
              milestones: milestones.map((m) => ({ label: m.label, target: m.target_label })),
            }}
          />
          <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
            {control ? (
              <div className="panel">
                <h3>Contrôle avant envoi</h3>
                <ComplianceReportView report={control} />
                <p className="small muted" style={{ marginTop: 10 }}>
                  Mis à jour à chaque enregistrement. Un point rouge empêche l&apos;envoi en revue.
                </p>
              </div>
            ) : null}
            <div className="panel">
              <h3>Photos de la situation actuelle</h3>
              <p className="small muted" style={{ marginBottom: 10 }}>
                Montrez aux supporters de quoi il s&apos;agit : la pelouse aujourd&apos;hui, le vestiaire, le matériel usé… Jusqu&apos;à 6
                photos, chacune avec une légende.
              </p>
              <CampaignPhotos campaignId={c.id} photos={photos} coverPath={c.cover_path} editable today={todayInKinshasa()} />
            </div>
            <div className="panel">
              <h3>Devis des fournisseurs</h3>
              <p className="small muted" style={{ marginBottom: 10 }}>
                L&apos;équipe Tribune contacte le fournisseur pour vérifier que la campagne est réelle et les prix justes.
              </p>
              <CampaignDocuments campaignId={c.id} documents={docs} editable />
            </div>
          </aside>
        </div>
      ) : (
        <div className="split">
          <div style={{ display: "grid", gap: 24 }}>
            <div className="panel">
              <div className="big num">{formatMoney(c.raised_amount, c.currency)}</div>
              <p className="muted num" style={{ margin: "4px 0 12px" }}>
                collectés sur {formatMoney(c.goal_amount, c.currency)} · {percent(c.raised_amount, c.goal_amount)} % ·{" "}
                {plural(c.backers_count, "supporter")} · {c.status === "in_review" ? `durée prévue : ${plural(c.duration_days, "jour")}` : `fin le ${formatDate(c.end_date)}`}
              </p>
              <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
              <div className="terms small" style={{ marginTop: 14 }}>
                <div>
                  <span>Contribution minimum</span>
                  <b className="num">{formatMoney(c.min_contribution, c.currency)}</b>
                </div>
                <div>
                  <span>Maximum par supporter</span>
                  <b className="num">{c.max_contribution === null ? "Aucun" : formatMoney(c.max_contribution, c.currency)}</b>
                </div>
                <div>
                  <span>{timing.label}</span>
                  <b className="num">{timing.value}</b>
                </div>
              </div>
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
            {docs.length ? (
              <div className="panel">
                <h3>Devis des fournisseurs</h3>
                <CampaignDocuments campaignId={c.id} documents={docs} editable={false} />
              </div>
            ) : null}
            {photos.length ? (
              <div className="panel">
                <h3>Photos de la situation actuelle</h3>
                <CampaignPhotos campaignId={c.id} photos={photos} coverPath={c.cover_path} editable={false} today={todayInKinshasa()} />
                <p className="small muted" style={{ marginTop: 8 }}>Pour les changer, écrivez à l&apos;équipe Tribune.</p>
              </div>
            ) : null}
            {["published", "suspended", "funded", "failed"].includes(c.status) ? (
              <div className="panel">
                <h3>Publier une nouvelle</h3>
                <ActionForm action={postNews}>
                  <input type="hidden" name="campaign_id" value={c.id} />
                  <fieldset className="audience">
                    <legend className="small" style={{ fontWeight: 700 }}>
                      Destinataires
                    </legend>
                    <label className="check">
                      <input type="radio" name="audience" value="public" defaultChecked />
                      <span>
                        <b>Tout le monde</b> · <span className="small muted">publiée sur la page de la campagne, contributeurs prévenus</span>
                      </span>
                    </label>
                    <label className="check">
                      <input type="radio" name="audience" value="contributors" />
                      <span>
                        <b>Seulement les contributeurs</b> ·{" "}
                        <span className="small muted">message réservé aux {plural(c.backers_count, "supporter")} qui ont contribué</span>
                      </span>
                    </label>
                  </fieldset>
                  <div className="field">
                    <label htmlFor="title">Titre</label>
                    <input type="text" id="title" name="title" maxLength={140} />
                  </div>
                  <div className="field">
                    <label htmlFor="body">Texte</label>
                    <textarea id="body" name="body" placeholder="Où en est le projet ? Un merci, une échéance, une photo publiée…" />
                  </div>
                  <SubmitButton className="btn btn-ghost btn-sm">Envoyer pour relecture</SubmitButton>
                  <p className="small muted">Chaque nouvelle et chaque message sont relus par Tribune avant publication.</p>
                </ActionForm>
              </div>
            ) : null}
            {updates.length ? (
              <div className="panel">
                <h3>Nouvelles envoyées</h3>
                {updates.map((u) => (
                  <div className="update" key={u.id}>
                    <span className="small muted">
                      {formatDate(u.created_at)} · {u.audience === "contributors" ? "contributeurs seulement · " : ""}
                      <Pill tone={u.status === "published" ? "ok" : u.status === "pending" ? "info" : "bad"}>
                        {u.status === "published" ? "Publiée" : u.status === "pending" ? "En relecture" : "Refusée"}
                      </Pill>
                    </span>
                    <h4>{u.title}</h4>
                    {u.status === "rejected" && u.review_note ? <p className="small muted">Motif : {u.review_note}</p> : null}
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
