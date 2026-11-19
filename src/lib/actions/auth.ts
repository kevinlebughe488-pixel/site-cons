"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer, safeReturnPath } from "@/lib/auth";
import { checked, keepFields, text, type FormState } from "@/lib/forms";
import { maskPhone, normalizeAnyPhone } from "@/lib/phone";
import { sendSms } from "@/lib/sms";
import { env } from "@/lib/env";
import {
  cancelChallenge,
  clearPasswordReset,
  confirmChallenge,
  grantPasswordReset,
  passwordResetGrant,
  resendChallenge,
  startChallenge,
  VerificationError,
} from "@/lib/verification";

const REGISTER_FIELDS = ["first_name", "last_name", "email", "phone", "residence", "location", "followed_club_id", "consent", "newsletter", "account_type"];

const registerSchema = z.object({
  first_name: z.string().min(1, "Indiquez votre prénom.").max(80),
  last_name: z.string().min(1, "Indiquez votre nom.").max(80),
  email: z.email("L'adresse e-mail n'est pas valide."),
  password: z.string().min(10, "Le mot de passe doit faire au moins 10 caractères.").max(72, "Le mot de passe ne doit pas dépasser 72 caractères."),
  residence: z.enum(["rdc", "diaspora"]),
  location: z.string().max(120, "La ville et le pays sont trop longs."),
  followed_club_id: z.union([z.uuid(), z.literal("")]),
});

const STALE_SIGNUP_MINUTES = 30;

/**
 * Le numéro sert de second facteur et à se faire rembourser : un seul compte par numéro.
 * Une inscription jamais confirmée par SMS (par exemple avec le numéro de quelqu'un
 * d'autre) libère le numéro et l'e-mail au bout de 30 minutes.
 */
async function findConflict(phone: string, email: string): Promise<"phone" | "email" | "pending" | null> {
  const admin = createAdminClient();
  const columns = "id, phone, email, role, phone_verified_at, created_at";
  const [byPhone, byEmail] = await Promise.all([
    admin.from("profiles").select(columns).eq("phone", phone),
    admin.from("profiles").select(columns).eq("email", email),
  ]);
  const found = [...(byPhone.data ?? []), ...(byEmail.data ?? [])].filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
  for (const p of found as { id: string; phone: string | null; email: string | null; role: string; phone_verified_at: string | null; created_at: string }[]) {
    if (!p.phone_verified_at && p.role === "supporter") {
      const stale = Date.now() - new Date(p.created_at).getTime() > STALE_SIGNUP_MINUTES * 60_000;
      if (!stale) return "pending";
      const { count } = await admin.from("contributions").select("id", { count: "exact", head: true }).eq("user_id", p.id);
      if (!count) {
        await admin.auth.admin.deleteUser(p.id);
        continue;
      }
    }
    return p.phone === phone ? "phone" : "email";
  }
  return null;
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, REGISTER_FIELDS);
  // « Je représente un club » : compte personnel du représentant, qui remplira ensuite le dossier du club.
  const forClub = fields.account_type === "club";
  if (forClub) {
    fields.residence = "rdc";
    fields.followed_club_id = "";
  }
  fields.consent = checked(form, "consent") ? "on" : "";
  // Case décochée par défaut : pas d'accord implicite.
  fields.newsletter = !forClub && checked(form, "newsletter") ? "on" : "";
  const fail = (error: string, field?: string): FormState => ({ error, field, fields });

  const parsed = registerSchema.safeParse({ ...fields, password: form.get("password") });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue.message, String(issue.path[0] ?? ""));
  }
  const phone = normalizeAnyPhone(fields.phone);
  if (!phone) return fail("Indiquez un numéro de téléphone complet, par exemple +243 81 234 5678.", "phone");
  if (!fields.consent) {
    return fail("Cochez la case : il faut avoir 18 ans et accepter les conditions d'utilisation et la politique de confidentialité.", "consent");
  }
  const email = parsed.data.email.toLowerCase();
  const conflict = await findConflict(phone, email);
  if (conflict === "phone") return fail("Ce numéro de téléphone est déjà utilisé par un autre compte. Connectez-vous.", "phone");
  if (conflict === "email") return fail("Un compte existe déjà avec cette adresse e-mail. Connectez-vous.", "email");
  if (conflict === "pending") {
    return fail(`Une inscription avec ce numéro ou cet e-mail attend sa confirmation par SMS. Connectez-vous pour la terminer, ou réessayez dans ${STALE_SIGNUP_MINUTES} minutes.`);
  }

  // Compte créé par le serveur, adresse marquée confirmée : aucun e-mail n'est envoyé,
  // la vérification se fait par le code SMS.
  const [city, ...rest] = parsed.data.location.split(",").map((s) => s.trim());
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone,
      residence: parsed.data.residence,
      city: city || null,
      country: rest.join(", ") || (parsed.data.residence === "rdc" ? "RDC" : null),
      followed_club_id: parsed.data.followed_club_id || null,
      newsletter: fields.newsletter === "on",
      signup_intent: forClub ? "club" : "supporter",
    },
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
    await startChallenge({
      userId: data.user.id,
      phone,
      purpose: "signup",
      // Après le code SMS, le représentant d'un club arrive directement sur le dossier du club.
      returnTo: forClub ? "/club" : safeReturnPath(text(form, "suite"), "/"),
    });
  } catch (err) {
    // Le compte reste en attente : la personne pourra le terminer en se connectant.
    return fail(err instanceof VerificationError ? err.message : "Le SMS n'a pas pu être envoyé. Connectez-vous pour recevoir un nouveau code.");
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
  if (result.purpose === "reset") {
    await grantPasswordReset(result.userId);
    redirect("/mot-de-passe-oublie/nouveau");
  }
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

const PASSWORD_MIN = 10;
const PASSWORD_MAX = 72;

/** Règles communes au changement et à la réinitialisation ; renvoie une erreur ou null. */
function checkNewPassword(password: unknown, confirm: unknown): FormState | null {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) {
    return { error: `Le nouveau mot de passe doit faire au moins ${PASSWORD_MIN} caractères.`, field: "password" };
  }
  if (password.length > PASSWORD_MAX) return { error: `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX} caractères.`, field: "password" };
  if (password !== confirm) return { error: "Les deux mots de passe ne sont pas identiques.", field: "password_confirm" };
  return null;
}

/** Prévient le titulaire du compte par SMS (sécurité). Un échec d'envoi ne bloque rien. */
async function notifyPasswordChanged(userId: string, how: "change" | "reset") {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("phone").eq("id", userId).maybeSingle<{ phone: string | null }>();
  await admin.from("audit_log").insert({
    actor_id: userId,
    action: how === "change" ? "compte.mot_de_passe_modifie" : "compte.mot_de_passe_reinitialise",
    entity_type: "profile",
    entity_id: userId,
  });
  if (!profile?.phone) return null;
  try {
    await sendSms(profile.phone, "Tribune : le mot de passe de votre compte vient d'être modifié. Si ce n'est pas vous, contactez l'équipe Tribune.");
  } catch (err) {
    console.error("SMS de sécurité non envoyé :", (err as Error).message);
  }
  return maskPhone(profile.phone);
}

/**
 * Modifier son mot de passe depuis « Mon compte » : il faut l'actuel. Les autres
 * appareils connectés sont déconnectés et le titulaire est prévenu par SMS.
 */
export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  const current = form.get("current_password");
  const password = form.get("password");
  if (typeof current !== "string" || !current) return { error: "Indiquez votre mot de passe actuel.", field: "current_password" };
  const invalid = checkNewPassword(password, form.get("password_confirm"));
  if (invalid) return invalid;
  if (password === current) return { error: "Choisissez un mot de passe différent de l'actuel.", field: "password" };

  if (!viewer.profile.email) return { error: "Aucune adresse e-mail n'est liée à ce compte. Utilisez « Mot de passe oublié »." };

  // Vérifie l'actuel sans toucher à la session du navigateur.
  const probe = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await probe.auth.signInWithPassword({ email: viewer.profile.email, password: current });
  if (wrong) return { error: "Le mot de passe actuel est incorrect.", field: "current_password" };
  await probe.auth.signOut({ scope: "local" });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password as string });
  if (error) {
    if (/password/i.test(error.message)) return { error: "Ce mot de passe est trop simple. Choisissez-en un autre.", field: "password" };
    return { error: "Modification impossible pour le moment. Réessayez." };
  }
  await supabase.auth.signOut({ scope: "others" });
  const phone = await notifyPasswordChanged(viewer.profile.id, "change");
  return { success: phone ? `Un SMS de confirmation a été envoyé au ${phone}.` : "Mot de passe modifié." };
}

/** Mot de passe oublié : nouveau mot de passe, autorisé par le code SMS qui vient d'être validé. */
export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const viewer = await getViewer();
  const granted = await passwordResetGrant();
  if (!viewer || !granted || granted !== viewer.profile.id) {
    return { error: "L'autorisation a expiré. Recommencez depuis « Mot de passe oublié »." };
  }
  const invalid = checkNewPassword(form.get("password"), form.get("password_confirm"));
  if (invalid) return invalid;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: form.get("password") as string });
  if (error) {
    if (/same|different/i.test(error.message)) return { error: "Choisissez un mot de passe différent de l'ancien.", field: "password" };
    if (/password/i.test(error.message)) return { error: "Ce mot de passe est trop simple. Choisissez-en un autre.", field: "password" };
    return { error: "Changement impossible. Recommencez depuis « Mot de passe oublié »." };
  }
  await clearPasswordReset();
  await supabase.auth.signOut({ scope: "others" });
  await notifyPasswordChanged(viewer.profile.id, "reset");
  redirect("/compte?ok=mot_de_passe");
}
