import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, safeReturnPath } from "@/lib/auth";
import { GOOGLE_REFUSALS, type GoogleRefusal } from "@/lib/google";
import { GoogleButton } from "@/components/GoogleButton";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage(props: PageProps<"/connexion">) {
  const { suite, erreur, google } = await props.searchParams;
  const returnTo = safeReturnPath(suite, "/");
  if (await getViewer()) redirect(returnTo);
  // Seuls les motifs connus sont affichés : un lien forgé ne peut pas faire écrire n'importe quoi.
  const googleError = typeof google === "string" && google in GOOGLE_REFUSALS ? GOOGLE_REFUSALS[google as GoogleRefusal] : null;

  return (
    <div className="wrap page" style={{ maxWidth: 980 }}>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", marginBottom: 20 }}>Connexion</h1>
      {erreur ? <p className="flash error">Le lien a expiré ou a déjà servi. Connectez-vous : un code vous sera envoyé par SMS.</p> : null}
      {googleError ? (
        <p className="flash error" role="alert">
          {googleError}
        </p>
      ) : null}
      <div className="split half">
        <div className="panel" style={{ display: "grid", gap: 18, alignContent: "start" }}>
          <GoogleButton returnTo={returnTo} />
          <div className="or-sep">ou avec votre mot de passe</div>
          <LoginForm returnTo={returnTo} />
          <p className="small muted">
            Avec Google comme avec le mot de passe, un code est ensuite envoyé par SMS au numéro de votre compte.
          </p>
        </div>
        <div className="panel" style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div className="eyebrow">Nouveau supporter</div>
          <h2 style={{ fontSize: "1.8rem" }}>Pas encore de compte ?</h2>
          <p className="muted">
            Créez votre compte en une minute pour contribuer, recevoir vos reçus et suivre les campagnes que vous
            soutenez.
          </p>
          <Link className="btn btn-primary" href={`/inscription?suite=${encodeURIComponent(returnTo)}`} style={{ justifySelf: "start" }}>
            Créer mon compte supporter
          </Link>
        </div>
      </div>
    </div>
  );
}
