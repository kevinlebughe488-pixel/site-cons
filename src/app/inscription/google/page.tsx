import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { pendingGoogleSignup } from "@/lib/google";
import { FieldSvg } from "@/components/visuals";
import { RegisterForm } from "../RegisterForm";

export const metadata: Metadata = { title: "Inscription avec Google" };

export default async function GoogleRegisterPage() {
  const signup = await pendingGoogleSignup();
  if (await getViewer()) redirect(signup?.returnTo ?? "/");
  if (!signup) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <div className="panel empty">
          <h1 style={{ fontSize: "2rem" }}>Aucune inscription Google en cours</h1>
          <p className="muted" style={{ margin: "10px 0 18px" }}>
            La connexion avec Google a expiré (30 minutes) ou a déjà servi. Recommencez depuis la page de connexion.
          </p>
          <Link className="btn btn-primary" href="/connexion">
            Me connecter
          </Link>
        </div>
      </div>
    );
  }
  // Formulaire déjà envoyé : la suite est le code SMS.
  if (signup.started) redirect("/verification");

  const supabase = await createClient();
  const { data: clubs } = await supabase.from("clubs").select("id, name").eq("status", "verified").order("name");

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Inscription avec Google
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>Plus qu&apos;une étape</h1>
          <p>
            Google a confirmé votre adresse <b>{signup.email}</b>. Ajoutez votre numéro de téléphone : il sert à payer, à
            être remboursé et à recevoir le code de connexion par SMS.
          </p>
        </div>
      </div>
      <div className="wrap page">
        <div className="split">
          <RegisterForm
            clubs={clubs ?? []}
            returnTo={signup.returnTo}
            google={{ email: signup.email, firstName: signup.firstName, lastName: signup.lastName }}
          />
          <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div className="panel">
              <h3>Votre connexion reste protégée</h3>
              <div className="rules">
                <div>
                  <span className="ck">✓</span>
                  <span>Google confirme votre adresse ; Tribune ne voit jamais votre mot de passe Google</span>
                </div>
                <div>
                  <span className="ck">✓</span>
                  <span>À chaque connexion, un code est aussi envoyé par SMS à votre numéro</span>
                </div>
                <div>
                  <span className="ck">✓</span>
                  <span>Vous pouvez délier Google à tout moment depuis « Mon compte »</span>
                </div>
              </div>
            </div>
            <div className="panel">
              <h3>Ce n&apos;est pas le bon compte Google ?</h3>
              <Link className="btn btn-ghost btn-sm" href="/connexion">
                Revenir à la connexion
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
