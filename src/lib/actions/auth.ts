"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeReturnPath } from "@/lib/auth";
import { checked, keepFields, text, type FormState } from "@/lib/forms";
import { normalizeAnyPhone } from "@/lib/phone";
import { env } from "@/lib/env";
import { findConflict, IdentityConflictError, linkGoogleIdentity, STALE_SIGNUP_MINUTES } from "@/lib/accounts";
import {
  claimGoogleSignup,
  googleAuthorizationUrl,
  googleEnabled,
  pendingGoogleSignup,
  recordGoogleSignup,
  releaseGoogleSignup,
  resumeGoogleSignup,
} from "@/lib/google";
import { cancelChallenge, confirmChallenge, resendChallenge, startChallenge, VerificationError } from "@/lib/verification";

const REGISTER_FIELDS = ["first_name", "last_name", "email", "phone", "residence", "location", "followed_club_id", "consent", "newsletter"];
const GOOGLE_REGISTER_FIELDS = REGISTER_FIELDS.filter((name) => name !== "email");

const registerSchema = z.object({
  first_name: z.string().min(1, "Indiquez votre prénom.").max(80),
  last_name: z.string().min(1, "Indiquez votre nom.").max(80),
  email: z.email("L'adresse e-mail n'est pas valide."),
  password: z.string().min(10, "Le mot de passe doit faire au moins 10 caractères.").max(72, "Le mot de passe ne doit pas dépasser 72 caractères."),
  residence: z.enum(["rdc", "diaspora"]),
  location: z.string().max(120, "La ville et le pays sont trop longs."),
  followed_club_id: z.union([z.uuid(), z.literal("")]),
});

const googleRegisterSchema = registerSchema.omit({ email: true, password: true });

/** Informations du profil, lues par la base à la création du compte (handle_new_user). */
function profileMetadata(data: z.infer<typeof googleRegisterSchema>, phone: string, newsletter: boolean) {
  const [city, ...rest] = data.location.split(",").map((s) => s.trim());
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    phone,
    residence: data.residence,
    city: city || null,
    country: rest.join(", ") || (data.residence === "rdc" ? "RDC" : null),
    followed_club_id: data.followed_club_id || null,
    newsletter,
  };
}

const PENDING_SIGNUP = `Une inscription avec ce numéro ou cet e-mail attend sa confirmation par SMS. Connectez-vous pour la terminer, ou réessayez dans ${STALE_SIGNUP_MINUTES} minutes.`;

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
  const email = parsed.data.email.toLowerCase();
  const conflict = await findConflict(phone, email);
  if (conflict === "phone") return fail("Ce numéro de téléphone est déjà utilisé par un autre compte. Connectez-vous.", "phone");
  if (conflict === "email") return fail("Un compte existe déjà avec cette adresse e-mail. Connectez-vous.", "email");
  if (conflict === "pending") return fail(PENDING_SIGNUP);

  // Compte créé par le serveur, adresse marquée confirmée : aucun e-mail n'est envoyé,
  // la vérification se fait par le code SMS.
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: profileMetadata(parsed.data, phone, fields.newsletter === "on"),
  });
  if (error || !data.user) {
    if (error && /already (been )?registered|already exists/i.test(error.message)) {
      return fail("Un compte existe déjà avec cette adresse e-mail. Connectez-vous.", "email");
    }
    if (error && /password/i.test(error.message)) return fail("Ce mot de passe est trop simple. Choisissez-en un autre.", "password");
    // La base refuse un numéro déjà pris (deux inscriptions simultanées).
    if ((await findConflict(phone, email)) === "phone") {
      return fail("Ce numéro de téléphone est déjà utilisé par un autre compte. Connectez-vous.", "phone");
    }
    console.error("Inscription refusée par Supabase :", error?.message);
    return fail("Inscription impossible pour le moment. Vérifiez vos informations et réessayez.");
  }

  try {
    await startChallenge({ userId: data.user.id, phone, purpose: "signup", returnTo: safeReturnPath(text(form, "suite"), "/") });
  } catch (err) {
    // Le compte reste en attente : la personne pourra le terminer en se connectant.
    return fail(err instanceof VerificationError ? err.message : "Le SMS n'a pas pu être envoyé. Connectez-vous pour recevoir un nouveau code.");
  }
  redirect("/verification");
}

/** Bouton « Continuer avec Google » : prépare la connexion et envoie vers Google. */
export async function startGoogle(form: FormData) {
  const returnTo = safeReturnPath(text(form, "suite"), "/");
  // Le bouton est affiché même avant la configuration de Google : on le dit simplement.
  if (!googleEnabled()) redirect(`/connexion?google=indisponible&suite=${encodeURIComponent(returnTo)}`);
  let url: string;
  try {
    url = await googleAuthorizationUrl(returnTo);
  } catch (err) {
    console.error("Connexion Google impossible :", (err as Error).message);
    redirect("/connexion?google=echec");
  }
  redirect(url);
}

/**
 * Fin de l'inscription avec Google : l'adresse vient de Google (vérifiée), la
 * personne ajoute son numéro et donne son consentement, puis confirme par SMS.
 * Pas de mot de passe : elle se connecte avec Google (ou en choisit un plus tard
 * avec « Mot de passe oublié »).
 */
export async function completeGoogleSignup(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, GOOGLE_REGISTER_FIELDS);
  fields.consent = checked(form, "consent") ? "on" : "";
  fields.newsletter = checked(form, "newsletter") ? "on" : "";
  const fail = (error: string, field?: string): FormState => ({ error, field, fields });

  const signup = await pendingGoogleSignup();
  if (!signup) return fail("La connexion avec Google a expiré. Recommencez avec « Continuer avec Google ».");
  const alreadySent = "Votre inscription a déjà été envoyée. Si vous n'avez pas reçu de code, recommencez avec « Continuer avec Google ».";
  // Formulaire déjà envoyé (double clic, page renvoyée) : même résultat que le premier envoi.
  if (signup.started) {
    if (await resumeGoogleSignup(signup.id)) redirect("/verification");
    return fail(alreadySent);
  }

  const parsed = googleRegisterSchema.safeParse(fields);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue.message, String(issue.path[0] ?? ""));
  }
  const phone = normalizeAnyPhone(fields.phone);
  if (!phone) return fail("Indiquez un numéro de téléphone complet, par exemple +243 81 234 5678.", "phone");
  if (!fields.consent) {
    return fail("Cochez la case de consentement : sans elle, nous ne pouvons pas enregistrer vos contributions.", "consent");
  }
  const conflict = await findConflict(phone, signup.email);
  if (conflict === "phone") return fail("Ce numéro de téléphone est déjà utilisé par un autre compte. Connectez-vous.", "phone");
  if (conflict === "email") return fail("Un compte existe déjà avec cette adresse e-mail. Recommencez avec « Continuer avec Google » pour le relier.");
  if (conflict === "pending") return fail(PENDING_SIGNUP);

  if (!(await claimGoogleSignup(signup.id))) {
    if (await resumeGoogleSignup(signup.id)) redirect("/verification");
    return fail(alreadySent);
  }
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: signup.email,
    email_confirm: true,
    user_metadata: profileMetadata(parsed.data, phone, fields.newsletter === "on"),
  });
  if (error || !data.user) {
    await releaseGoogleSignup(signup.id);
    if (error && /already (been )?registered|already exists/i.test(error.message)) {
      return fail("Un compte existe déjà avec cette adresse e-mail. Recommencez avec « Continuer avec Google » pour le relier.");
    }
    if ((await findConflict(phone, signup.email)) === "phone") {
      return fail("Ce numéro de téléphone est déjà utilisé par un autre compte. Connectez-vous.", "phone");
    }
    console.error("Inscription Google refusée par Supabase :", error?.message);
    return fail("Inscription impossible pour le moment. Vérifiez vos informations et réessayez.");
  }

  try {
    await linkGoogleIdentity({ userId: data.user.id, subject: signup.subject, email: signup.email });
  } catch (err) {
    // Ce compte Google a été relié ailleurs entre-temps : on n'en garde pas un second.
    await admin.auth.admin.deleteUser(data.user.id);
    await releaseGoogleSignup(signup.id);
    if (!(err instanceof IdentityConflictError)) console.error((err as Error).message);
    return fail(err instanceof IdentityConflictError ? err.message : "Inscription impossible pour le moment. Réessayez.");
  }
  await recordGoogleSignup(signup.id, data.user.id);

  try {
    await startChallenge({ userId: data.user.id, phone, purpose: "signup", returnTo: signup.returnTo, oauthLoginId: signup.id });
  } catch (err) {
    // Le compte reste en attente : « Continuer avec Google » enverra un nouveau code.
    return fail(
      err instanceof VerificationError
        ? `${err.message} Votre compte est créé : recommencez avec « Continuer avec Google » pour recevoir un code.`
        : "Votre compte est créé, mais le SMS n'a pas pu être envoyé. Recommencez avec « Continuer avec Google » pour recevoir un code.",
    );
  }
  redirect("/verification");
}

/** Retrouve le compte à partir d'un e-mail ou d'un numéro de téléphone. */
async function findAccount(login: string): Promise<{ id: string; email: string | null; phone: string | null } | null> {
  const admin = createAdminClient();
  const query = admin.from("profiles").select("id, email, phone");
  if (login.includes("@")) {
    const { data } = await query.eq("email", login.toLowerCase()).maybeSingle();
    return data;
  }
  const phone = normalizeAnyPhone(login);
  if (!phone) return null;
  const { data } = await query.eq("phone", phone).maybeSingle();
  return data;
}

/** Connexion : identifiant (e-mail ou téléphone) et mot de passe, puis code SMS. */
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const login = text(form, "login");
  const password = form.get("password");
  const fields = { login };
  if (!login) return { error: "Indiquez votre e-mail ou votre numéro de téléphone.", field: "login", fields };
  if (typeof password !== "string" || !password) return { error: "Indiquez votre mot de passe.", field: "password", fields };

  // Même message dans tous les cas d'échec, pour ne pas révéler quels comptes existent.
  const wrong: FormState = { error: "Identifiant ou mot de passe incorrect.", fields };
  const account = await findAccount(login);
  if (!account?.email) return wrong;

  // Vérifie le mot de passe sans ouvrir de session dans le navigateur.
  const probe = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await probe.auth.signInWithPassword({ email: account.email, password });
  if (error) return wrong;
  await probe.auth.signOut({ scope: "local" });

  if (!account.phone) {
    return { error: "Aucun numéro de téléphone n'est enregistré sur ce compte. Contactez l'équipe Tribune.", fields };
  }
  try {
    await startChallenge({ userId: account.id, phone: account.phone, purpose: "login", returnTo: safeReturnPath(text(form, "suite"), "/") });
  } catch (err) {
    return { error: err instanceof VerificationError ? err.message : "Le SMS n'a pas pu être envoyé. Réessayez.", fields };
  }
  redirect("/verification");
}

/** Saisie du code reçu par SMS. */
export async function verifyCode(_: FormState, form: FormData): Promise<FormState> {
  const code = text(form, "code").replace(/\s/g, "");
  let result: Awaited<ReturnType<typeof confirmChallenge>>;
  try {
    result = await confirmChallenge(code);
  } catch (err) {
    return { error: err instanceof VerificationError ? err.message : "Vérification impossible. Réessayez.", field: "code" };
  }
  if (result.purpose === "reset") redirect("/compte/mot-de-passe");
  redirect(safeReturnPath(result.returnTo, "/"));
}

export async function resendCode(): Promise<FormState> {
  try {
    await resendChallenge();
  } catch (err) {
    return { error: err instanceof VerificationError ? err.message : "Le SMS n'a pas pu être envoyé. Réessayez." };
  }
  return { success: "Un nouveau code vient d'être envoyé." };
}

export async function cancelVerification() {
  await cancelChallenge();
  redirect("/connexion");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Mot de passe oublié : un code SMS ouvre une session pour choisir un nouveau mot de passe. */
export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const login = text(form, "login");
  if (!login) return { error: "Indiquez votre e-mail ou votre numéro de téléphone.", field: "login" };
  const account = await findAccount(login);
  if (!account?.phone) return { error: "Aucun compte ne correspond à cet identifiant.", field: "login", fields: { login } };
  try {
    await startChallenge({ userId: account.id, phone: account.phone, purpose: "reset" });
  } catch (err) {
    return { error: err instanceof VerificationError ? err.message : "Le SMS n'a pas pu être envoyé. Réessayez.", fields: { login } };
  }
  redirect("/verification");
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const password = form.get("password");
  if (typeof password !== "string" || password.length < 10) {
    return { error: "Le mot de passe doit faire au moins 10 caractères." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Changement impossible. Recommencez depuis « Mot de passe oublié »." };
  return { success: "Mot de passe mis à jour." };
}
