import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer, safeReturnPath } from "@/lib/auth";
import { googleEnabled } from "@/lib/google";
import { FieldSvg } from "@/components/visuals";
import { GoogleButton } from "@/components/GoogleButton";
import { RegisterForm } from "./RegisterForm";
import { formatMoney, KYC_THRESHOLD } from "@/lib/format";

export const metadata: Metadata = { title: "Inscription" };

export default async function RegisterPage(props: PageProps<"/inscription">) {
  const { suite } = await props.searchParams;
  const returnTo = safeReturnPath(suite, "/");
  if (await getViewer()) redirect(returnTo);

  const supabase = await createClient();
  const { data: clubs } = await supabase.from("clubs").select("id, name").eq("status", "verified").order("name");

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Inscription
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>Devenir supporter inscrit</h1>
          <p>
            Votre compte relie chacune de vos contributions à votre nom. C&apos;est la garantie que l&apos;argent peut être
            retracé, du paiement jusqu&apos;au club.
          </p>
        </div>
      </div>
      <div className="wrap page">
        <div className="split">
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            {googleEnabled() ? (
              <div className="panel" style={{ display: "grid", gap: 14 }}>
                <GoogleButton returnTo={returnTo}>S&apos;inscrire avec Google</GoogleButton>
                <p className="small muted">
                  Pas de mot de passe à retenir : Google confirme votre adresse, vous ajoutez votre numéro de téléphone.
                </p>
                <div className="or-sep">ou avec une adresse e-mail et un mot de passe</div>
              </div>
            ) : null}
            <RegisterForm clubs={clubs ?? []} returnTo={returnTo} />
          </div>
          <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div className="panel">
              <h3>Ce que nous enregistrons</h3>
              <div className="rules">
                <div>
                  <span className="ck">✓</span>
                  <span>Votre identité et votre numéro Mobile Money</span>
                </div>
                <div>
                  <span className="ck">✓</span>
                  <span>La date de votre consentement</span>
                </div>
                <div>
                  <span className="ck">✓</span>
                  <span>Chaque contribution : date, campagne, montant, commission, référence de l&apos;opérateur</span>
                </div>
                <div>
                  <span className="ck">✓</span>
                  <span>Au-delà de {formatMoney(KYC_THRESHOLD)} cumulés : le type de pièce d&apos;identité</span>
                </div>
              </div>
            </div>
            <div className="panel">
              <h3>Déjà inscrit ?</h3>
              <Link className="btn btn-ghost btn-sm" href={`/connexion?suite=${encodeURIComponent(returnTo)}`}>
                Me connecter
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
