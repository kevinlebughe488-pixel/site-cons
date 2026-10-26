import type { Metadata } from "next";
import { requestPasswordReset } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="wrap page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.6rem)", marginBottom: 16 }}>Mot de passe oublié</h1>
      <ActionForm action={requestPasswordReset} className="panel form">
        <div className="field">
          <label htmlFor="email">E-mail de votre compte</label>
          <input type="email" id="email" name="email" autoComplete="email" required />
        </div>
        <SubmitButton pendingLabel="Envoi…">Recevoir un lien</SubmitButton>
      </ActionForm>
    </div>
  );
}
