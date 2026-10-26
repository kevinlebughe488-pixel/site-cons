"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeReturnPath } from "@/lib/auth";
import { checked, keepFields, text, type FormState } from "@/lib/forms";
import { normalizeAnyPhone } from "@/lib/phone";
import { env } from "@/lib/env";

const REGISTER_FIELDS = ["first_name", "last_name", "email", "phone", "residence", "location", "followed_club_id"];

const registerSchema = z.object({
  first_name: z.string().min(1, "Indiquez votre prénom.").max(80),
  last_name: z.string().min(1, "Indiquez votre nom.").max(80),
  email: z.email("L'adresse e-mail n'est pas valide."),
  password: z.string().min(10, "Le mot de passe doit faire au moins 10 caractères.").max(72),
  residence: z.enum(["rdc", "diaspora"]),
  location: z.string().max(120),
  followed_club_id: z.union([z.uuid(), z.literal("")]),
});

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, REGISTER_FIELDS);
  const parsed = registerSchema.safeParse({ ...fields, password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const phone = normalizeAnyPhone(fields.phone);
  if (!phone) return { error: "Indiquez un numéro de téléphone complet, par exemple +243 81 234 5678.", fields };
  if (!checked(form, "consent")) {
    return { error: "Cochez la case de consentement : sans elle, nous ne pouvons pas enregistrer vos contributions.", fields };
  }

  // Le numéro sert à se faire rembourser et à identifier le supporter : il doit être unique.
  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();
  if (existing) return { error: "Ce numéro est déjà utilisé par un autre compte. Connectez-vous.", fields };

  const [city, ...rest] = parsed.data.location.split(",").map((s) => s.trim());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${env.siteUrl}/auth/callback?suite=/compte`,
      data: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        phone,
        residence: parsed.data.residence,
        city: city || null,
        country: rest.join(", ") || (parsed.data.residence === "rdc" ? "RDC" : null),
        followed_club_id: parsed.data.followed_club_id || null,
        newsletter: checked(form, "newsletter"),
      },
    },
  });
  if (error) {
    const message = /already registered|already been registered/i.test(error.message)
      ? "Un compte existe déjà avec cette adresse e-mail. Connectez-vous."
      : "Inscription impossible pour le moment. Vérifiez vos informations et réessayez.";
    return { error: message, fields };
  }
  if (!data.session) {
    return { success: "Compte créé. Ouvrez le lien reçu par e-mail pour confirmer votre adresse, puis connectez-vous." };
  }
  redirect(safeReturnPath(text(form, "suite"), "/compte"));
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email");
  const password = form.get("password");
  if (!email || typeof password !== "string" || !password) {
    return { error: "Indiquez votre e-mail et votre mot de passe.", fields: { email } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message = /not confirmed/i.test(error.message)
      ? "Confirmez d'abord votre adresse avec le lien reçu par e-mail."
      : "E-mail ou mot de passe incorrect.";
    return { error: message, fields: { email } };
  }
  redirect(safeReturnPath(text(form, "suite"), "/compte"));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email");
  if (!z.email().safeParse(email).success) return { error: "L'adresse e-mail n'est pas valide." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.siteUrl}/auth/callback?suite=/compte/mot-de-passe`,
  });
  // Même réponse que l'adresse existe ou non, pour ne pas révéler qui est inscrit.
  return { success: "Si un compte existe avec cette adresse, un lien pour choisir un nouveau mot de passe vient d'être envoyé." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = form.get("password");
  if (typeof password !== "string" || password.length < 10) {
    return { error: "Le mot de passe doit faire au moins 10 caractères." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Changement impossible. Rouvrez le lien reçu par e-mail et réessayez." };
  return { success: "Mot de passe mis à jour." };
}
