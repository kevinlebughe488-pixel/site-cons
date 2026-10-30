import "server-only";
import { createHash, createPublicKey, randomBytes, timingSafeEqual, verify, type JsonWebKey } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer, safeReturnPath } from "@/lib/auth";
import { ACCOUNT_COLUMNS, releaseAbandonedSignup, type AccountRow } from "@/lib/accounts";
import { env } from "@/lib/env";
import { resumeChallenge, startChallenge, VerificationError } from "@/lib/verification";

// Connexion avec Google (OpenID Connect : code d'autorisation, PKCE, nonce).
//
// Le site parle lui-même à Google ; le fournisseur Google de Supabase reste
// désactivé (il relierait tout seul les comptes de même adresse et ouvrirait
// une session sans code SMS).
//
// 1. Le bouton enregistre une connexion en cours (state, nonce, PKCE), liée à
//    ce navigateur par un cookie, puis envoie vers Google.
// 2. Au retour, le serveur échange le code contre le jeton d'identité de Google,
//    vérifie sa signature et son contenu, puis cherche le compte :
//      - compte Google déjà relié → code SMS de connexion ;
//      - adresse vérifiée par Google égale à celle d'un compte Tribune → code SMS
//        envoyé au numéro de CE compte ; Google n'est relié qu'une fois le code saisi ;
//      - sinon → formulaire d'inscription (numéro, consentement), puis code SMS.
// 3. La session n'est ouverte qu'après le code SMS (voir verification.ts).
//
// Idempotence : un retour de Google n'est traité qu'une fois. Rechargé, reçu en
// double ou en même temps, il renvoie vers la même étape, sans nouvel échange
// avec Google, sans nouveau SMS et sans second compte.

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

const COOKIE = "tribune_google";
const LOGIN_TTL_MINUTES = 10;
const SIGNUP_TTL_MINUTES = 30;

/** Motifs de refus, affichés par la page de connexion (/connexion?google=…). */
export const GOOGLE_REFUSALS = {
  indisponible: "La connexion avec Google n'est pas encore disponible. Connectez-vous avec votre e-mail ou votre numéro et votre mot de passe.",
  annule: "Connexion avec Google annulée.",
  expire: "La connexion avec Google a expiré ou a déjà servi. Recommencez.",
  echec: "Google n'a pas pu confirmer votre identité. Réessayez dans un instant.",
  "email-non-verifie": "Votre adresse e-mail n'est pas vérifiée chez Google. Vérifiez-la dans votre compte Google, ou inscrivez-vous avec un mot de passe.",
  "autre-google": "Ce compte Tribune est déjà relié à un autre compte Google. Connectez-vous avec celui-ci, ou avec votre mot de passe.",
  "sans-telephone": "Aucun numéro de téléphone n'est enregistré sur ce compte. Contactez l'équipe Tribune.",
  sms: "Le SMS n'a pas pu être envoyé, ou trop de codes ont été demandés. Réessayez dans quelques minutes.",
} as const;

export type GoogleRefusal = keyof typeof GOOGLE_REFUSALS;

type LoginRow = {
  id: string;
  browser_hash: string;
  code_verifier: string;
  nonce: string;
  return_to: string | null;
  expires_at: string;
  claimed_at: string | null;
  outcome: "login" | "link" | "signup" | "refused" | null;
  refusal: string | null;
  subject: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  signup_started_at: string | null;
};

type GoogleProfile = { subject: string; email: string | null; emailVerified: boolean; firstName: string | null; lastName: string | null };

export function googleEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Connexion Google non configurée : GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET.");
  return { clientId, clientSecret, redirectUri: `${env.siteUrl}/auth/google/callback` };
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");
const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const refusedPath = (refusal: GoogleRefusal) => `/connexion?google=${refusal}`;

/** Comparaison à durée constante de deux valeurs secrètes. */
function same(a: string, b: string): boolean {
  return timingSafeEqual(Buffer.from(sha256(a), "hex"), Buffer.from(sha256(b), "hex"));
}

/**
 * Empreinte de la clé aléatoire propre à ce navigateur (cookie httpOnly). Elle
 * lie la connexion Google au navigateur qui l'a commencée : un lien de retour
 * intercepté, ou envoyé à quelqu'un d'autre, ne sert à rien ailleurs.
 */
async function browserHash(create: boolean): Promise<string | null> {
  const store = await cookies();
  let key = store.get(COOKIE)?.value;
  if (!key || !/^[\w-]{43}$/.test(key)) {
    if (!create) return null;
    key = randomToken();
  }
  if (create) {
    store.set(COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 });
  }
  return sha256(key);
}

/** Prépare une connexion Google et renvoie l'adresse de la page de Google. */
export async function googleAuthorizationUrl(returnTo: string): Promise<string> {
  const { clientId, redirectUri } = config();
  const browser = await browserHash(true);
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken();
  const admin = createAdminClient();
  // Ménage : connexions abandonnées depuis plus d'un jour.
  await admin.from("oauth_logins").delete().lt("expires_at", new Date(Date.now() - 86_400_000).toISOString());
  const { error } = await admin.from("oauth_logins").insert({
    provider: "google",
    state_hash: sha256(state),
    browser_hash: browser,
    code_verifier: verifier,
    nonce,
    return_to: returnTo,
    expires_at: minutesFromNow(LOGIN_TTL_MINUTES),
  });
  if (error) throw new Error(`connexion impossible à enregistrer : ${error.message}`);

  return `${AUTHORIZE_URL}?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    // Choix du compte à chaque fois : utile sur un téléphone ou un ordinateur partagé.
    prompt: "select_account",
  })}`;
}

/** Retour de Google (/auth/google/callback) : renvoie le chemin de l'étape suivante. */
export async function handleGoogleCallback(query: URLSearchParams): Promise<string> {
  const state = query.get("state");
  const browser = await browserHash(false);
  if (!state || !browser) return refusedPath("expire");
  const admin = createAdminClient();
  const { data: login } = await admin.from("oauth_logins").select("*").eq("state_hash", sha256(state)).maybeSingle<LoginRow>();
  if (!login || !same(login.browser_hash, browser)) return refusedPath("expire");

  // Déjà traité (page rechargée, retour arrière, double redirection) : même étape.
  if (login.claimed_at) return nextStep(login.id);
  if (new Date(login.expires_at).getTime() < Date.now()) return refusedPath("expire");
  // Un seul traitement, même si deux retours arrivent en même temps.
  const { data: claimed } = await admin
    .from("oauth_logins")
    .update({ claimed_at: new Date().toISOString() })
    .eq("id", login.id)
    .is("claimed_at", null)
    .select("id");
  if (!claimed?.length) return nextStep(login.id);

  const code = query.get("code");
  if (!code) return refuse(login.id, query.get("error") === "access_denied" ? "annule" : "echec");
  let google: GoogleProfile;
  try {
    google = await fetchGoogleProfile(code, login);
  } catch (err) {
    console.error("Connexion Google refusée :", (err as Error).message);
    return refuse(login.id, "echec");
  }
  return route(login, google);
}

/** Choisit l'étape suivante d'après le compte Google. */
async function route(login: LoginRow, google: GoogleProfile): Promise<string> {
  const admin = createAdminClient();
  const found = { subject: google.subject, email: google.email, first_name: google.firstName, last_name: google.lastName };

  // 1. Compte Google déjà relié : reconnu par son identifiant Google, jamais par son adresse.
  const { data: identity } = await admin
    .from("oauth_identities")
    .select("user_id")
    .eq("provider", "google")
    .eq("subject", google.subject)
    .maybeSingle<{ user_id: string }>();
  const linked = identity ? await account("id", identity.user_id) : null;
  if (linked && !(await releaseAbandonedSignup(linked))) return sendCode(login, { ...found, user_id: linked.id }, linked, "login");

  // 2. Une adresse que Google n'a pas vérifiée ne prouve rien : on ne s'en sert pas.
  if (!google.email || !google.emailVerified) return refuse(login.id, "email-non-verifie", found);

  // 3. Même adresse qu'un compte Tribune : relié seulement après le code SMS envoyé au numéro de ce compte.
  const match = await account("email", google.email);
  if (match && !(await releaseAbandonedSignup(match))) {
    const { data: other } = await admin.from("oauth_identities").select("subject").eq("provider", "google").eq("user_id", match.id).maybeSingle();
    if (other) return refuse(login.id, "autre-google", found);
    return sendCode(login, { ...found, user_id: match.id }, match, "link");
  }

  // 4. Nouveau supporter : formulaire d'inscription, puis code SMS.
  await admin
    .from("oauth_logins")
    .update({ ...found, outcome: "signup", expires_at: minutesFromNow(SIGNUP_TTL_MINUTES) })
    .eq("id", login.id);
  return "/inscription/google";
}

async function account(column: "id" | "email", value: string): Promise<AccountRow | null> {
  const { data } = await createAdminClient().from("profiles").select(ACCOUNT_COLUMNS).eq(column, value).maybeSingle<AccountRow>();
  return data;
}

async function sendCode(login: LoginRow, fields: Partial<LoginRow>, to: AccountRow, purpose: "login" | "link"): Promise<string> {
  if (!to.phone) return refuse(login.id, "sans-telephone", fields);
  try {
    await startChallenge({ userId: to.id, phone: to.phone, purpose, returnTo: safeReturnPath(login.return_to, "/"), oauthLoginId: login.id });
  } catch (err) {
    if (!(err instanceof VerificationError)) console.error("Code SMS impossible après Google :", (err as Error).message);
    return refuse(login.id, "sms", fields);
  }
  // Noté après l'envoi : un retour reçu en double attend ce moment pour retrouver le code.
  await createAdminClient().from("oauth_logins").update({ ...fields, outcome: purpose }).eq("id", login.id);
  return "/verification";
}

async function refuse(id: string, refusal: GoogleRefusal, fields: Partial<LoginRow> = {}): Promise<string> {
  await createAdminClient().from("oauth_logins").update({ ...fields, outcome: "refused", refusal }).eq("id", id);
  return refusedPath(refusal);
}

/** Relit la connexion jusqu'à ce que `done` soit vrai (traitement concurrent en cours), 5 secondes au plus. */
async function waitFor(id: string, done: (row: LoginRow) => boolean): Promise<LoginRow | null> {
  const admin = createAdminClient();
  for (let i = 0; i < 10; i++) {
    const { data } = await admin.from("oauth_logins").select("*").eq("id", id).maybeSingle<LoginRow>();
    if (!data || done(data)) return data;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return null;
}

/** Retour de Google déjà traité : renvoie vers l'étape à laquelle il a mené. */
async function nextStep(id: string): Promise<string> {
  const login = await waitFor(id, (row) => row.outcome !== null);
  if (!login?.outcome) return refusedPath("expire");
  if (login.outcome === "refused") return refusedPath(login.refusal && login.refusal in GOOGLE_REFUSALS ? (login.refusal as GoogleRefusal) : "echec");
  // Le code a déjà été saisi : la personne est connectée.
  const viewer = await getViewer();
  if (viewer && login.user_id === viewer.profile.id) return safeReturnPath(login.return_to, "/");
  if (login.outcome === "signup" && !login.signup_started_at) return "/inscription/google";
  return (await resumeChallenge(id)) ? "/verification" : refusedPath("expire");
}

// ---------------------------------------------------------------------
// Inscription avec Google
// ---------------------------------------------------------------------

export type GoogleSignup = {
  id: string;
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
  returnTo: string;
  /** Le formulaire a déjà été envoyé. */
  started: boolean;
};

/** Inscription avec Google en attente dans ce navigateur (après le retour de Google), ou null. */
export async function pendingGoogleSignup(): Promise<GoogleSignup | null> {
  const browser = await browserHash(false);
  if (!browser) return null;
  const { data } = await createAdminClient()
    .from("oauth_logins")
    .select("*")
    .eq("browser_hash", browser)
    .eq("outcome", "signup")
    .gt("expires_at", new Date().toISOString())
    .order("claimed_at", { ascending: false })
    .limit(1)
    .maybeSingle<LoginRow>();
  if (!data?.subject || !data.email) return null;
  return {
    id: data.id,
    subject: data.subject,
    email: data.email,
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    returnTo: safeReturnPath(data.return_to, "/"),
    started: Boolean(data.signup_started_at),
  };
}

/** Réserve l'inscription : un seul compte est créé, même si le formulaire part deux fois. */
export async function claimGoogleSignup(id: string): Promise<boolean> {
  const { data } = await createAdminClient()
    .from("oauth_logins")
    .update({ signup_started_at: new Date().toISOString() })
    .eq("id", id)
    .is("signup_started_at", null)
    .select("id");
  return Boolean(data?.length);
}

/** Libère l'inscription après un échec, pour que la personne puisse corriger et renvoyer. */
export async function releaseGoogleSignup(id: string) {
  await createAdminClient().from("oauth_logins").update({ signup_started_at: null }).eq("id", id).is("user_id", null);
}

export async function recordGoogleSignup(id: string, userId: string) {
  await createAdminClient().from("oauth_logins").update({ user_id: userId }).eq("id", id);
}

/**
 * Formulaire renvoyé alors que le premier envoi a créé le compte : remet le code
 * SMS de ce compte dans le navigateur. Renvoie false s'il n'y a rien à reprendre.
 */
export async function resumeGoogleSignup(id: string): Promise<boolean> {
  const login = await waitFor(id, (row) => row.user_id !== null || row.signup_started_at === null);
  return Boolean(login?.user_id) && (await resumeChallenge(id));
}

// ---------------------------------------------------------------------
// Protocole OpenID Connect
// ---------------------------------------------------------------------

type IdTokenClaims = {
  iss?: string;
  aud?: string | string[];
  azp?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean | string;
  given_name?: string;
  family_name?: string;
};

type GoogleKey = JsonWebKey & { kid?: string };

let keyCache: { keys: GoogleKey[]; expiresAt: number } | null = null;

async function googleKeys(refresh: boolean): Promise<GoogleKey[]> {
  if (!refresh && keyCache && keyCache.expiresAt > Date.now()) return keyCache.keys;
  const res = await fetch(KEYS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`clés de Google indisponibles (${res.status})`);
  const { keys } = (await res.json()) as { keys: GoogleKey[] };
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  keyCache = { keys, expiresAt: Date.now() + Math.min(maxAge, 86_400) * 1000 };
  return keys;
}

const decode = <T>(part: string): T => JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;

/** Vérifie la signature (clés publiques de Google) et le contenu du jeton d'identité. */
async function verifyIdToken(token: string, clientId: string): Promise<IdTokenClaims & { sub: string }> {
  const [header64, payload64, signature64, ...rest] = token.split(".");
  if (!header64 || !payload64 || !signature64 || rest.length) throw new Error("jeton mal formé");
  const header = decode<{ alg?: string; kid?: string }>(header64);
  if (header.alg !== "RS256" || !header.kid) throw new Error(`algorithme inattendu (${header.alg})`);
  const find = (keys: GoogleKey[]) => keys.find((k) => k.kid === header.kid && k.kty === "RSA");
  // Google renouvelle ses clés : une clé inconnue fait recharger la liste une fois.
  const jwk = find(await googleKeys(false)) ?? find(await googleKeys(true));
  if (!jwk) throw new Error("clé de signature inconnue");
  const signed = Buffer.from(`${header64}.${payload64}`);
  if (!verify("RSA-SHA256", signed, createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(signature64, "base64url"))) {
    throw new Error("signature invalide");
  }

  const claims = decode<IdTokenClaims>(payload64);
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!ISSUERS.includes(claims.iss ?? "")) throw new Error(`émetteur inattendu (${claims.iss})`);
  if (!audiences.includes(clientId) || (claims.azp && claims.azp !== clientId)) throw new Error("jeton destiné à une autre application");
  if (typeof claims.exp !== "number" || claims.exp < now - 60) throw new Error("jeton expiré");
  if (typeof claims.iat === "number" && claims.iat > now + 300) throw new Error("jeton daté du futur");
  if (typeof claims.sub !== "string" || !claims.sub) throw new Error("identifiant Google manquant");
  return { ...claims, sub: claims.sub };
}

const cleanName = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : null);

/** Échange le code contre le jeton d'identité (avec le secret PKCE) et en tire le profil Google. */
async function fetchGoogleProfile(code: string, login: LoginRow): Promise<GoogleProfile> {
  const { clientId, clientSecret, redirectUri } = config();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: login.code_verifier,
    }),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as { id_token?: string; error?: string } | null;
  if (!res.ok || !body?.id_token) throw new Error(`échange du code refusé (${res.status}${body?.error ? `, ${body.error}` : ""})`);

  const claims = await verifyIdToken(body.id_token, clientId);
  // Le nonce prouve que ce jeton a été émis pour cette connexion-ci, pas rejoué d'une autre.
  if (typeof claims.nonce !== "string" || !same(claims.nonce, login.nonce)) throw new Error("nonce différent");
  return {
    subject: claims.sub,
    email: typeof claims.email === "string" ? claims.email.trim().toLowerCase() : null,
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    firstName: cleanName(claims.given_name),
    lastName: cleanName(claims.family_name),
  };
}
