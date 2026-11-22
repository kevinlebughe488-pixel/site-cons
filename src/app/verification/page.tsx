import type { Metadata } from "next";
import Link from "next/link";
import { pendingChallenge, sessionOpeningPending } from "@/lib/verification";
import { cancelVerification, resendCode } from "@/lib/actions/auth";
import { ActionForm, SessionRedirect, SubmitButton } from "@/components/forms";
import { CodeForm } from "./CodeForm";

export const metadata: Metadata = { title: "Code de vérification" };

const TITLES = {
  signup: "Confirmez votre numéro",
  login: "Connexion par code",
  reset: "Mot de passe oublié",
};

const INTROS = {
  signup: "Dernière étape de l'inscription : saisissez le code envoyé par SMS pour confirmer que ce numéro est bien le vôtre.",
  login: "Mot de passe incorrect ? Saisissez le code envoyé par SMS pour vous connecter. Vous pourrez ensuite changer votre mot de passe dans « Mon compte ».",
  reset: "Saisissez le code envoyé par SMS : vous pourrez ensuite choisir un nouveau mot de passe.",
};

export default async function VerificationPage() {
  const challenge = await pendingChallenge();

  // Code accepté : la page est redessinée sans défi en cours, il reste à ouvrir la session.
  if (!challenge && (await sessionOpeningPending())) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <div className="panel">
          <SessionRedirect to="/auth/ouvrir" />
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="wrap page" style={{ maxWidth: 560 }}>
        <div className="panel empty">
          <h1 style={{ fontSize: "2rem" }}>Aucune vérification en cours</h1>
          <p className="muted" style={{ margin: "10px 0 18px" }}>
            Le code a expiré ou a déjà servi. Connectez-vous pour en recevoir un nouveau.
          </p>
          <Link className="btn btn-primary" href="/connexion">
            Me connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.6rem)", marginBottom: 10 }}>{TITLES[challenge.purpose]}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {INTROS[challenge.purpose]} Le code a été envoyé au <b className="num">{challenge.maskedPhone}</b> et reste valable 10 minutes.
      </p>
      {challenge.demoCode ? (
        <p className="flash info" role="note">
          <b>Mode démonstration :</b> aucun SMS n&apos;est envoyé. Votre code est <b className="num">{challenge.demoCode}</b>.
        </p>
      ) : null}
      {challenge.expired ? <p className="flash error">Ce code a expiré. Demandez-en un nouveau ci-dessous.</p> : null}
      <div className="panel" style={{ display: "grid", gap: 18 }}>
        <CodeForm />
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "grid", gap: 10 }}>
          <span className="small muted">Pas reçu de SMS ? Attendez une minute, puis :</span>
          <ActionForm action={resendCode} className="inline-form">
            <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Envoi…">
              Renvoyer un code
            </SubmitButton>
          </ActionForm>
          <form action={cancelVerification}>
            <button className="link-btn small" type="submit">
              Annuler et revenir à la connexion
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
