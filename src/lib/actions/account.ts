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
      // Lieu de vie et nouvelles des campagnes : questions posées aux seuls supporters.
      ...(form.has("residence")
        ? { residence: text(form, "residence") === "diaspora" ? "diaspora" : "rdc", newsletter: form.get("newsletter") === "on" }
        : {}),
    })
    .eq("id", viewer.profile.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/compte");
  return { success: "Informations enregistrées." };
}

/** Demande de suppression du compte : inscrite au journal d'audit, traitée par l'équipe Tribune. */
export async function requestAccountDeletion(): Promise<FormState> {
  const viewer = await viewerWith("account:read");
  if ("error" in viewer) return { error: viewer.error };
  const { error } = await createAdminClient().from("audit_log").insert({
    actor_id: viewer.profile.id,
    action: "compte.suppression_demandee",
    entity_type: "profile",
    entity_id: viewer.profile.id,
  });
  if (error) return { error: "La demande n'a pas pu être enregistrée. Réessayez dans un instant." };
  return {
    success:
      "Demande enregistrée. L'équipe Tribune supprime vos données personnelles et vous le confirme ; les contributions que la loi oblige à garder sont conservées à part, puis effacées.",
  };
}
