"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { COOKIE_CONSENT, REFERRAL_COOKIE, REFERRAL_MAX_AGE, REFERRAL_PATTERN } from "@/lib/referral";

const noop = () => () => {};
const readConsent = () => document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_CONSENT}=`))?.split("=")[1] ?? "";

function setCookie(name: string, value: string, maxAge: number) {
  document.cookie = `${name}=${value}; Max-Age=${maxAge}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}

/**
 * Bandeau cookies. Les cookies nécessaires (connexion, code SMS) ne demandent pas d'accord ;
 * le cookie « ambassadeur », qui attribue une contribution à la personne qui a partagé le lien,
 * n'est déposé qu'après « Accepter ».
 */
export function CookieBanner() {
  // Côté serveur, on ne connaît pas le choix : rien n'est affiché avant le navigateur.
  const stored = useSyncExternalStore(noop, readConsent, () => "inconnu");
  const [done, setDone] = useState(false);
  if (done || stored !== "") return null;

  function decide(accept: boolean) {
    setCookie(COOKIE_CONSENT, accept ? "oui" : "non", 365 * 86400);
    const ref = new URLSearchParams(location.search).get("ref")?.toLowerCase();
    if (accept && ref && REFERRAL_PATTERN.test(ref)) setCookie(REFERRAL_COOKIE, ref, REFERRAL_MAX_AGE);
    setDone(true);
  }

  return (
    <div className="cookie-banner" role="region" aria-label="Cookies">
      <p className="small">
        Tribune utilise des cookies nécessaires (connexion, sécurité). Avec votre accord, un cookie « ambassadeur »
        attribue votre contribution à la personne qui vous a envoyé le lien. Ni publicité, ni mesure d&apos;audience.{" "}
        <Link href="/confidentialite#cookies">En savoir plus</Link>
      </p>
      <div className="acts">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => decide(false)}>
          Refuser
        </button>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => decide(true)}>
          Accepter
        </button>
      </div>
    </div>
  );
}

/** Permet de revenir sur son choix : le bandeau réapparaît. */
export function ResetCookieChoice() {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => {
        setCookie(COOKIE_CONSENT, "", 0);
        setCookie(REFERRAL_COOKIE, "", 0);
        location.reload();
      }}
    >
      Changer mon choix sur les cookies
    </button>
  );
}
