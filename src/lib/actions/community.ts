"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer, viewerWith } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { dbErrorMessage, text, type FormState } from "@/lib/forms";

// Commentaires, signalements, suivi d'un club, notifications et visibilité
// d'ambassadeur. Les fonctions de la base revérifient chaque droit.

function campaignPath(form: FormData): string {
  const slug = text(form, "slug");
  return /^[a-z0-9-]{1,100}$/.test(slug) ? `/campagnes/${slug}` : "/campagnes";
}

export async function postComment(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("comment:create");
  if ("error" in viewer) return { error: viewer.error };
  const body = text(form, "body");
  if (body.length < 2) return { error: "Écrivez votre commentaire.", field: "body" };
  if (body.length > 1000) return { error: "Votre commentaire dépasse 1 000 caractères.", field: "body", fields: { body } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_comment", {
    p_campaign_id: text(form, "campaign_id"),
    p_body: body,
    p_parent_id: text(form, "parent_id") || null,
  });
  if (error) return { error: dbErrorMessage(error), fields: { body } };
  revalidatePath(campaignPath(form));
  return { success: text(form, "parent_id") ? "Réponse publiée." : "Commentaire publié." };
}

export async function deleteComment(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_comment", { p_comment_id: text(form, "comment_id") });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(campaignPath(form));
  return { success: "Commentaire retiré." };
}

export async function reportComment(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Connectez-vous pour signaler un commentaire." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("report_comment", { p_comment_id: text(form, "comment_id") });
  if (error) return { error: dbErrorMessage(error) };
  return { success: "Merci : l'équipe Tribune va relire ce commentaire." };
}

/** Suivre un club : ses nouveaux projets arrivent dans les notifications. Un seul club suivi à la fois. */
export async function followClub(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Connectez-vous pour suivre un club." };
  if (!can(viewer.profile.role, "contribution:create")) return { error: "Seuls les comptes supporters suivent un club." };
  const follow = text(form, "follow") === "true";
  const clubId = text(form, "club_id");
  if (follow && !/^[0-9a-f-]{36}$/.test(clubId)) return { error: "Club introuvable." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ followed_club_id: follow ? clubId : null })
    .eq("id", viewer.profile.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { success: follow ? "Vous suivez ce club : vous serez prévenu de ses nouveaux projets et de ses actualités." : "Vous ne suivez plus ce club." };
}

export async function markAllNotificationsRead(): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: null });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  return { success: "Toutes les notifications sont lues." };
}

export async function setAmbassadorVisibility(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const visible = text(form, "visible") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ ambassador_public: visible }).eq("id", viewer.profile.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/compte");
  revalidatePath("/classement");
  return {
    success: visible
      ? "Votre prénom et l'initiale de votre nom apparaissent dans le classement des ambassadeurs."
      : "Vous apparaissez comme « Ambassadeur anonyme » dans le classement.",
  };
}
