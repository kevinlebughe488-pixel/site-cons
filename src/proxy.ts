import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE, REFERRAL_MAX_AGE, REFERRAL_PATTERN } from "@/lib/referral";

// Rafraîchit la session Supabase (cookies) à chaque navigation.
// Les contrôles d'accès eux-mêmes sont faits dans les pages et dans la base.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Lien d'ambassadeur (?ref=CODE) : le code est gardé 30 jours, la contribution suivante lui est attribuée.
  const ref = request.nextUrl.searchParams.get("ref")?.toLowerCase();
  const keepReferral = (res: NextResponse) => {
    if (ref && REFERRAL_PATTERN.test(ref)) {
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
  // Les préchargements de liens (prefetch) n'ont pas besoin de rafraîchir la session :
  // on évite ainsi des dizaines d'appels à Supabase par page affichée.
  const prefetch = request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch";
  if (!url || !key || prefetch) return keepReferral(response);

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
    // getClaims vérifie le jeton localement (clés publiques mises en cache) et ne
    // contacte Supabase que pour renouveler une session expirée, contrairement à
    // getUser qui fait un aller-retour réseau à chaque requête.
    await supabase.auth.getClaims();
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
