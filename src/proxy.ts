import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_CONSENT, REFERRAL_COOKIE, REFERRAL_MAX_AGE, REFERRAL_PATTERN } from "@/lib/referral";

// Rafraîchit la session Supabase (cookies) à chaque requête, préchargements compris :
// c'est ce qui garde la personne connectée quand elle revient sur le site, même
// des semaines plus tard (les cookies de session durent 400 jours).
// Les contrôles d'accès eux-mêmes sont faits dans les pages et dans la base.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Lien d'ambassadeur (?ref=CODE) : gardé 30 jours, seulement si le visiteur a accepté ce cookie
  // (bandeau cookies). S'il l'a refusé, un éventuel ancien cookie est effacé.
  const ref = request.nextUrl.searchParams.get("ref")?.toLowerCase();
  const consent = request.cookies.get(COOKIE_CONSENT)?.value;
  const keepReferral = (res: NextResponse) => {
    if (consent === "non" && request.cookies.has(REFERRAL_COOKIE)) res.cookies.delete(REFERRAL_COOKIE);
    if (consent === "oui" && ref && REFERRAL_PATTERN.test(ref)) {
      res.cookies.set(REFERRAL_COOKIE, ref, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: REFERRAL_MAX_AGE,
      });
    }
    return res;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const prefetch = request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch";
  if (!url || !key) return keepReferral(response);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  try {
    if (prefetch) {
      // Préchargement de lien : getSession lit le cookie sans appel réseau, et ne
      // contacte Supabase que si le jeton arrive à expiration, pour le renouveler
      // ET l'enregistrer ici. Sans cela, la page préchargée pouvait renouveler le
      // jeton sans pouvoir l'enregistrer : le navigateur gardait un jeton déjà
      // consommé, et la session ne tenait qu'à la tolérance de Supabase.
      await supabase.auth.getSession();
    } else {
      // getClaims vérifie le jeton (et le renouvelle s'il a expiré).
      await supabase.auth.getClaims();
    }
  } catch {
    // Supabase lent ou injoignable : on laisse la page s'afficher plutôt que de
    // renvoyer une erreur 500 ; la page gère elle-même l'absence de session.
  }
  return keepReferral(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|api/pawapay|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
