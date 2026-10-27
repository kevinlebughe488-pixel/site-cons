import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { contributionRef, syncContribution } from "@/lib/payments/service";
import { providerLabel } from "@/lib/payments/providers";
import { formatDate, formatMoney } from "@/lib/format";
import { maskPhone } from "@/lib/phone";
import { CONTRIBUTION_STATUS_LABELS } from "@/lib/labels";
import type { Contribution } from "@/lib/types";
import { StatusPoller } from "./StatusPoller";

export const metadata: Metadata = { title: "Suivi du paiement" };

const FAILURE_HINTS: Record<string, string> = {
  PAYER_LIMIT_REACHED: "Le plafond ou le solde du compte Mobile Money ne permet pas ce paiement.",
  INSUFFICIENT_BALANCE: "Le solde du compte Mobile Money est insuffisant.",
  PAYER_NOT_FOUND: "Ce numéro n'a pas de compte Mobile Money chez cet opérateur.",
  PAYMENT_NOT_APPROVED: "Le paiement n'a pas été validé sur le téléphone à temps.",
  INVALID_PHONE_NUMBER: "Le numéro de téléphone n'est pas valide pour cet opérateur.",
  NOT_FOUND: "L'opérateur n'a jamais reçu la demande de paiement.",
};

export default async function ContributionPage(props: PageProps<"/contributions/[id]">) {
  const { id } = await props.params;
  await requireViewer(`/contributions/${id}`);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const supabase = await createClient();
  const load = () =>
    supabase
      .from("contributions")
      .select("*, campaign:campaigns(title, slug)")
      .eq("id", id)
      .maybeSingle<Contribution & { campaign: { title: string; slug: string } | null }>();

  let { data: c } = await load();
  if (!c) notFound();
  if (c.status === "initiated" || c.status === "pending") {
    try {
      await syncContribution(id);
      ({ data: c } = await load());
    } catch {
      // la passerelle ne répond pas : on affichera l'état actuel et on réessaiera
    }
  }
  if (!c) notFound();
  const open = c.status === "initiated" || c.status === "pending";
  const ok = c.status === "completed";

  return (
    <div className="wrap page" style={{ maxWidth: 640 }}>
      <div className="panel success">
        <div
          className="tick"
          style={ok ? undefined : open ? { background: "var(--info-bg)", color: "var(--info)" } : { background: "var(--bad-bg)", color: "var(--bad)" }}
        >
          {ok ? "✓" : open ? "…" : "!"}
        </div>
        <h1 style={{ fontSize: "2.2rem" }}>
          {ok ? "Merci !" : open ? "Validez le paiement sur votre téléphone" : CONTRIBUTION_STATUS_LABELS[c.status]}
        </h1>
        {open ? (
          <>
            <p>
              Une demande de <b className="num">{formatMoney(c.amount, c.currency)}</b> a été envoyée au{" "}
              <b>{maskPhone(c.payer_phone)}</b> ({providerLabel(c.mmo_provider)}). Entrez votre code secret Mobile Money
              pour confirmer.
            </p>
            <StatusPoller id={c.id} />
          </>
        ) : ok ? (
          <p>
            Votre contribution de <b className="num">{formatMoney(c.amount, c.currency)}</b> à « {c.campaign?.title} » est
            confirmée et inscrite au registre.
          </p>
        ) : c.status === "failed" ? (
          <p>
            Le paiement n&apos;a pas abouti. {FAILURE_HINTS[c.failure_code ?? ""] ?? c.failure_message ?? ""} Aucun montant
            n&apos;a été débité.
          </p>
        ) : (
          <p>Cette contribution a été remboursée ou est en cours de remboursement sur votre compte Mobile Money.</p>
        )}

        <div className="recap num" style={{ width: "100%", maxWidth: 420, textAlign: "left" }}>
          <div>
            <span>Reçu n°</span>
            <b>{contributionRef(c.id)}</b>
          </div>
          <div>
            <span>Date</span>
            <span>{formatDate(c.created_at, true)}</span>
          </div>
          <div>
            <span>Pour le club</span>
            <span>{formatMoney(c.net_amount, c.currency)}</span>
          </div>
          <div>
            <span>Commission (5 %)</span>
            <span>{formatMoney(c.commission, c.currency)}</span>
          </div>
          {c.provider_transaction_id ? (
            <div>
              <span>Référence opérateur</span>
              <span>{c.provider_transaction_id}</span>
            </div>
          ) : null}
          {c.payment_provider === "simulation" ? (
            <div className="small muted">
              <span>Mode</span>
              <span>Simulation (aucun débit réel)</span>
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn-primary" href="/compte">
            Voir mes contributions
          </Link>
          {c.campaign ? (
            <Link className="btn btn-ghost" href={c.status === "failed" ? `/campagnes/${c.campaign.slug}/contribuer` : `/campagnes/${c.campaign.slug}`}>
              {c.status === "failed" ? "Réessayer" : "Retour à la campagne"}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
