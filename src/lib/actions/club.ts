"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer, viewerWith } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { dbErrorMessage, keepFields, text, type FormState } from "@/lib/forms";
import { slugify } from "@/lib/format";
import { normalizeAnyPhone, normalizeDrcPhone } from "@/lib/phone";
import { isKnownProvider } from "@/lib/payments/providers";
import { CAMPAIGN_CATEGORIES } from "@/lib/types";

const CLUB_FIELDS = [
  "name", "short_name", "city", "commune", "founded_year", "description", "president_name",
  "contact_phone", "payout_phone", "payout_provider", "color_primary", "color_secondary",
];
const HEX = /^#[0-9a-fA-F]{6}$/;

export async function registerClub(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, CLUB_FIELDS);
  const viewer = await viewerWith("club:register");
  if ("error" in viewer) return { error: viewer.error, fields };

  if (fields.name.length < 3) return { error: "Indiquez le nom complet du club.", fields };
  const shortName = fields.short_name.toUpperCase();
  if (!/^[A-Z0-9]{2,4}$/.test(shortName)) return { error: "Le sigle doit faire 2 à 4 lettres ou chiffres (ex. TPM).", fields };
  if (fields.president_name.length < 3) return { error: "Indiquez le nom du président du club.", fields };
  const contact = normalizeAnyPhone(fields.contact_phone);
  if (!contact) return { error: "Le téléphone de contact n'est pas valide.", fields };
  const payout = normalizeDrcPhone(fields.payout_phone);
  if (!payout) return { error: "Le numéro Mobile Money de versement doit être un numéro congolais valide.", fields };
  if (!isKnownProvider(fields.payout_provider)) return { error: "Choisissez l'opérateur du compte de versement.", fields };
  const year = fields.founded_year ? Number(fields.founded_year) : null;
  if (year !== null && !(Number.isInteger(year) && year >= 1850 && year <= new Date().getFullYear())) {
    return { error: "L'année de fondation n'est pas valide.", fields };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_club", {
    p_name: fields.name,
    p_short_name: shortName,
    p_slug: slugify(fields.name),
    p_city: fields.city,
    p_commune: fields.commune,
    p_founded_year: year,
    p_description: fields.description.slice(0, 4000),
    p_president_name: fields.president_name,
    p_contact_phone: contact,
    p_payout_phone: payout,
    p_payout_provider: fields.payout_provider,
    p_color_primary: HEX.test(fields.color_primary) ? fields.color_primary : "#1d5237",
    p_color_secondary: HEX.test(fields.color_secondary) ? fields.color_secondary : "#ecd083",
  });
  if (error) return { error: dbErrorMessage(error), fields };
  revalidatePath("/club");
  redirect("/club");
}

export async function updateClubInfo(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer?.club) return { error: "Vous ne gérez aucun club." };
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
  return { success: "Présentation du club enregistrée." };
}

const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const LOGO_MAX_BYTES = 1024 * 1024;

/** Envoie le logo d'un club. Réservé aux gestionnaires du club et à l'équipe Tribune. */
export async function uploadClubLogo(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const clubId = text(form, "club_id");
  if (viewer.club?.id !== clubId && !isStaff(viewer.profile.role)) {
    return { error: "Vous ne pouvez pas modifier le logo de ce club." };
  }
  const file = form.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choisissez une image." };
  const ext = LOGO_TYPES[file.type];
  if (!ext) return { error: "Le logo doit être une image PNG, JPEG ou WebP." };
  if (file.size > LOGO_MAX_BYTES) return { error: "Le logo ne doit pas dépasser 1 Mo." };

  const admin = createAdminClient();
  const { data: club } = await admin.from("clubs").select("id, logo_path").eq("id", clubId).maybeSingle();
  if (!club) return { error: "Club introuvable." };

  const path = `${clubId}/logo-${Date.now()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("club-logos")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (uploadError) return { error: "Envoi du logo impossible pour le moment." };

  await admin.from("clubs").update({ logo_path: path }).eq("id", clubId);
  if (club.logo_path) await admin.storage.from("club-logos").remove([club.logo_path]);
  await admin.from("audit_log").insert({ actor_id: viewer.profile.id, action: "club.logo", entity_type: "club", entity_id: clubId });
  revalidatePath("/", "layout");
  return { success: "Logo mis à jour." };
}

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

const CAMPAIGN_FIELDS = ["title", "category", "summary", "description", "goal", "end_date", "budget", "milestones"];

export async function saveCampaign(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, CAMPAIGN_FIELDS);
  const viewer = await viewerWith("club:manage");
  if ("error" in viewer) return { error: viewer.error, fields };
  if (!viewer.club || viewer.club.status !== "verified") {
    return { error: "Votre club doit être vérifié par Tribune avant de créer une campagne.", fields };
  }

  if (fields.title.length < 5) return { error: "Le titre doit faire au moins 5 caractères.", fields };
  if (!(CAMPAIGN_CATEGORIES as readonly string[]).includes(fields.category)) return { error: "Choisissez un thème.", fields };
  const goal = Number(fields.goal);
  if (!Number.isInteger(goal) || goal < 100 || goal > 1_000_000) {
    return { error: "L'objectif doit être un montant entier entre 100 $ et 1 000 000 $.", fields };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.end_date)) return { error: "Choisissez la date de clôture.", fields };
  const budget = parseJsonList(fields.budget, lineSchema);
  if (!budget) return { error: "Chaque ligne de budget doit avoir un libellé et un montant positif.", fields };
  const milestones = parseJsonList(fields.milestones, milestoneSchema);
  if (!milestones) return { error: "Chaque jalon doit avoir un libellé.", fields };

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
    p_end_date: fields.end_date,
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

export async function postUpdate(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("club:manage");
  if ("error" in viewer) return { error: viewer.error };
  const title = text(form, "title");
  const body = text(form, "body");
  if (title.length < 3 || body.length < 10) return { error: "Donnez un titre et quelques phrases à votre nouvelle." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_campaign_update", {
    p_campaign_id: text(form, "campaign_id"),
    p_title: title.slice(0, 140),
    p_body: body.slice(0, 4000),
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/club/campagnes/${text(form, "campaign_id")}`);
  return { success: "Nouvelle envoyée. Elle sera publiée après relecture par l'équipe Tribune." };
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
