import { NextResponse, type NextRequest } from "next/server";
import { handleGoogleCallback } from "@/lib/google";

// Retour de Google après « Continuer avec Google » (adresse déclarée chez Google :
// <SITE_URL>/auth/google/callback). Peut être rechargé sans effet de bord.
export async function GET(request: NextRequest) {
  const next = await handleGoogleCallback(request.nextUrl.searchParams);
  return NextResponse.redirect(new URL(next, request.nextUrl.origin), 303);
}
