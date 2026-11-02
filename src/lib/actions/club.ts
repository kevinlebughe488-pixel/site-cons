"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer, viewerWith } from "@/lib/auth";
import { can, canUseClubSpace, isStaff } from "@/lib/rbac";
import { dbErrorMessage, keepFields, text, type FormState } from "@/lib/forms";
import { slugify, todayInKinshasa } from "@/lib/format";
import { normalizeAnyPhone, normalizeDrcPhone } from "@/lib/phone";
import { isKnownProvider } from "@/lib/payments/providers";
import { cleanFileName, readUpload } from "@/lib/uploads";
import { CAMPAIGN_CATEGORIES, CAMPAIGN_LIMITS, CLUB_DOCUMENT_KINDS, type Club } from "@/lib/types";

const HEX = /^#[0-9a-fA-F]{6}$/;
const EDITABLE_DOSSIER: Club["status"][] = ["draft", "changes_requested"];

// ---------------------------------------------------------------------
// Dossier d'inscription du club
// ---------------------------------------------------------------------

const DOSSIER_FIELDS = [
  "name", "short_name", "sport", "city", "commune", "address", "founded_on", "legal_id",
  "rep_name", "rep_title", "rep_phone", "rep_email", "contact_phone", "description",
  "color_primary", "color_secondary", "payout_method", "payout_holder", "payout_phone",
  "payout_provider", "bank_name", "bank_account",
];

/** Mêmes règles que la base (normalize_club_dossier), avec le champ concerné pour l'afficher au bon endroit. */
function checkDossier(f: Record<string, string>): { message: string; field: string } | null {
  if (f.name.length < 3) return { field: "name", message: "Indiquez le nom officiel du club." };
  if (!/^[A-Z0-9]{2,4}$/.test(f.short_name.toUpperCase())) return { field: "short_name", message: "Le sigle doit faire 2 à 4 lettres ou chiffres (ex. TPM)." };
  if (f.sport.length < 2 || f.sport.length > 60) return { field: "sport", message: "Indiquez la discipline sportive du club." };
  if (f.city.length < 2) return { field: "city", message: "Indiquez la ville du siège du club." };
  if (f.address.length < 5) return { field: "address", message: "Indiquez l'adresse du siège (avenue, numéro, quartier)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.founded_on) || f.founded_on < "1850-01-01" || f.founded_on > todayInKinshasa()) {
    return { field: "founded_on", message: "Indiquez la date de création du club (celle des statuts ou de la fondation)." };
  }
  if (f.legal_id.length > 80) return { field: "legal_id", message: "L'identifiant juridique est trop long (80 caractères au plus)." };
  if (f.rep_name.length < 3) return { field: "rep_name", message: "Indiquez le nom du représentant légal du club." };
  if (f.rep_title.length < 2) return { field: "rep_title", message: "Indiquez la fonction du représentant légal (président, secrétaire général…)." };
  if (!normalizeAnyPhone(f.rep_phone)) return { field: "rep_phone", message: "Le téléphone du représentant légal n'est pas valide." };
  if (f.rep_email && !z.email().safeParse(f.rep_email).success) return { field: "rep_email", message: "L'e-mail du représentant légal n'est pas valide." };
  if (f.contact_phone && !normalizeAnyPhone(f.contact_phone)) return { field: "contact_phone", message: "Le téléphone du club n'est pas valide." };
  if (f.payout_holder.length < 3) return { field: "payout_holder", message: "Indiquez le titulaire du compte de versement : le compte doit être au nom du club." };
  if (f.payout_method === "bank") {
    if (f.bank_name.length < 2) return { field: "bank_name", message: "Indiquez le nom de la banque." };
    if (!/^[A-Za-z0-9 .-]{5,60}$/.test(f.bank_account)) return { field: "bank_account", message: "Le numéro de compte bancaire n'est pas valide." };
  } else {
    if (!normalizeDrcPhone(f.payout_phone)) return { field: "payout_phone", message: "Le numéro Mobile Money de versement doit être un numéro congolais valide." };
    if (!isKnownProvider(f.payout_provider)) return { field: "payout_provider", message: "Choisissez l'opérateur du compte Mobile Money." };
  }
  if (f.description.length > 4000) return { field: "description", message: "La présentation est trop longue (4 000 caractères au plus)." };
  return null;
}

/** Crée le dossier du club (brouillon) ou le met à jour tant qu'il n'est pas envoyé. */
export async function saveClubDossier(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, DOSSIER_FIELDS);
  fields.payout_method = fields.payout_method === "bank" ? "bank" : "mobile_money";
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous.", fields };
  const club = viewer.club && EDITABLE_DOSSIER.includes(viewer.club.status) && canUseClubSpace(viewer.profile.role) ? viewer.club : null;
  if (!club && !can(viewer.profile.role, "club:register")) return { error: "Vous n'avez pas les droits pour cette action.", fields };

  const problem = checkDossier(fields);
  if (problem) return { error: problem.message, field: problem.field, fields };

  const data = {
    ...fields,
    slug: slugify(fields.name, 60),
    short_name: fields.short_name.toUpperCase(),
    rep_phone: normalizeAnyPhone(fields.rep_phone),
    contact_phone: normalizeAnyPhone(fields.contact_phone) ?? normalizeAnyPhone(fields.rep_phone),
    payout_phone: fields.payout_method === "bank" ? null : normalizeDrcPhone(fields.payout_phone),
    color_primary: HEX.test(fields.color_primary) ? fields.color_primary : "#1d5237",
    color_secondary: HEX.test(fields.color_secondary) ? fields.color_secondary : "#ecd083",
  };
  const supabase = await createClient();
  const { error } = club
    ? await supabase.rpc("update_club_registration", { p_club_id: club.id, p_data: data })
    : await supabase.rpc("register_club", { p_data: data });
  if (error) return { error: dbErrorMessage(error), fields };
  revalidatePath("/", "layout");
  if (!club) redirect("/club?ok=dossier_ouvert");
  return { success: "Dossier enregistré.", fields };
}

/** Envoie le dossier à l'équipe Tribune pour vérification. */
export async function submitClubDossier(): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.club || !canUseClubSpace(viewer.profile.role)) return { error: "Vous ne gérez aucun club." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_club_registration", { p_club_id: viewer.club.id });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/", "layout");
  redirect("/club?ok=dossier_envoye");
}

const DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
const MAX_DOCUMENTS = 20;

/** Ajoute une pièce au dossier : membres du club (dossier modifiable) ou équipe Tribune. */
export async function uploadClubDocument(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const clubId = text(form, "club_id");
  const staff = isStaff(viewer.profile.role);
  const own = viewer.club?.id === clubId && canUseClubSpace(viewer.profile.role);
  if (!own && !staff) return { error: "Vous ne pouvez pas ajouter de document à ce club." };
  if (own && !staff && !EDITABLE_DOSSIER.includes(viewer.club!.status)) {
    return { error: "Le dossier est en cours de vérification : les documents ne peuvent plus être modifiés." };
  }
  const kind = text(form, "kind");
  if (!CLUB_DOCUMENT_KINDS.some((k) => k.id === kind)) return { error: "Choisissez le type de document." };

  const file = await readUpload(form.get("file"), { maxBytes: DOCUMENT_MAX_BYTES, allowPdf: true, label: "un fichier (PDF ou photo)" });
  if ("error" in file) return { error: file.error };

  const admin = createAdminClient();
  const { count } = await admin.from("club_documents").select("id", { count: "exact", head: true }).eq("club_id", clubId);
  if ((count ?? 0) >= MAX_DOCUMENTS) return { error: `Le dossier compte déjà ${MAX_DOCUMENTS} documents. Retirez-en un avant d'en ajouter.` };

  const path = `${clubId}/${randomUUID()}.${file.ext}`;
  const { error: uploadError } = await admin.storage
    .from("club-documents")
    .upload(path, file.bytes, { contentType: file.mime, upsert: false });
  if (uploadError) return { error: "Envoi du document impossible pour le moment. Réessayez." };
  const { error } = await admin.from("club_documents").insert({
    club_id: clubId,
    kind,
    file_path: path,
    file_name: cleanFileName(form.get("file"), `document.${file.ext}`),
    mime_type: file.mime,
    size_bytes: file.bytes.length,
    uploaded_by: viewer.profile.id,
  });
  if (error) {
    await admin.storage.from("club-documents").remove([path]);
    return { error: "Enregistrement du document impossible. Réessayez." };
  }
  await admin.from("audit_log").insert({
    actor_id: viewer.profile.id, action: "club.document_ajoute", entity_type: "club", entity_id: clubId, details: { type: kind },
  });
  revalidatePath("/club");
  revalidatePath("/admin/clubs");
  return { success: "Document ajouté au dossier." };
}

/** Retire une pièce tant que le dossier n'est pas envoyé. */
export async function deleteClubDocument(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.club || !canUseClubSpace(viewer.profile.role)) return { error: "Vous ne gérez aucun club." };
  if (!EDITABLE_DOSSIER.includes(viewer.club.status)) {
    return { error: "Le dossier est en cours de vérification : les documents ne peuvent plus être retirés." };
  }
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("club_documents")
    .select("id, club_id, file_path, kind")
    .eq("id", text(form, "document_id"))
    .maybeSingle<{ id: string; club_id: string; file_path: string; kind: string }>();
  if (!doc || doc.club_id !== viewer.club.id) return { error: "Document introuvable." };
  await admin.from("club_documents").delete().eq("id", doc.id);
  await admin.storage.from("club-documents").remove([doc.file_path]);
  await admin.from("audit_log").insert({
    actor_id: viewer.profile.id, action: "club.document_retire", entity_type: "club", entity_id: doc.club_id, details: { type: doc.kind },
  });
  revalidatePath("/club");
  return { success: "Document retiré." };
}

// ---------------------------------------------------------------------
// Présentation et logo (club vérifié ou en cours)
// ---------------------------------------------------------------------

export async function updateClubInfo(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.club || !canUseClubSpace(viewer.profile.role)) return { error: "Vous ne gérez aucun club." };
  const contact = normalizeAnyPhone(text(form, "contact_phone"));
  if (!contact) return { error: "Le téléphone de contact n'est pas valide." };
  const c1 = text(form, "color_primary");
  const c2 = text(form, "color_secondary");

  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({
      description: text(form, "description").slice(0, 4000),
      city: text(form, "city").slice(0, 80) || "Kinshasa",
      commune: text(form, "commune").slice(0, 80) || null,
      contact_phone: contact,
      color_primary: HEX.test(c1) ? c1 : viewer.club.color_primary,
      color_secondary: HEX.test(c2) ? c2 : viewer.club.color_secondary,
    })
    .eq("id", viewer.club.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/club");
  revalidatePath(`/clubs/${viewer.club.slug}`);
  return { success: "Présentation du club enregistrée." };
}

const LOGO_MAX_BYTES = 1024 * 1024;

/** Envoie le logo d'un club. Réservé aux gestionnaires du club et à l'équipe Tribune. */
export async function uploadClubLogo(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const clubId = text(form, "club_id");
  const ownClub = viewer.club?.id === clubId && canUseClubSpace(viewer.profile.role);
  if (!ownClub && !isStaff(viewer.profile.role)) {
    return { error: "Vous ne pouvez pas modifier le logo de ce club." };
  }
  const file = await readUpload(form.get("logo"), { maxBytes: LOGO_MAX_BYTES, allowPdf: false, label: "une image" });
  if ("error" in file) return { error: file.error.replace("La photo", "Le logo") };

  const admin = createAdminClient();
  const { data: club } = await admin.from("clubs").select("id, logo_path").eq("id", clubId).maybeSingle();
  if (!club) return { error: "Club introuvable." };

  const path = `${clubId}/logo-${Date.now()}.${file.ext}`;
  const { error: uploadError } = await admin.storage
    .from("club-logos")
    .upload(path, file.bytes, { contentType: file.mime, upsert: false });
  if (uploadError) return { error: "Envoi du logo impossible pour le moment." };

  await admin.from("clubs").update({ logo_path: path }).eq("id", clubId);
  if (club.logo_path) await admin.storage.from("club-logos").remove([club.logo_path]);
  await admin.from("audit_log").insert({ actor_id: viewer.profile.id, action: "club.logo", entity_type: "club", entity_id: clubId });
  revalidatePath("/", "layout");
  return { success: "Logo mis à jour." };
}

// ---------------------------------------------------------------------
// Campagnes
// ---------------------------------------------------------------------

const lineSchema = z.object({ label: z.string().trim().min(2).max(160), amount: z.coerce.number().positive().max(1_000_000) });
const milestoneSchema = z.object({ label: z.string().trim().min(2).max(160), target: z.string().trim().max(40) });

function parseJsonList<T>(raw: string, schema: z.ZodType<T>): T[] | null {
  try {
    const list = JSON.parse(raw || "[]");
    if (!Array.isArray(list)) return null;
    const out: T[] = [];
    for (const item of list) {
      const parsed = schema.safeParse(item);
      if (!parsed.success) return null;
      out.push(parsed.data);
    }
    return out;
  } catch {
    return null;
  }
}

const CAMPAIGN_FIELDS = [
  "title", "category", "summary", "description", "goal", "duration_days", "min_contribution", "max_contribution", "budget", "milestones",
];

export async function saveCampaign(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, CAMPAIGN_FIELDS);
  const viewer = await viewerWith("club:manage");
  if ("error" in viewer) return { error: viewer.error, fields };
  if (!viewer.club || viewer.club.status !== "verified") {
    return { error: "Votre club doit être vérifié par Tribune avant de créer une campagne.", fields };
  }

  const fail = (error: string, field: string): FormState => ({ error, field, fields });
  if (fields.title.length < 5) return fail("Le titre doit faire au moins 5 caractères.", "title");
  if (!(CAMPAIGN_CATEGORIES as readonly string[]).includes(fields.category)) return fail("Choisissez un thème.", "category");
  const goal = Number(fields.goal);
  if (!Number.isInteger(goal) || goal < 100 || goal > 1_000_000) {
    return fail("L'objectif doit être un montant entier entre 100 $ et 1 000 000 $.", "goal");
  }
  const duration = Number(fields.duration_days);
  if (!Number.isInteger(duration) || duration < CAMPAIGN_LIMITS.minDuration || duration > CAMPAIGN_LIMITS.maxDuration) {
    return fail(`La durée de la collecte doit être comprise entre ${CAMPAIGN_LIMITS.minDuration} et ${CAMPAIGN_LIMITS.maxDuration} jours.`, "duration_days");
  }
  const min = Number(fields.min_contribution || "1");
  if (!Number.isInteger(min) || min < 1 || min > CAMPAIGN_LIMITS.maxMinContribution) {
    return fail(`La contribution minimum doit être un montant entier entre 1 $ et ${CAMPAIGN_LIMITS.maxMinContribution} $.`, "min_contribution");
  }
  if (min > goal) return fail("La contribution minimum ne peut pas dépasser l'objectif.", "min_contribution");
  const max = fields.max_contribution ? Number(fields.max_contribution) : null;
  if (max !== null && (!Number.isInteger(max) || max < min || max > goal)) {
    return fail("Le maximum par supporter doit être un montant entier, au moins égal au minimum et au plus égal à l'objectif.", "max_contribution");
  }
  const budget = parseJsonList(fields.budget, lineSchema);
  if (!budget) return fail("Chaque ligne de budget doit avoir un libellé et un montant positif.", "budget");
  const milestones = parseJsonList(fields.milestones, milestoneSchema);
  if (!milestones) return fail("Chaque jalon doit avoir un libellé.", "milestones");

  const campaignId = text(form, "campaign_id") || null;
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("save_campaign_draft", {
    p_campaign_id: campaignId,
    p_club_id: viewer.club.id,
    p_slug: slugify(`${viewer.club.short_name} ${fields.title}`),
    p_title: fields.title,
    p_category: fields.category,
    p_summary: fields.summary.slice(0, 300),
    p_description: fields.description.slice(0, 8000),
    p_goal: goal,
    p_duration_days: duration,
    p_min_contribution: min,
    p_max_contribution: max,
    p_budget: budget,
    p_milestones: milestones,
  });
  if (error) return { error: dbErrorMessage(error), fields };

  if (form.get("intent") === "submit") {
    const { error: submitError } = await supabase.rpc("submit_campaign", { p_campaign_id: id });
    if (submitError) {
      revalidatePath(`/club/campagnes/${id}`);
      if (!campaignId) redirect(`/club/campagnes/${id}?erreur=${encodeURIComponent(dbErrorMessage(submitError))}`);
      return { error: `Brouillon enregistré, mais pas encore envoyé : ${dbErrorMessage(submitError)}`, fields };
    }
  }
  revalidatePath("/club");
  revalidatePath(`/club/campagnes/${id}`);
  if (!campaignId || form.get("intent") === "submit") redirect(`/club/campagnes/${id}`);
  return { success: "Brouillon enregistré.", fields };
}

const COVER_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Photo de couverture d'une campagne. Le club la change tant que le dossier est
 * modifiable (elle fait partie de ce que l'équipe vérifie) ; l'équipe, à tout moment.
 */
export async function uploadCampaignCover(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const admin = createAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, club_id, slug, status, cover_path")
    .eq("id", text(form, "campaign_id"))
    .maybeSingle<{ id: string; club_id: string; slug: string; status: string; cover_path: string | null }>();
  if (!campaign) return { error: "Campagne introuvable." };
  const staff = isStaff(viewer.profile.role);
  const own = viewer.club?.id === campaign.club_id && can(viewer.profile.role, "club:manage");
  if (!staff && !own) return { error: "Vous ne pouvez pas modifier cette campagne." };
  if (!staff && !["draft", "changes_requested"].includes(campaign.status)) {
    return { error: "La photo ne se change plus une fois la campagne envoyée. Écrivez à l'équipe Tribune si besoin." };
  }

  const remove = form.get("intent") === "remove";
  let path: string | null = null;
  if (!remove) {
    const file = await readUpload(form.get("cover"), { maxBytes: COVER_MAX_BYTES, allowPdf: false, label: "une photo" });
    if ("error" in file) return { error: file.error };
    path = `${campaign.id}/couverture-${Date.now()}.${file.ext}`;
    const { error: uploadError } = await admin.storage
      .from("campaign-images")
      .upload(path, file.bytes, { contentType: file.mime, upsert: false });
    if (uploadError) return { error: "Envoi de la photo impossible pour le moment. Réessayez." };
  }
  await admin.from("campaigns").update({ cover_path: path }).eq("id", campaign.id);
  if (campaign.cover_path) await admin.storage.from("campaign-images").remove([campaign.cover_path]);
  await admin.from("audit_log").insert({
    actor_id: viewer.profile.id,
    action: remove ? "campagne.photo_retiree" : "campagne.photo",
    entity_type: "campaign",
    entity_id: campaign.id,
  });
  revalidatePath(`/club/campagnes/${campaign.id}`);
  revalidatePath(`/admin/campagnes/${campaign.id}`);
  revalidatePath(`/campagnes/${campaign.slug}`);
  revalidatePath("/");
  return { success: remove ? "Photo retirée." : "Photo de couverture enregistrée." };
}

/** Nouvelle (page publique), actualité du club ou message réservé aux contributeurs : relue avant publication. */
export async function postNews(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("club:manage");
  if ("error" in viewer) return { error: viewer.error };
  if (!viewer.club) return { error: "Vous ne gérez aucun club." };
  const title = text(form, "title");
  const body = text(form, "body");
  if (title.length < 3 || body.length < 10) return { error: "Donnez un titre et quelques phrases à votre nouvelle." };
  const campaignId = text(form, "campaign_id") || null;
  const audience = text(form, "audience") === "contributors" ? "contributors" : "public";
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_club_news", {
    p_club_id: viewer.club.id,
    p_campaign_id: campaignId,
    p_audience: audience,
    p_title: title.slice(0, 140),
    p_body: body.slice(0, 4000),
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(campaignId ? `/club/campagnes/${campaignId}` : "/club");
  return {
    success:
      audience === "contributors"
        ? "Message envoyé. Après relecture par l'équipe Tribune, chaque contributeur de la campagne sera prévenu."
        : "Nouvelle envoyée. Elle sera publiée après relecture par l'équipe Tribune.",
  };
}

export async function completeMilestone(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("club:manage");
  if ("error" in viewer) return { error: viewer.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_milestone", {
    p_milestone_id: text(form, "milestone_id"),
    p_proof: text(form, "proof").slice(0, 1000),
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/club/campagnes/${text(form, "campaign_id")}`);
  return { success: "Jalon marqué comme atteint, avec sa preuve." };
}
