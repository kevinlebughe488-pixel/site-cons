import type { Metadata } from "next";
import { requestPasswordReset } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="wrap page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.6rem)", marginBottom: 10 }}>Mot de passe oublié</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Nous envoyons un code par SMS au numéro de votre compte. Il vous permettra de choisir un nouveau mot de passe.
      </p>
      <ActionForm action={requestPasswordReset} className="panel form">
        <div className="field">
          <label htmlFor="login">E-mail ou numéro de téléphone du compte</label>
          <input type="text" id="login" name="login" autoComplete="username" placeholder="vous@exemple.com ou 081 234 5678" required />
        </div>
        <SubmitButton pendingLabel="Envoi…">Recevoir un code par SMS</SubmitButton>
      </ActionForm>
    </div>
  );
}
