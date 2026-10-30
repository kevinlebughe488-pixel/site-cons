import type { Metadata } from "next";
import Link from "next/link";
import { pendingChallenge } from "@/lib/verification";
import { cancelVerification, resendCode } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";
import { CodeForm } from "./CodeForm";

export const metadata: Metadata = { title: "Code de vérification" };

const TITLES = {
  signup: "Confirmez votre numéro",
  login: "Vérification en deux étapes",
  reset: "Mot de passe oublié",
  link: "Relier votre compte Google",
};

const INTROS = {
  signup: "Dernière étape de l'inscription : saisissez le code envoyé par SMS pour confirmer que ce numéro est bien le vôtre.",
  login: "Votre mot de passe est correct. Pour finir la connexion, saisissez le code envoyé par SMS.",
  reset: "Saisissez le code envoyé par SMS : vous pourrez ensuite choisir un nouveau mot de passe.",
  link: "Un compte Tribune existe déjà avec la même adresse e-mail que votre compte Google. Pour les relier, saisissez le code envoyé par SMS au numéro de ce compte : vous pourrez ensuite vous connecter avec Google.",
};

const GOOGLE_LOGIN_INTRO = "Google a confirmé votre identité. Pour finir la connexion, saisissez le code envoyé par SMS.";

export default async function VerificationPage() {
  const challenge = await pendingChallenge();

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
        {challenge.purpose === "login" && challenge.viaGoogle ? GOOGLE_LOGIN_INTRO : INTROS[challenge.purpose]} Le code a été envoyé au <b className="num">{challenge.maskedPhone}</b> et reste valable 10 minutes.
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
