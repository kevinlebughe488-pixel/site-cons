import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { checkPawapay, refreshTransaction, refundContribution } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/visuals";
import { CONTRIBUTION_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { providerLabel } from "@/lib/payments/providers";
import { contributionRef, syncStaleTransactions } from "@/lib/payments/service";
import type { Contribution, ContributionStatus, Refund } from "@/lib/types";

export const metadata: Metadata = { title: "Transactions · Back-office" };

const STATUSES: ContributionStatus[] = ["completed", "pending", "initiated", "failed", "refund_pending", "refunded"];
const TONE: Record<ContributionStatus, "ok" | "warn" | "bad" | "info" | "muted"> = {
  initiated: "info",
  pending: "info",
  completed: "ok",
  failed: "bad",
  refund_pending: "warn",
  refunded: "muted",
};

type Row = Contribution & {
  campaign: { title: string; slug: string } | null;
  profile: { first_name: string; last_name: string; email: string | null } | null;
  refunds: Pick<Refund, "id" | "status" | "reason" | "created_at">[];
};

export default async function AdminTransactionsPage(props: PageProps<"/admin/transactions">) {
  const { profile } = await requirePermission("transaction:read", "/admin/transactions");
  const sp = await props.searchParams;
  const status = (STATUSES as string[]).includes(String(sp.statut)) ? (sp.statut as ContributionStatus) : "";
  const campaignId = typeof sp.campagne === "string" && /^[0-9a-f-]{36}$/.test(sp.campagne) ? sp.campagne : "";

  // Filet de sécurité si des notifications pawaPay se sont perdues.
  await syncStaleTransactions().catch(() => undefined);

  const supabase = await createClient();
  let query = supabase
    .from("contributions")
    .select("*, campaign:campaigns(title, slug), profile:profiles(first_name, last_name, email), refunds(id, status, reason, created_at)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  if (campaignId) query = query.eq("campaign_id", campaignId);
  const { data } = await query;
  const rows = (data ?? []) as Row[];
  const total = rows.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.amount), 0);
  const exportQuery = new URLSearchParams({ ...(status ? { statut: status } : {}), ...(campaignId ? { campagne: campaignId } : {}) });

  return (
    <>
      <h2>Transactions</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Chaque contribution, son état chez l&apos;opérateur et sa commission. Les paiements restés en attente sont
        revérifiés auprès de pawaPay à l&apos;ouverture de cette page.
      </p>
      <div className="filters">
        <form className="filters" method="get" style={{ margin: 0 }}>
          <select name="statut" defaultValue={status} aria-label="Statut">
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {CONTRIBUTION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {campaignId ? <input type="hidden" name="campagne" value={campaignId} /> : null}
          <button className="btn btn-ghost btn-sm" type="submit">
            Filtrer
          </button>
        </form>
        {can(profile.role, "transaction:export") ? (
          <a className="btn btn-ghost btn-sm" href={`/admin/transactions/export?${exportQuery}`}>
            Exporter (CSV)
          </a>
        ) : null}
        <ActionForm action={checkPawapay} className="inline-form">
          <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Vérification…">
            Vérifier la configuration pawaPay
          </SubmitButton>
        </ActionForm>
      </div>
      {campaignId ? (
        <p className="small" style={{ marginBottom: 10 }}>
          Filtré sur une campagne · <Link href="/admin/transactions">tout afficher</Link>
        </p>
      ) : null}
      <p className="small muted" style={{ marginBottom: 10 }}>
        {rows.length} transaction(s) affichée(s) · {formatMoney(total)} confirmés
      </p>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Référence</th>
              <th>Supporter</th>
              <th>Campagne</th>
              <th>Paiement</th>
              <th className="r">Montant</th>
              <th className="r">Commission</th>
              <th>État</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pendingRefund = r.refunds.find((x) => x.status === "pending");
              return (
                <tr key={r.id}>
                  <td className="num small" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(r.created_at, true)}
                  </td>
                  <td className="num small">
                    {contributionRef(r.id)}
                    {r.provider_transaction_id ? <div className="muted">{r.provider_transaction_id}</div> : null}
                  </td>
                  <td className="small">
                    {r.profile ? `${r.profile.first_name} ${r.profile.last_name}` : "—"}
                    <div className="muted">{r.profile?.email}</div>
                  </td>
                  <td className="small">{r.campaign ? <Link href={`/campagnes/${r.campaign.slug}`}>{r.campaign.title}</Link> : "—"}</td>
                  <td className="small">
                    {providerLabel(r.mmo_provider)}
                    <div className="muted num">{formatPhone(r.payer_phone)}</div>
                    {r.payment_provider === "simulation" ? <span className="mode-badge">simulation</span> : null}
                  </td>
                  <td className="r num">{formatMoney(r.amount, r.currency)}</td>
                  <td className="r num">{formatMoney(r.commission, r.currency)}</td>
                  <td className="small">
                    <Pill tone={TONE[r.status]}>{CONTRIBUTION_STATUS_LABELS[r.status]}</Pill>
                    {r.failure_code ? <div className="muted">{r.failure_message ?? r.failure_code}</div> : null}
                    {r.status === "initiated" || r.status === "pending" || pendingRefund ? (
                      <ActionForm action={refreshTransaction} className="inline-form">
                        <input type="hidden" name="id" value={pendingRefund?.id ?? r.id} />
                        <input type="hidden" name="kind" value={pendingRefund ? "refund" : "deposit"} />
                        <SubmitButton className="link-btn" pendingLabel="…">
                          Revérifier
                        </SubmitButton>
                      </ActionForm>
                    ) : null}
                    {r.status === "completed" && can(profile.role, "transaction:refund") ? (
                      <details>
                        <summary className="small">Rembourser</summary>
                        <ActionForm action={refundContribution}>
                          <input type="hidden" name="contribution_id" value={r.id} />
                          <input type="text" name="reason" placeholder="Motif" aria-label="Motif du remboursement" />
                          <SubmitButton className="btn btn-ghost btn-sm" confirm="Rembourser cette contribution ?">
                            Confirmer
                          </SubmitButton>
                        </ActionForm>
                      </details>
                    ) : null}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  Aucune transaction.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
