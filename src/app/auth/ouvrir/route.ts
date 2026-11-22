import { NextResponse, type NextRequest } from "next/server";
import { safeReturnPath } from "@/lib/auth";
import { completeSessionOpening } from "@/lib/verification";

// Fin de la connexion : la session préparée après un bon mot de passe ou un bon
// code SMS (cookie de 2 minutes) est ouverte ici, puis le navigateur charge la
// page d'arrivée. Un chargement complet plutôt qu'une navigation interne : les
// pages affichées avant, avec un autre compte ou sans compte, ne reviennent pas
// avec le bouton « retour ».
export async function GET(request: NextRequest) {
  const to = await completeSessionOpening();
  const response = NextResponse.redirect(new URL(to ? safeReturnPath(to, "/") : "/connexion?erreur=lien", request.nextUrl.origin), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
