"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { viewerWith } from "@/lib/auth";
import { dbErrorMessage, text, type FormState } from "@/lib/forms";

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("account:read");
  if ("error" in viewer) return { error: viewer.error };

  const first = text(form, "first_name");
  const last = text(form, "last_name");
  if (!first || !last) return { error: "Indiquez votre prénom et votre nom." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: first.slice(0, 80),
      last_name: last.slice(0, 80),
      city: text(form, "city").slice(0, 80) || null,
      country: text(form, "country").slice(0, 80) || null,
      residence: text(form, "residence") === "diaspora" ? "diaspora" : "rdc",
      newsletter: form.get("newsletter") === "on",
    })
    .eq("id", viewer.profile.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/compte");
  return { success: "Informations enregistrées." };
}

/** Délie le compte Google. Sans effet s'il ne l'est plus (bouton cliqué deux fois). */
export async function unlinkGoogle(): Promise<FormState> {
  const viewer = await viewerWith("account:read");
  if ("error" in viewer) return { error: viewer.error };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("oauth_identities")
    .delete()
    .eq("provider", "google")
    .eq("user_id", viewer.profile.id)
    .select("email");
  if (error) return { error: "Impossible de délier Google pour le moment. Réessayez." };
  if (data.length) {
    await admin.from("audit_log").insert({
      actor_id: viewer.profile.id,
      action: "profil.google_delie",
      entity_type: "profile",
      entity_id: viewer.profile.id,
      details: { email: data[0].email },
    });
  }
  revalidatePath("/compte");
  return { success: "Votre compte n'est plus relié à Google." };
}
