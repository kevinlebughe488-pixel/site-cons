import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer, safeReturnPath } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage(props: PageProps<"/connexion">) {
  const { suite, erreur } = await props.searchParams;
  const returnTo = safeReturnPath(suite, "/");
  if (await getViewer()) redirect(returnTo);

  return (
    <div className="wrap page" style={{ maxWidth: 980 }}>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", marginBottom: 20 }}>Connexion</h1>
      {erreur ? <p className="flash error">Le lien a expiré ou a déjà servi. Connectez-vous avec votre mot de passe.</p> : null}
      <div className="split half">
        <LoginForm returnTo={returnTo} />
        <div className="panel" style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div className="eyebrow">Nouveau sur Tribune</div>
          <h2 style={{ fontSize: "1.8rem" }}>Pas encore de compte ?</h2>
          <p className="muted">
            Créez votre compte en une minute pour contribuer, recevoir vos reçus et suivre les campagnes que vous
            soutenez.
          </p>
          <Link
            className="btn btn-primary"
            href={`/inscription?profil=supporter${returnTo !== "/" ? `&suite=${encodeURIComponent(returnTo)}` : ""}`}
            style={{ justifySelf: "start" }}
          >
            Créer mon compte supporter
          </Link>
          <p className="small muted">
            Vous représentez un club ? <Link href="/inscription?profil=club">Inscrire mon club</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
