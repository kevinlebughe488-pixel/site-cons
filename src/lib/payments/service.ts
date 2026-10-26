import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeGateway, gatewayFor } from "@/lib/payments";
import { PaymentGatewayError, type RemoteTransaction } from "@/lib/payments/types";
import { COMMISSION_RATE, round2 } from "@/lib/format";
import type { Contribution, PaymentProviderName, Refund } from "@/lib/types";

// Logique de paiement côté serveur. Seul ce module écrit dans les tables
// « contributions » et « refunds », avec la clé service_role.
// Règle d'or : on ne croit jamais le contenu d'une notification reçue ;
// on redemande toujours l'état de la transaction à pawaPay.

const OPEN_STATUSES = ["initiated", "pending"] as const;
/** Un dépôt inconnu de pawaPay après ce délai est considéré comme échoué. */
const NOT_FOUND_GRACE_MS = 15 * 60_000;

export function contributionRef(id: string): string {
  return `TRB-${id.slice(0, 8).toUpperCase()}`;
}

async function audit(actorId: string | null, action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}) {
  const admin = createAdminClient();
  await admin.from("audit_log").insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, details });
}

export async function recordPaymentEvent(provider: PaymentProviderName, kind: string, externalId: string | null, payload: unknown) {
  const admin = createAdminClient();
  await admin.from("payment_events").insert({ provider, kind, external_id: externalId, payload: payload ?? {} });
}

type StartContribution = {
  userId: string;
  campaign: { id: string; slug: string; currency: "USD" | "CDF"; clubShortName: string };
  amount: number;
  phone: string;
  provider: string;
  anonymous: boolean;
};

/** Enregistre la contribution puis envoie la demande de paiement au téléphone du supporter. */
export async function startContribution(input: StartContribution): Promise<string> {
  const admin = createAdminClient();
  const gateway = activeGateway();
  const id = randomUUID();
  const commission = round2(input.amount * COMMISSION_RATE);

  const { error } = await admin.from("contributions").insert({
    id,
    campaign_id: input.campaign.id,
    user_id: input.userId,
    amount: input.amount,
    currency: input.campaign.currency,
    commission,
    net_amount: round2(input.amount - commission),
    status: "initiated",
    payment_provider: gateway.name,
    mmo_provider: input.provider,
    payer_phone: input.phone,
    anonymous: input.anonymous,
  });
  if (error) throw new Error(`Enregistrement de la contribution impossible : ${error.message}`);

  try {
    const result = await gateway.initiateDeposit({
      depositId: id,
      amount: input.amount,
      currency: input.campaign.currency,
      phoneNumber: input.phone,
      provider: input.provider,
      customerMessage: `Tribune ${input.campaign.clubShortName}`.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 22),
      clientReferenceId: contributionRef(id),
      metadata: { campaign: input.campaign.slug, contribution: contributionRef(id) },
    });

    if (result.status === "REJECTED") {
      await admin
        .from("contributions")
        .update({ status: "failed", failure_code: result.failureCode ?? "REJECTED", failure_message: result.failureMessage ?? null })
        .eq("id", id);
      await audit(input.userId, "contribution.refusee", "contribution", id, { code: result.failureCode });
    } else {
      await admin.from("contributions").update({ status: "pending" }).eq("id", id).eq("status", "initiated");
      await audit(input.userId, "contribution.demandee", "contribution", id, {
        montant: input.amount,
        devise: input.campaign.currency,
        operateur: input.provider,
        passerelle: gateway.name,
      });
    }
  } catch (error) {
    // Résultat inconnu (coupure réseau, délai dépassé) : la contribution reste « initiated »
    // et son état sera redemandé à pawaPay depuis la page de suivi.
    await audit(input.userId, "contribution.erreur_passerelle", "contribution", id, {
      message: (error as Error).message,
      statut_http: error instanceof PaymentGatewayError ? error.httpStatus : undefined,
    });
  }
  return id;
}

/** Redemande l'état d'un dépôt à la passerelle et met la contribution à jour. */
export async function syncContribution(id: string): Promise<Contribution | null> {
  const admin = createAdminClient();
  const { data: row } = await admin.from("contributions").select("*").eq("id", id).maybeSingle<Contribution>();
  if (!row || !OPEN_STATUSES.includes(row.status as (typeof OPEN_STATUSES)[number])) return row ?? null;

  const remote: RemoteTransaction = await gatewayFor(row.payment_provider).getDeposit(id, {
    createdAt: row.created_at,
    phoneNumber: row.payer_phone,
  });

  let patch: Partial<Contribution> | null = null;
  let action: string | null = null;
  if (!remote.found) {
    if (Date.now() - new Date(row.created_at).getTime() > NOT_FOUND_GRACE_MS) {
      patch = { status: "failed", failure_code: "NOT_FOUND", failure_message: "Paiement jamais reçu par l'opérateur." };
      action = "contribution.echouee";
    }
  } else if (remote.status === "COMPLETED") {
    patch = { status: "completed", provider_transaction_id: remote.providerTransactionId ?? null, completed_at: new Date().toISOString() };
    action = "contribution.confirmee";
  } else if (remote.status === "FAILED") {
    patch = { status: "failed", failure_code: remote.failureCode ?? "FAILED", failure_message: remote.failureMessage ?? null };
    action = "contribution.echouee";
  } else if (row.status === "initiated") {
    patch = { status: "pending" };
  }
  if (!patch) return row;

  const { data: updated } = await admin
    .from("contributions")
    .update(patch)
    .eq("id", id)
    .in("status", [...OPEN_STATUSES])
    .select("*")
    .maybeSingle<Contribution>();
  if (updated && action) {
    await audit(null, action, "contribution", id, {
      montant: row.amount,
      reference_operateur: updated.provider_transaction_id,
      code: updated.failure_code,
    });
  }
  return updated ?? row;
}

/** Lance le remboursement d'une contribution confirmée. */
export async function startRefund(contributionId: string, reason: string, actorId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: contribution } = await admin
    .from("contributions")
    .select("*")
    .eq("id", contributionId)
    .maybeSingle<Contribution>();
  if (!contribution) throw new Error("Contribution introuvable.");
  if (contribution.status !== "completed") throw new Error("Seule une contribution confirmée peut être remboursée.");

  const refundId = randomUUID();
  const { error } = await admin.from("refunds").insert({
    id: refundId,
    contribution_id: contributionId,
    amount: contribution.amount,
    currency: contribution.currency,
    reason,
    requested_by: actorId,
  });
  if (error) throw new Error(`Un remboursement est déjà en cours pour cette contribution.`);
  await admin.from("contributions").update({ status: "refund_pending" }).eq("id", contributionId).eq("status", "completed");
  await audit(actorId, "remboursement.demande", "contribution", contributionId, { motif: reason, montant: contribution.amount });

  try {
    const result = await gatewayFor(contribution.payment_provider).initiateRefund({
      refundId,
      depositId: contributionId,
      amount: Number(contribution.amount),
      currency: contribution.currency,
      clientReferenceId: contributionRef(contributionId),
    });
    if (result.status === "REJECTED") {
      await finishRefund(refundId, contributionId, false, result.failureCode, result.failureMessage);
      throw new Error(`Remboursement refusé par pawaPay : ${result.failureMessage ?? result.failureCode ?? "motif inconnu"}`);
    }
  } catch (error) {
    if (!(error instanceof PaymentGatewayError)) throw error;
    // Résultat inconnu : le remboursement reste en attente et sera vérifié plus tard.
  }
}

async function finishRefund(refundId: string, contributionId: string, ok: boolean, failureCode?: string, failureMessage?: string) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data: updated } = await admin
    .from("refunds")
    .update(ok ? { status: "completed", completed_at: now } : { status: "failed", failure_code: failureCode ?? "FAILED", failure_message: failureMessage ?? null })
    .eq("id", refundId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!updated) return;
  await admin
    .from("contributions")
    .update(ok ? { status: "refunded", refunded_at: now } : { status: "completed" })
    .eq("id", contributionId)
    .eq("status", "refund_pending");
  await audit(null, ok ? "remboursement.confirme" : "remboursement.echoue", "contribution", contributionId, { code: failureCode });
}

/** Redemande l'état d'un remboursement à la passerelle. */
export async function syncRefund(refundId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: refund } = await admin.from("refunds").select("*").eq("id", refundId).maybeSingle<Refund>();
  if (!refund || refund.status !== "pending") return;
  const { data: contribution } = await admin
    .from("contributions")
    .select("payment_provider, payer_phone")
    .eq("id", refund.contribution_id)
    .single<Pick<Contribution, "payment_provider" | "payer_phone">>();
  if (!contribution) return;

  const remote = await gatewayFor(contribution.payment_provider).getRefund(refundId, {
    createdAt: refund.created_at,
    phoneNumber: contribution.payer_phone,
  });
  if (remote.found && remote.status === "COMPLETED") await finishRefund(refundId, refund.contribution_id, true);
  if (remote.found && remote.status === "FAILED") {
    await finishRefund(refundId, refund.contribution_id, false, remote.failureCode, remote.failureMessage);
  }
}

/**
 * Filet de sécurité si une notification pawaPay s'est perdue : revérifie les
 * paiements et remboursements restés en attente depuis plus d'une minute.
 */
export async function syncStaleTransactions(limit = 10): Promise<void> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 60_000).toISOString();
  const [{ data: deposits }, { data: refunds }] = await Promise.all([
    admin.from("contributions").select("id").in("status", [...OPEN_STATUSES]).lt("created_at", since).limit(limit),
    admin.from("refunds").select("id").eq("status", "pending").lt("created_at", since).limit(limit),
  ]);
  await Promise.allSettled([
    ...(deposits ?? []).map((d: { id: string }) => syncContribution(d.id)),
    ...(refunds ?? []).map((r: { id: string }) => syncRefund(r.id)),
  ]);
}
