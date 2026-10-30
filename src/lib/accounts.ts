import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const STALE_SIGNUP_MINUTES = 30;

export type AccountRow = { id: string; phone: string | null; email: string | null; role: string; phone_verified_at: string | null; created_at: string };

export const ACCOUNT_COLUMNS = "id, phone, email, role, phone_verified_at, created_at";

/** Inscription de supporter dont le numéro n'a pas (encore) été confirmé par SMS. */
const unconfirmed = (p: AccountRow) => !p.phone_verified_at && p.role === "supporter";
const stale = (p: AccountRow) => Date.now() - new Date(p.created_at).getTime() > STALE_SIGNUP_MINUTES * 60_000;

/**
 * Une inscription jamais confirmée par SMS (par exemple avec le numéro de
 * quelqu'un d'autre) libère le numéro et l'e-mail au bout de 30 minutes :
 * le compte est supprimé s'il n'a aucune contribution. Renvoie true s'il l'a été.
 */
export async function releaseAbandonedSignup(p: AccountRow): Promise<boolean> {
  if (!unconfirmed(p) || !stale(p)) return false;
  const admin = createAdminClient();
  const { count } = await admin.from("contributions").select("id", { count: "exact", head: true }).eq("user_id", p.id);
  if (count) return false;
  await admin.auth.admin.deleteUser(p.id);
  return true;
}

/**
 * Le numéro sert de second facteur et à se faire rembourser : un seul compte par numéro.
 * « pending » : une inscription avec ce numéro ou cet e-mail attend encore son code SMS.
 */
export async function findConflict(phone: string, email: string): Promise<"phone" | "email" | "pending" | null> {
  const admin = createAdminClient();
  const [byPhone, byEmail] = await Promise.all([
    admin.from("profiles").select(ACCOUNT_COLUMNS).eq("phone", phone),
    admin.from("profiles").select(ACCOUNT_COLUMNS).eq("email", email),
  ]);
  const found = [...(byPhone.data ?? []), ...(byEmail.data ?? [])].filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
  for (const p of found as AccountRow[]) {
    if (await releaseAbandonedSignup(p)) continue;
    if (unconfirmed(p) && !stale(p)) return "pending";
    return p.phone === phone ? "phone" : "email";
  }
  return null;
}

export class IdentityConflictError extends Error {}

/**
 * Relie un compte Google à un compte Tribune. Sans effet s'il l'est déjà
 * (idempotent) ; refusé si l'un des deux est déjà relié à un autre.
 */
export async function linkGoogleIdentity(input: { userId: string; subject: string; email: string | null }) {
  const admin = createAdminClient();
  const { error } = await admin.from("oauth_identities").insert({
    provider: "google",
    subject: input.subject,
    user_id: input.userId,
    email: input.email,
  });
  if (error?.code === "23505") {
    const { data: existing } = await admin
      .from("oauth_identities")
      .select("user_id")
      .eq("provider", "google")
      .eq("subject", input.subject)
      .maybeSingle();
    if (existing?.user_id === input.userId) return;
    throw new IdentityConflictError(
      existing ? "Ce compte Google est déjà relié à un autre compte Tribune." : "Ce compte Tribune est déjà relié à un autre compte Google.",
    );
  }
  if (error) throw new Error(`Liaison Google impossible : ${error.message}`);
  await admin.from("audit_log").insert({
    actor_id: input.userId,
    action: "profil.google_relie",
    entity_type: "profile",
    entity_id: input.userId,
    details: { email: input.email },
  });
}
