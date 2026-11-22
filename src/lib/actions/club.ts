"use server";

import { createHash, randomUUID } from "node:crypto";
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
import { cleanFileName, readUpload } from "@/lib/uploads";
import { CAMPAIGN_CATEGORIES, CAMPAIGN_DOCUMENT_KINDS, CAMPAIGN_LIMITS, CLUB_DOCUMENT_KINDS, type Club } from "@/lib/types";
import { CLUB_DOCUMENT_MAX_BYTES, CLUB_DOCUMENT_MAX_COUNT, checkDossier, DOSSIER_FIELDS } from "@/lib/club-dossier";

const HEX = /^#[0-9a-fA-F]{6}$/;
const EDITABLE_DOSSIER: Club["status"][] = ["draft", "changes_requested"];

// ---------------------------------------------------------------------
// Dossier d'inscription du club
// ---------------------------------------------------------------------

/**
 * Crée le dossier du club (brouillon) ou le met à jour tant qu'il n'est pas envoyé.
 * Appelée par le bouton « Suivant » du parcours d'inscription : en cas de succès,
 * on passe à l'étape demandée (`next_step`), sinon on revient au champ fautif.
 */
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
  const next = Math.min(5, Math.max(1, Number(text(form, "next_step")) || 4));
  // Premier enregistrement : le club existe désormais, on passe aux documents.
  if (!club) redirect(`/club?etape=${next}&ok=dossier_ouvert`);
  return { success: "Informations enregistrées.", fields, step: next };
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

const DOCUMENT_MAX_BYTES = CLUB_DOCUMENT_MAX_BYTES;
const MAX_DOCUMENTS = CLUB_DOCUMENT_MAX_COUNT;

/**
 * Ajoute une pièce au dossier, par un gestionnaire du club tant que le dossier est
 * modifiable. (L'équipe Tribune ajoute un document reçu du club par sa propre
 * action du back-office : addClubDocument.)
 */
export async function uploadClubDocument(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const clubId = text(form, "club_id");
  const own = viewer.club?.id === clubId && canUseClubSpace(viewer.profile.role);
  if (!own) return { error: "Vous ne pouvez pas ajouter de document à ce club." };
  if (!EDITABLE_DOSSIER.includes(viewer.club!.status)) {
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

/** Envoie le logo d'un club. Réservé aux gestionnaires du club : l'équipe Tribune ne le choisit pas à sa place. */
export async function uploadClubLogo(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const clubId = text(form, "club_id");
  const ownClub = viewer.club?.id === clubId && canUseClubSpace(viewer.profile.role);
  if (!ownClub) return { error: "Seuls les gestionnaires du club peuvent changer son logo." };
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

const lineSchema = z.object({
  label: z.string().trim().min(2).max(160),
  amount: z.coerce.number().positive().max(1_000_000),
  quantity: z.coerce
    .number()
    .max(1_000_000)
    .default(1)
    .transform((v) => Math.round(v * 100) / 100)
    .pipe(z.number().positive()),
  reference_id: z.union([z.uuid(), z.literal(""), z.null()]).default(null).transform((v) => v || null),
});
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
  if (!budget) return fail("Chaque poste du budget doit avoir un libellé, une quantité et un montant positifs.", "budget");
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

const CAMPAIGN_DOC_MAX = 10;
const EDITABLE_CAMPAIGN = ["draft", "changes_requested"];

type CampaignRef = { id: string; club_id: string; slug: string; status: string; cover_path: string | null };

/** Campagne que la personne peut compléter : son club tant que le dossier est modifiable, ou l'équipe. */
async function editableCampaign(campaignId: string): Promise<{ campaign: CampaignRef; actor: string } | { error: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const { data: campaign } = await createAdminClient()
    .from("campaigns")
    .select("id, club_id, slug, status, cover_path")
    .eq("id", campaignId)
    .maybeSingle<CampaignRef>();
  if (!campaign) return { error: "Campagne introuvable." };
  const staff = isStaff(viewer.profile.role);
  const own = viewer.club?.id === campaign.club_id && can(viewer.profile.role, "club:manage");
  if (!staff && !own) return { error: "Vous ne pouvez pas modifier cette campagne." };
  if (!staff && !EDITABLE_CAMPAIGN.includes(campaign.status)) {
    return { error: "Le dossier est envoyé : photos et devis ne se modifient plus. Écrivez à l'équipe Tribune si besoin." };
  }
  return { campaign, actor: viewer.profile.id };
}

/** Met à jour le niveau du contrôle automatique (liste du back-office) et les pages de la campagne. */
async function refreshCampaign(c: CampaignRef) {
  const admin = createAdminClient();
  const { data: report } = await admin.rpc("compute_campaign_compliance", { p_campaign_id: c.id });
  if (report && ["draft", "changes_requested", "in_review"].includes(c.status)) {
    await admin.from("campaigns").update({ compliance_level: report.level, compliance_checked_at: new Date().toISOString() }).eq("id", c.id);
  }
  revalidatePath(`/club/campagnes/${c.id}`);
  revalidatePath(`/admin/campagnes/${c.id}`);
  revalidatePath("/admin/campagnes");
  revalidatePath(`/campagnes/${c.slug}`);
}

/** Devis ou justificatif de prix : vérifié par l'équipe Tribune avant la publication. */
export async function uploadCampaignDocument(_: FormState, form: FormData): Promise<FormState> {
  const found = await editableCampaign(text(form, "campaign_id"));
  if ("error" in found) return { error: found.error };
  const { campaign, actor } = found;
  const kind = text(form, "kind");
  if (!CAMPAIGN_DOCUMENT_KINDS.some((k) => k.id === kind)) return { error: "Choisissez le type de justificatif." };
  const supplier = text(form, "supplier").slice(0, 120);
  if (kind !== "autre" && supplier.length < 2) return { error: "Indiquez le nom du fournisseur : l'équipe Tribune le contactera pour vérifier le devis." };

  const file = await readUpload(form.get("file"), { maxBytes: DOCUMENT_MAX_BYTES, allowPdf: true, label: "un fichier (PDF ou photo)" });
  if ("error" in file) return { error: file.error };

  const admin = createAdminClient();
  const { count } = await admin.from("campaign_documents").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id);
  if ((count ?? 0) >= CAMPAIGN_DOC_MAX) return { error: `La campagne compte déjà ${CAMPAIGN_DOC_MAX} justificatifs. Retirez-en un avant d'en ajouter.` };

  const path = `${campaign.id}/${randomUUID()}.${file.ext}`;
  const { error: uploadError } = await admin.storage.from("campaign-documents").upload(path, file.bytes, { contentType: file.mime, upsert: false });
  if (uploadError) return { error: "Envoi du justificatif impossible pour le moment. Réessayez." };
  const { error } = await admin.from("campaign_documents").insert({
    campaign_id: campaign.id,
    kind,
    supplier,
    file_path: path,
    file_name: cleanFileName(form.get("file"), `devis.${file.ext}`),
    mime_type: file.mime,
    size_bytes: file.bytes.length,
    uploaded_by: actor,
  });
  if (error) {
    await admin.storage.from("campaign-documents").remove([path]);
    return { error: "Enregistrement du justificatif impossible. Réessayez." };
  }
  await admin.from("audit_log").insert({
    actor_id: actor, action: "campagne.justificatif_ajoute", entity_type: "campaign", entity_id: campaign.id, details: { type: kind, fournisseur: supplier },
  });
  await refreshCampaign(campaign);
  return { success: "Justificatif ajouté." };
}

export async function deleteCampaignDocument(_: FormState, form: FormData): Promise<FormState> {
  const admin = createAdminClient();
  const { data: doc } = await admin
    .from("campaign_documents")
    .select("id, campaign_id, file_path, kind")
    .eq("id", text(form, "document_id"))
    .maybeSingle<{ id: string; campaign_id: string; file_path: string; kind: string }>();
  if (!doc) return { error: "Justificatif introuvable." };
  const found = await editableCampaign(doc.campaign_id);
  if ("error" in found) return { error: found.error };
  await admin.from("campaign_documents").delete().eq("id", doc.id);
  await admin.storage.from("campaign-documents").remove([doc.file_path]);
  await admin.from("audit_log").insert({
    actor_id: found.actor, action: "campagne.justificatif_retire", entity_type: "campaign", entity_id: doc.campaign_id, details: { type: doc.kind },
  });
  await refreshCampaign(found.campaign);
  return { success: "Justificatif retiré." };
}

const PHOTO_MAX = 6;
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Photo de la situation actuelle (bucket public « campaign-images ») : légende et
 * date obligatoires. La première photo devient la couverture de la campagne.
 */
export async function uploadCampaignPhoto(_: FormState, form: FormData): Promise<FormState> {
  const found = await editableCampaign(text(form, "campaign_id"));
  if ("error" in found) return { error: found.error };
  const { campaign, actor } = found;
  const caption = text(form, "caption").slice(0, 200);
  if (caption.length < 3) return { error: "Décrivez la photo en quelques mots : ce qu'elle montre et où.", field: "caption" };
  const takenOn = text(form, "taken_on");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(takenOn) || takenOn < "2000-01-01" || takenOn > todayInKinshasa()) {
    return { error: "Indiquez la date de la photo (pas dans le futur).", field: "taken_on" };
  }
  const file = await readUpload(form.get("photo"), { maxBytes: PHOTO_MAX_BYTES, allowPdf: false, label: "une photo" });
  if ("error" in file) return { error: file.error, field: "photo" };

  const admin = createAdminClient();
  const { count } = await admin.from("campaign_photos").select("id", { count: "exact", head: true }).eq("campaign_id", campaign.id);
  if ((count ?? 0) >= PHOTO_MAX) return { error: `La campagne a déjà ${PHOTO_MAX} photos. Retirez-en une avant d'en ajouter.` };

  const path = `${campaign.id}/photo-${randomUUID()}.${file.ext}`;
  const { error: uploadError } = await admin.storage.from("campaign-images").upload(path, file.bytes, { contentType: file.mime, upsert: false });
  if (uploadError) return { error: "Envoi de la photo impossible pour le moment. Réessayez." };
  const { error } = await admin.from("campaign_photos").insert({
    campaign_id: campaign.id,
    file_path: path,
    caption,
    taken_on: takenOn,
    // Empreinte du fichier : le contrôle repère une photo déjà envoyée par un autre club.
    sha256: createHash("sha256").update(file.bytes).digest("hex"),
    position: count ?? 0,
    uploaded_by: actor,
  });
  if (error) {
    await admin.storage.from("campaign-images").remove([path]);
    return { error: "Enregistrement de la photo impossible. Réessayez." };
  }
  if (!campaign.cover_path) await admin.from("campaigns").update({ cover_path: path }).eq("id", campaign.id);
  await admin.from("audit_log").insert({
    actor_id: actor, action: "campagne.photo_ajoutee", entity_type: "campaign", entity_id: campaign.id, details: { legende: caption, date: takenOn },
  });
  await refreshCampaign(campaign);
  revalidatePath("/");
  return { success: "Photo ajoutée." };
}

type PhotoRow = { id: string; campaign_id: string; file_path: string };

async function photoWithRights(photoId: string): Promise<{ photo: PhotoRow; campaign: CampaignRef; actor: string } | { error: string }> {
  const { data: photo } = await createAdminClient()
    .from("campaign_photos")
    .select("id, campaign_id, file_path")
    .eq("id", photoId)
    .maybeSingle<PhotoRow>();
  if (!photo) return { error: "Photo introuvable." };
  const found = await editableCampaign(photo.campaign_id);
  return "error" in found ? found : { photo, ...found };
}

/** Choisit la photo affichée sur la fiche et en tête de la campagne. */
export async function setCampaignCover(_: FormState, form: FormData): Promise<FormState> {
  const found = await photoWithRights(text(form, "photo_id"));
  if ("error" in found) return { error: found.error };
  const admin = createAdminClient();
  await admin.from("campaigns").update({ cover_path: found.photo.file_path }).eq("id", found.campaign.id);
  await admin.from("audit_log").insert({ actor_id: found.actor, action: "campagne.couverture", entity_type: "campaign", entity_id: found.campaign.id });
  await refreshCampaign(found.campaign);
  revalidatePath("/");
  return { success: "Photo de couverture choisie." };
}

export async function deleteCampaignPhoto(_: FormState, form: FormData): Promise<FormState> {
  const found = await photoWithRights(text(form, "photo_id"));
  if ("error" in found) return { error: found.error };
  const { photo, campaign, actor } = found;
  const admin = createAdminClient();
  await admin.from("campaign_photos").delete().eq("id", photo.id);
  if (campaign.cover_path === photo.file_path) {
    // La couverture passe à la photo suivante, s'il en reste une.
    const { data: next } = await admin
      .from("campaign_photos")
      .select("file_path")
      .eq("campaign_id", campaign.id)
      .order("position")
      .order("created_at")
      .limit(1)
      .maybeSingle<{ file_path: string }>();
    await admin.from("campaigns").update({ cover_path: next?.file_path ?? null }).eq("id", campaign.id);
  }
  await admin.storage.from("campaign-images").remove([photo.file_path]);
  await admin.from("audit_log").insert({ actor_id: actor, action: "campagne.photo_retiree", entity_type: "campaign", entity_id: campaign.id });
  await refreshCampaign(campaign);
  revalidatePath("/");
  return { success: "Photo retirée." };
}

/**
 * Nouvelle (page publique), actualité du club ou message réservé aux contributeurs :
 * publiée tout de suite, destinataires prévenus. L'équipe Tribune peut la retirer ensuite.
 */
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
  revalidatePath("/actualites");
  revalidatePath(`/clubs/${viewer.club.slug}`);
  return {
    success:
      audience === "contributors"
        ? "Message envoyé : chaque contributeur de la campagne est prévenu."
        : campaignId
          ? "Nouvelle publiée sur la page de la campagne : les contributeurs sont prévenus."
          : "Actualité publiée sur la page du club : ses supporters sont prévenus.",
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
