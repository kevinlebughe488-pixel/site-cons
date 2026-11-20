"use server";

import { cookies } from "next/headers";
import { COOKIE_CONSENT, REFERRAL_COOKIE, REFERRAL_MAX_AGE, REFERRAL_PATTERN } from "@/lib/referral";

/**
 * Choix du bandeau cookies, enregistré par le serveur (en-tête Set-Cookie) : Safari
 * (iPhone, Mac) efface au bout de 7 jours les cookies écrits par le JavaScript de
 * la page, mais pas ceux posés par le serveur. Le choix est ainsi gardé un an.
 */
export async function saveCookieChoice(accept: boolean, ref: string | null): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";
  // Lisible par le bandeau (pas httpOnly) : il ne contient que « oui » ou « non ».
  store.set(COOKIE_CONSENT, accept ? "oui" : "non", { path: "/", sameSite: "lax", secure, maxAge: 365 * 86400 });
  const code = ref?.toLowerCase() ?? "";
  if (accept && REFERRAL_PATTERN.test(code)) {
    store.set(REFERRAL_COOKIE, code, { path: "/", sameSite: "lax", secure, httpOnly: true, maxAge: REFERRAL_MAX_AGE });
  }
  if (!accept) store.delete(REFERRAL_COOKIE);
}
