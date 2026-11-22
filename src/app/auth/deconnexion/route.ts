import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Déconnexion par un vrai formulaire (POST) et une redirection complète : le
// navigateur charge une nouvelle page et oublie celles du compte précédent. Avec
// une navigation interne, le bouton « retour » pouvait réafficher des pages vues
// avec l'autre compte (par exemple celles d'un club, après connexion en administrateur).
export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  // Seul un formulaire de ce site peut déconnecter (pas un autre site qui posterait ici).
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== url.origin) || (site && site !== "same-origin" && site !== "none")) {
    return new NextResponse("Requête refusée.", { status: 403 });
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  const response = NextResponse.redirect(new URL("/", url.origin), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
