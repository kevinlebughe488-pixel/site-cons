"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OkKey } from "@/app/admin/OkNotice";
import { createClient } from "@/lib/supabase/server";
import { viewerWith } from "@/lib/auth";
import { type Permission, type Role } from "@/lib/rbac";
import { dbErrorMessage, text, type FormState } from "@/lib/forms";
import { normalizeDrcPhone } from "@/lib/phone";
import { isKnownProvider } from "@/lib/payments/providers";
import { startRefund, syncContribution, syncRefund } from "@/lib/payments/service";
import { activeGateway } from "@/lib/payments";
import { PawapayGateway } from "@/lib/payments/pawapay";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAMPAIGN_CATEGORIES, CLUB_REVIEW_CRITERIA, REVIEW_CRITERIA } from "@/lib/types";

// Chaque action vérifie la permission côté application, puis la base de données
// revérifie le rôle dans la fonction appelée (double contrôle).

async function rpc(
  permission: Permission,
  fn: string,
  args: Record<string, unknown>,
  success: string,
  paths: string[],
  /** Page où revenir avec un message de confirmation, quand la décision fait disparaître le formulaire. */
  then?: { path: string; ok: OkKey },
): Promise<FormState> {
  const viewer = await viewerWith(permission);
  if ("error" in viewer) return { error: viewer.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return { error: dbErrorMessage(error) };
  paths.forEach((p) => revalidatePath(p));
  if (then) redirect(`${then.path}?ok=${then.ok}`);
  return { success };
}

export async function reviewCampaign(_: FormState, form: FormData): Promise<FormState> {
  const decision = text(form, "decision");
  const labels: Record<string, string> = {
    approve: "Campagne publiée.",
    request_changes: "Corrections demandées au club.",
    reject: "Dossier refusé.",
  };
  if (!labels[decision]) return { error: "Décision inconnue." };
  const criteria = form.getAll("criteria").filter((v): v is string => typeof v === "string");
  if (decision === "approve" && !REVIEW_CRITERIA.every((c) => criteria.includes(c.id))) {
    return { error: "Pour publier, cochez les quatre critères d'instruction : clarté, faisabilité, cohérence et authenticité." };
  }
  return rpc(
    "campaign:review",
    "review_campaign",
    {
      p_campaign_id: text(form, "campaign_id"),
      p_decision: decision,
      p_note: text(form, "note") || null,
      p_criteria: decision === "approve" ? criteria : null,
    },
    labels[decision],
    ["/admin/campagnes", `/admin/campagnes/${text(form, "campaign_id")}`, "/"],
    { path: `/admin/campagnes/${text(form, "campaign_id")}`, ok: `campaign_${decision}` as OkKey },
  );
}

export async function recordPublicationFee(_: FormState, form: FormData): Promise<FormState> {
  const reference = text(form, "reference");
  if (reference.length < 3) return { error: "Indiquez la référence du paiement (reçu, transaction Mobile Money, virement)." };
  return rpc(
    "fee:record",
    "record_publication_fee_payment",
    { p_campaign_id: text(form, "campaign_id"), p_reference: reference.slice(0, 120) },
    "Règlement enregistré.",
    ["/admin", `/admin/campagnes/${text(form, "campaign_id")}`],
    { path: `/admin/campagnes/${text(form, "campaign_id")}`, ok: "fee_paid" },
  );
}

export async function updateSettings(_: FormState, form: FormData): Promise<FormState> {
  const raw = text(form, "publication_fee").replace(",", ".");
  const fee = Number(raw);
  if (!raw || !Number.isFinite(fee) || fee < 0 || fee > 10000) return { error: "Les frais de publication doivent être compris entre 0 et 10 000 $." };
  const launch = text(form, "launch_date");
  if (launch && !/^\d{4}-\d{2}-\d{2}$/.test(launch)) return { error: "Date de lancement invalide." };
  return rpc(
    "settings:update",
    "admin_update_settings",
    { p_publication_fee: fee, p_launch_date: launch || null },
    "Réglages enregistrés.",
    ["/", "/admin", "/comment-ca-marche"],
    { path: "/admin", ok: "settings" },
  );
}

export async function suspendCampaign(_: FormState, form: FormData): Promise<FormState> {
  const suspend = text(form, "suspend") === "true";
  return rpc(
    "campaign:suspend",
    "set_campaign_suspension",
    { p_campaign_id: text(form, "campaign_id"), p_suspend: suspend, p_note: text(form, "note") || null },
    suspend ? "Campagne suspendue." : "Campagne réactivée.",
    ["/admin/campagnes", `/admin/campagnes/${text(form, "campaign_id")}`, "/"],
    { path: `/admin/campagnes/${text(form, "campaign_id")}`, ok: suspend ? "campaign_suspend" : "campaign_reactivate" },
  );
}

export async function closeCampaign(_: FormState, form: FormData): Promise<FormState> {
  return rpc(
    "campaign:close",
    "close_campaign",
    { p_campaign_id: text(form, "campaign_id") },
    "Campagne clôturée.",
    ["/admin/campagnes", `/admin/campagnes/${text(form, "campaign_id")}`, "/"],
    { path: `/admin/campagnes/${text(form, "campaign_id")}`, ok: "campaign_close" },
  );
}

export async function reviewUpdate(_: FormState, form: FormData): Promise<FormState> {
  const publish = text(form, "publish") === "true";
  const note = text(form, "note");
  if (!publish && note.length < 3) return { error: "Indiquez au club pourquoi la nouvelle n'est pas publiée." };
  return rpc(
    "update:review",
    "review_campaign_update",
    { p_update_id: text(form, "update_id"), p_publish: publish, p_note: note.slice(0, 500) || null },
    publish ? "Nouvelle publiée." : "Nouvelle refusée.",
    ["/admin/nouvelles"],
    { path: "/admin/nouvelles", ok: publish ? "update_publish" : "update_reject" },
  );
}

/** Retire une nouvelle déjà publiée par un club (contenu contraire aux règles). Le club reçoit le motif. */
export async function withdrawUpdate(_: FormState, form: FormData): Promise<FormState> {
  const note = text(form, "note");
  if (note.length < 3) return { error: "Indiquez au club pourquoi la publication est retirée." };
  return rpc(
    "update:review",
    "withdraw_campaign_update",
    { p_update_id: text(form, "update_id"), p_note: note.slice(0, 500) },
    "Publication retirée.",
    ["/admin/nouvelles", "/actualites", "/"],
    { path: "/admin/nouvelles", ok: "update_withdraw" },
  );
}

export async function reviewClub(_: FormState, form: FormData): Promise<FormState> {
  const decision = text(form, "decision");
  const permission: Permission = decision === "suspend" || decision === "reactivate" ? "club:suspend" : "club:review";
  const labels: Record<string, string> = {
    verify: "Club vérifié. Ses gestionnaires peuvent maintenant créer des campagnes.",
    request_changes: "Compléments demandés au club.",
    reject: "Demande refusée.",
    suspend: "Club suspendu, ses campagnes en cours aussi.",
    reactivate: "Club réactivé.",
  };
  if (!labels[decision]) return { error: "Décision inconnue." };
  const criteria = form.getAll("criteria").filter((v): v is string => typeof v === "string");
  if (decision === "verify" && !CLUB_REVIEW_CRITERIA.every((c) => criteria.includes(c.id))) {
    return { error: "Pour vérifier le club, cochez les trois points de contrôle : existence du club, représentant légal et compte de versement." };
  }
  if (["request_changes", "reject", "suspend"].includes(decision) && text(form, "note").length < 3) {
    return { error: "Indiquez le motif de la décision : il est communiqué au club." };
  }
  return rpc(
    permission,
    "review_club",
    {
      p_club_id: text(form, "club_id"),
      p_decision: decision,
      p_note: text(form, "note") || null,
      p_criteria: decision === "verify" ? criteria : null,
    },
    labels[decision],
    ["/admin/clubs"],
    { path: "/admin/clubs", ok: `club_${decision}` as OkKey },
  );
}

export async function addClubMember(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("club:assign_member");
  if ("error" in viewer) return { error: viewer.error };
  const email = text(form, "email").toLowerCase();
  const supabase = await createClient();
  const { data: user } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
  if (!user) return { error: "Aucun compte avec cet e-mail. La personne doit d'abord s'inscrire." };
  return rpc("club:assign_member", "admin_add_club_member", { p_club_id: text(form, "club_id"), p_user_id: user.id }, "Gestionnaire ajouté au club.", ["/admin/clubs"]);
}

export async function setClubPayout(_: FormState, form: FormData): Promise<FormState> {
  const method = text(form, "payout_method") === "bank" ? "bank" : "mobile_money";
  const holder = text(form, "payout_holder");
  if (holder.length < 3) return { error: "Indiquez le titulaire du compte (au nom du club)." };
  let details: Record<string, string | null>;
  if (method === "bank") {
    if (text(form, "bank_name").length < 2) return { error: "Indiquez le nom de la banque." };
    if (!/^[A-Za-z0-9 .-]{5,60}$/.test(text(form, "bank_account"))) return { error: "Numéro de compte bancaire invalide." };
    details = { bank_name: text(form, "bank_name"), bank_account: text(form, "bank_account") };
  } else {
    const phone = normalizeDrcPhone(text(form, "payout_phone"));
    if (!phone) return { error: "Numéro Mobile Money congolais invalide." };
    if (!isKnownProvider(text(form, "payout_provider"))) return { error: "Opérateur inconnu." };
    details = { payout_phone: phone, payout_provider: text(form, "payout_provider") };
  }
  return rpc(
    "club:assign_member",
    "admin_set_club_payout",
    { p_club_id: text(form, "club_id"), p_data: { payout_method: method, payout_holder: holder, ...details } },
    "Compte de versement mis à jour.",
    ["/admin/clubs"],
  );
}

export async function moderateComment(_: FormState, form: FormData): Promise<FormState> {
  const hide = text(form, "hide") === "true";
  const note = text(form, "note");
  if (hide && note.length < 3) return { error: "Indiquez le motif du masquage." };
  return rpc(
    "comment:moderate",
    "moderate_comment",
    { p_comment_id: text(form, "comment_id"), p_hide: hide, p_note: note.slice(0, 300) || null },
    hide ? "Commentaire masqué." : "Commentaire conservé.",
    ["/admin/commentaires"],
    { path: "/admin/commentaires", ok: hide ? "comment_hide" : "comment_keep" },
  );
}

/**
 * Équipe conformité : un compte supporter la rejoint, ou la quitte. Les autres rôles
 * ne se changent pas à la main (gestionnaire : à la vérification du club ;
 * administrateur : script promote). La base applique la même règle.
 */
export async function setComplianceMember(_: FormState, form: FormData): Promise<FormState> {
  const join = text(form, "join") === "true";
  const role: Role = join ? "compliance" : "supporter";
  return rpc(
    "user:set_role",
    "admin_set_role",
    { p_user_id: text(form, "user_id"), p_role: role },
    join ? "Compte ajouté à l'équipe conformité." : "Compte retiré de l'équipe conformité.",
    ["/admin/utilisateurs"],
  );
}

export async function reviewIdentity(_: FormState, form: FormData): Promise<FormState> {
  const approve = text(form, "approve") === "true";
  return rpc(
    "kyc:review",
    "review_identity",
    { p_user_id: text(form, "user_id"), p_approve: approve },
    approve ? "Identité vérifiée." : "Pièce refusée.",
    ["/admin/utilisateurs"],
    { path: "/admin/utilisateurs", ok: approve ? "kyc_approve" : "kyc_reject" },
  );
}

export async function refundContribution(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("transaction:refund");
  if ("error" in viewer) return { error: viewer.error };
  const reason = text(form, "reason");
  if (reason.length < 3) return { error: "Indiquez le motif du remboursement." };
  try {
    await startRefund(text(form, "contribution_id"), reason.slice(0, 300), viewer.profile.id);
  } catch (error) {
    return { error: (error as Error).message };
  }
  revalidatePath("/admin/transactions");
  redirect("/admin/transactions?ok=refund");
}

/** Rembourse toutes les contributions confirmées d'une campagne non financée. */
export async function refundCampaign(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("transaction:refund");
  if ("error" in viewer) return { error: viewer.error };
  const campaignId = text(form, "campaign_id");
  const admin = createAdminClient();
  const { data: campaign } = await admin.from("campaigns").select("status, title").eq("id", campaignId).maybeSingle();
  if (campaign?.status !== "failed") return { error: "Seule une campagne non financée se rembourse en bloc." };
  const { data: rows } = await admin.from("contributions").select("id").eq("campaign_id", campaignId).eq("status", "completed").limit(500);
  let ok = 0;
  const failures: string[] = [];
  for (const row of rows ?? []) {
    try {
      await startRefund(row.id, `Objectif non atteint : ${campaign.title}`.slice(0, 300), viewer.profile.id);
      ok++;
    } catch (error) {
      failures.push((error as Error).message);
    }
  }
  revalidatePath(`/admin/campagnes/${campaignId}`);
  revalidatePath("/admin/transactions");
  return failures.length
    ? { error: `${ok} remboursement(s) demandé(s), ${failures.length} en échec : ${failures[0]}` }
    : { success: `${ok} remboursement(s) demandé(s).` };
}

export async function refreshTransaction(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("transaction:read");
  if ("error" in viewer) return { error: viewer.error };
  try {
    if (text(form, "kind") === "refund") await syncRefund(text(form, "id"));
    else await syncContribution(text(form, "id"));
  } catch (error) {
    return { error: `pawaPay ne répond pas : ${(error as Error).message}` };
  }
  revalidatePath("/admin/transactions");
  redirect("/admin/transactions?ok=refresh");
}

export async function checkPawapay(): Promise<FormState> {
  const viewer = await viewerWith("transaction:read");
  if ("error" in viewer) return { error: viewer.error };
  const gateway = activeGateway();
  if (!(gateway instanceof PawapayGateway)) {
    return { success: "Mode simulation : aucun compte pawaPay n'est configuré (PAWAPAY_API_TOKEN)." };
  }
  try {
    const conf = (await gateway.activeConfiguration()) as {
      countries?: { country: string; providers?: { provider: string; displayName?: string }[] }[];
    };
    const providers = conf.countries?.flatMap((c) => c.providers ?? []).map((p) => `${p.displayName ?? p.provider} (${p.provider})`) ?? [];
    return { success: providers.length ? `Connexion OK. Opérateurs ouverts en RDC : ${providers.join(", ")}.` : "Connexion OK, mais aucun opérateur RDC n'est ouvert sur ce compte." };
  } catch (error) {
    return { error: `Connexion à pawaPay impossible : ${(error as Error).message}` };
  }
}

/** Référentiel des prix : ajouter, corriger ou confirmer un prix normal (journalisé). */
export async function savePriceReference(_: FormState, form: FormData): Promise<FormState> {
  const label = text(form, "label");
  const category = text(form, "category");
  const unit = text(form, "unit");
  const price = Number(text(form, "unit_price").replace(",", "."));
  const source = text(form, "source");
  if (label.length < 3) return { error: "Indiquez le nom de l'article ou du service.", field: "label" };
  if (!(CAMPAIGN_CATEGORIES as readonly string[]).includes(category)) return { error: "Choisissez un thème.", field: "category" };
  if (!unit) return { error: "Indiquez l'unité (pièce, paire, m², jour…).", field: "unit" };
  if (!(price > 0) || price > 1_000_000) return { error: "Le prix de référence doit être un montant positif.", field: "unit_price" };
  if (source.length < 3) return { error: "Indiquez la source du prix : devis reçus, relevé de marché, facture…", field: "source" };
  const keywords = text(form, "keywords")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 12);
  const id = text(form, "id") || null;
  return rpc(
    "campaign:review",
    "save_price_reference",
    {
      p_id: id,
      p_label: label.slice(0, 120),
      p_category: category,
      p_unit: unit.slice(0, 30),
      p_unit_price: Math.round(price * 100) / 100,
      p_keywords: keywords,
      p_source: source.slice(0, 300),
      p_active: form.get("active") !== "off",
    },
    id ? "Prix enregistré et confirmé." : "Article ajouté au référentiel.",
    ["/admin/prix"],
  );
}
