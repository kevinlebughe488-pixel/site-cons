import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/auth";

// Arrivée depuis un lien envoyé par e-mail (confirmation d'adresse, nouveau mot de passe).
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeReturnPath(url.searchParams.get("suite"), "/compte");
  const supabase = await createClient();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("lien incomplet") };

  return NextResponse.redirect(new URL(error ? "/connexion?erreur=lien" : next, url.origin));
}
