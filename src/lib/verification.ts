import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { maskPhone } from "@/lib/phone";
import { sendSms, smsMode } from "@/lib/sms";

// Double authentification par SMS.
//
// 1. Le mot de passe est vérifié (connexion) ou le compte est créé (inscription),
//    mais aucune session n'est ouverte.
// 2. Un code à 6 chiffres part par SMS ; un cookie garde la référence du défi.
// 3. Quand le code est bon, le serveur ouvre la session (lien de connexion
//    généré côté serveur, jamais envoyé par e-mail).

export type ChallengePurpose = "signup" | "login" | "reset";

const COOKIE = "tribune_verif";
const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 3;
const WINDOW_MINUTES = 15;

type ChallengeRow = {
  id: string;
  user_id: string;
  purpose: ChallengePurpose;
  phone: string;
  code_hash: string;
  demo_code: string | null;
  attempts: number;
  return_to: string | null;
  expires_at: string;
  consumed_at: string | null;
};

export class VerificationError extends Error {}

function hashCode(challengeId: string, code: string): string {
  return createHmac("sha256", env.supabaseServiceRoleKey).update(`${challengeId}:${code}`).digest("hex");
}

/** Crée un défi, envoie le code par SMS et garde sa référence dans un cookie. */
export async function startChallenge(input: { userId: string; phone: string; purpose: ChallengePurpose; returnTo?: string }) {
  const admin = createAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await admin
    .from("sms_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .gt("created_at", since);
  if ((count ?? 0) >= MAX_CODES_PER_WINDOW) {
    throw new VerificationError(`Trop de codes demandés. Réessayez dans ${WINDOW_MINUTES} minutes.`);
  }

  const simulation = smsMode() === "simulation";
  const id = crypto.randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Les codes précédents de ce compte ne servent plus.
  await admin.from("sms_challenges").update({ consumed_at: new Date().toISOString() }).eq("user_id", input.userId).is("consumed_at", null);
  const { error } = await admin.from("sms_challenges").insert({
    id,
    user_id: input.userId,
    purpose: input.purpose,
    phone: input.phone,
    code_hash: hashCode(id, code),
    demo_code: simulation ? code : null,
    return_to: input.returnTo ?? null,
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) throw new VerificationError("Impossible de préparer le code. Réessayez.");

  try {
    await sendSms(input.phone, `Tribune : votre code est ${code}. Il expire dans ${CODE_TTL_MINUTES} minutes. Ne le communiquez à personne.`);
  } catch (err) {
    await admin.from("sms_challenges").delete().eq("id", id);
    console.error("Envoi du SMS impossible :", (err as Error).message);
    throw new VerificationError("Le SMS n'a pas pu être envoyé. Vérifiez le numéro ou réessayez dans un instant.");
  }

  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 60,
  });
}

async function currentChallenge(): Promise<ChallengeRow | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const { data } = await createAdminClient().from("sms_challenges").select("*").eq("id", id).maybeSingle<ChallengeRow>();
  return data && !data.consumed_at ? data : null;
}

/** Ce que la page de vérification affiche (jamais le code, sauf en simulation). */
export async function pendingChallenge() {
  const c = await currentChallenge();
  if (!c) return null;
  return {
    purpose: c.purpose,
    maskedPhone: maskPhone(c.phone),
    demoCode: c.demo_code,
    expired: new Date(c.expires_at).getTime() < Date.now(),
  };
}

/** Renvoie un nouveau code pour le défi en cours. */
export async function resendChallenge() {
  const c = await currentChallenge();
  if (!c) throw new VerificationError("La vérification a expiré. Recommencez.");
  await startChallenge({ userId: c.user_id, phone: c.phone, purpose: c.purpose, returnTo: c.return_to ?? undefined });
}

/** Vérifie le code ; s'il est bon, ouvre la session et renvoie le défi validé. */
export async function confirmChallenge(code: string): Promise<{ purpose: ChallengePurpose; returnTo: string | null }> {
  const c = await currentChallenge();
  if (!c) throw new VerificationError("La vérification a expiré. Recommencez.");
  const admin = createAdminClient();

  if (new Date(c.expires_at).getTime() < Date.now()) {
    throw new VerificationError("Ce code a expiré. Demandez-en un nouveau.");
  }
  if (c.attempts >= MAX_ATTEMPTS) {
    throw new VerificationError("Trop d'essais avec ce code. Demandez-en un nouveau.");
  }
  const expected = Buffer.from(c.code_hash, "hex");
  const given = Buffer.from(hashCode(c.id, code), "hex");
  if (!/^\d{6}$/.test(code) || !timingSafeEqual(expected, given)) {
    await admin.from("sms_challenges").update({ attempts: c.attempts + 1 }).eq("id", c.id);
    const left = MAX_ATTEMPTS - c.attempts - 1;
    throw new VerificationError(left > 0 ? `Code incorrect. Encore ${left} essai(s).` : "Code incorrect. Demandez un nouveau code.");
  }

  // Un seul usage : on marque le défi avant d'ouvrir la session.
  const { data: claimed } = await admin
    .from("sms_challenges")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", c.id)
    .is("consumed_at", null)
    .select("id");
  if (!claimed?.length) throw new VerificationError("Ce code a déjà servi. Recommencez.");

  await admin.from("profiles").update({ phone_verified_at: new Date().toISOString() }).eq("id", c.user_id).is("phone_verified_at", null);

  const { data: user } = await admin.auth.admin.getUserById(c.user_id);
  const email = user.user?.email;
  if (!email) throw new VerificationError("Compte introuvable.");
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError || !link.properties?.hashed_token) throw new VerificationError("Connexion impossible pour le moment. Réessayez.");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (error) throw new VerificationError("Connexion impossible pour le moment. Réessayez.");

  (await cookies()).delete(COOKIE);
  return { purpose: c.purpose, returnTo: c.return_to };
}

/** Abandonne la vérification en cours. */
export async function cancelChallenge() {
  (await cookies()).delete(COOKIE);
}
