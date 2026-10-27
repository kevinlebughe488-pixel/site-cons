"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { viewerWith } from "@/lib/auth";
import { dbErrorMessage, text, type FormState } from "@/lib/forms";
import { normalizeAnyPhone } from "@/lib/phone";

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await viewerWith("account:read");
  if ("error" in viewer) return { error: viewer.error };

  const first = text(form, "first_name");
  const last = text(form, "last_name");
  if (!first || !last) return { error: "Indiquez votre prénom et votre nom." };
  const phone = normalizeAnyPhone(text(form, "phone"));
  if (!phone) return { error: "Le numéro de téléphone n'est pas valide." };
  if (phone !== viewer.profile.phone) {
    const { data: taken } = await createAdminClient().from("profiles").select("id").eq("phone", phone).neq("id", viewer.profile.id).maybeSingle();
    if (taken) return { error: "Ce numéro est déjà utilisé par un autre compte." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: first.slice(0, 80),
      last_name: last.slice(0, 80),
      phone,
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
