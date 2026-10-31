import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rafraîchit la session Supabase (cookies) à chaque navigation.
// Les contrôles d'accès eux-mêmes sont faits dans les pages et dans la base.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Les préchargements de liens (prefetch) n'ont pas besoin de rafraîchir la session :
  // on évite ainsi des dizaines d'appels à Supabase par page affichée.
  const prefetch = request.headers.get("next-router-prefetch") || request.headers.get("purpose") === "prefetch";
  if (!url || !key || prefetch) return response;

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
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|api/pawapay|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
