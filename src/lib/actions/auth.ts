"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeReturnPath } from "@/lib/auth";
import { checked, keepFields, text, type FormState } from "@/lib/forms";
import { normalizeAnyPhone } from "@/lib/phone";
import { env } from "@/lib/env";

const REGISTER_FIELDS = ["first_name", "last_name", "email", "phone", "residence", "location", "followed_club_id", "consent", "newsletter"];

const registerSchema = z.object({
  first_name: z.string().min(1, "Indiquez votre prénom.").max(80),
  last_name: z.string().min(1, "Indiquez votre nom.").max(80),
  email: z.email("L'adresse e-mail n'est pas valide."),
  password: z.string().min(10, "Le mot de passe doit faire au moins 10 caractères.").max(72, "Le mot de passe ne doit pas dépasser 72 caractères."),
  residence: z.enum(["rdc", "diaspora"]),
  location: z.string().max(120, "La ville et le pays sont trop longs."),
  followed_club_id: z.union([z.uuid(), z.literal("")]),
});

/** Le numéro sert à se faire rembourser et à identifier le supporter : un seul compte par numéro. */
async function phoneTaken(phone: string): Promise<boolean> {
  const { data } = await createAdminClient().from("profiles").select("id").eq("phone", phone).maybeSingle();
  return Boolean(data);
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, REGISTER_FIELDS);
  fields.consent = checked(form, "consent") ? "on" : "";
  fields.newsletter = checked(form, "newsletter") ? "on" : "";
  const fail = (error: string, field?: string): FormState => ({ error, field, fields });

  const parsed = registerSchema.safeParse({ ...fields, password: form.get("password") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue.message, String(issue.path[0] ?? ""));
  }
  const phone = normalizeAnyPhone(fields.phone);
  if (!phone) return fail("Indiquez un numéro de téléphone complet, par exemple +243 81 234 5678.", "phone");
  if (!fields.consent) {
    return fail("Cochez la case de consentement : sans elle, nous ne pouvons pas enregistrer vos contributions.", "consent");
  }
  if (await phoneTaken(phone)) return fail("Ce numéro de téléphone est déjà utilisé par un autre compte. Connectez-vous.", "phone");

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
        newsletter: fields.newsletter === "on",
      },
    },
  });
  if (error) {
    if (/already registered|already been registered|already exists/i.test(error.message)) {
      return fail("Un compte existe déjà avec cette adresse e-mail. Connectez-vous.", "email");
    }
    // La base refuse un numéro déjà pris (inscription simultanée avec le même numéro).
    if (/database error/i.test(error.message) && (await phoneTaken(phone))) {
      return fail("Ce numéro de téléphone est déjà utilisé par un autre compte. Connectez-vous.", "phone");
    }
    if (/rate limit/i.test(error.message)) {
      return fail("Trop d'inscriptions en peu de temps. Réessayez dans quelques minutes.");
    }
    if (/password/i.test(error.message)) return fail("Ce mot de passe est trop simple. Choisissez-en un autre.", "password");
    console.error("Inscription refusée par Supabase :", error.message);
    return fail("Inscription impossible pour le moment. Vérifiez vos informations et réessayez.");
  }
  // Adresse déjà inscrite : avec la confirmation par e-mail activée, Supabase ne renvoie
  // pas d'erreur (pour ne pas révéler les comptes) mais un utilisateur sans identité.
  if (data.user && data.user.identities?.length === 0) {
    return fail("Un compte existe déjà avec cette adresse e-mail. Connectez-vous.", "email");
  }
  if (!data.session) {
    return { success: "Compte créé. Ouvrez le lien reçu par e-mail pour confirmer votre adresse, puis connectez-vous." };
  }
  redirect(safeReturnPath(text(form, "suite"), "/compte"));
}

/** Connexion avec l'e-mail ou le numéro de téléphone du compte. */
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const login = text(form, "login");
  const password = form.get("password");
  const fields = { login };
  if (!login) return { error: "Indiquez votre e-mail ou votre numéro de téléphone.", field: "login", fields };
  if (typeof password !== "string" || !password) return { error: "Indiquez votre mot de passe.", field: "password", fields };

  let email = login;
  if (!login.includes("@")) {
    const phone = normalizeAnyPhone(login);
    const { data } = phone
      ? await createAdminClient().from("profiles").select("email").eq("phone", phone).maybeSingle<{ email: string | null }>()
      : { data: null };
    // Même message qu'un mauvais mot de passe, pour ne pas révéler quels numéros sont inscrits.
    if (!data?.email) return { error: "Identifiant ou mot de passe incorrect.", fields };
    email = data.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message = /not confirmed/i.test(error.message)
      ? "Confirmez d'abord votre adresse avec le lien reçu par e-mail."
      : "Identifiant ou mot de passe incorrect.";
    return { error: message, fields };
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
