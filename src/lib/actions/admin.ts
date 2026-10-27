"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { OkKey } from "@/app/admin/OkNotice";
import { createClient } from "@/lib/supabase/server";
import { viewerWith } from "@/lib/auth";
import { ROLES, type Permission, type Role } from "@/lib/rbac";
import { dbErrorMessage, text, type FormState } from "@/lib/forms";
import { normalizeDrcPhone } from "@/lib/phone";
import { isKnownProvider } from "@/lib/payments/providers";
import { startRefund, syncContribution, syncRefund } from "@/lib/payments/service";
import { activeGateway } from "@/lib/payments";
import { PawapayGateway } from "@/lib/payments/pawapay";
import { createAdminClient } from "@/lib/supabase/admin";

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
  return rpc(
    "campaign:review",
    "review_campaign",
    { p_campaign_id: text(form, "campaign_id"), p_decision: decision, p_note: text(form, "note") || null },
    labels[decision],
    ["/admin/campagnes", `/admin/campagnes/${text(form, "campaign_id")}`, "/"],
    { path: `/admin/campagnes/${text(form, "campaign_id")}`, ok: `campaign_${decision}` as OkKey },
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
  return rpc(
    "update:review",
    "review_campaign_update",
    { p_update_id: text(form, "update_id"), p_publish: publish },
    publish ? "Nouvelle publiée." : "Nouvelle refusée.",
    ["/admin/nouvelles"],
    { path: "/admin/nouvelles", ok: publish ? "update_publish" : "update_reject" },
  );
}

export async function reviewClub(_: FormState, form: FormData): Promise<FormState> {
  const decision = text(form, "decision");
  const permission: Permission = decision === "suspend" || decision === "reactivate" ? "club:suspend" : "club:review";
  const labels: Record<string, string> = {
    verify: "Club vérifié. Ses gestionnaires peuvent maintenant créer des campagnes.",
    reject: "Demande refusée.",
    suspend: "Club suspendu, ses campagnes en cours aussi.",
    reactivate: "Club réactivé.",
  };
  if (!labels[decision]) return { error: "Décision inconnue." };
  return rpc(
    permission,
    "review_club",
    { p_club_id: text(form, "club_id"), p_decision: decision, p_note: text(form, "note") || null },
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
  const phone = normalizeDrcPhone(text(form, "payout_phone"));
  if (!phone) return { error: "Numéro Mobile Money congolais invalide." };
  if (!isKnownProvider(text(form, "payout_provider"))) return { error: "Opérateur inconnu." };
  return rpc(
    "club:assign_member",
    "admin_set_club_payout",
    { p_club_id: text(form, "club_id"), p_payout_phone: phone, p_payout_provider: text(form, "payout_provider") },
    "Compte de versement mis à jour.",
    ["/admin/clubs"],
  );
}

export async function setRole(_: FormState, form: FormData): Promise<FormState> {
  const role = text(form, "role") as Role;
  if (!ROLES.includes(role)) return { error: "Rôle inconnu." };
  return rpc("user:set_role", "admin_set_role", { p_user_id: text(form, "user_id"), p_role: role }, "Rôle modifié.", ["/admin/utilisateurs"]);
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
