import type { Metadata } from "next";
import { requireViewer } from "@/lib/auth";
import { updatePassword } from "@/lib/actions/auth";
import { ActionForm, SubmitButton } from "@/components/forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function NewPasswordPage() {
  await requireViewer("/compte/mot-de-passe");
  return (
    <div className="wrap page" style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.6rem)", marginBottom: 16 }}>Choisir un nouveau mot de passe</h1>
      <ActionForm action={updatePassword} className="panel form">
        <div className="field">
          <label htmlFor="password">Nouveau mot de passe</label>
          <input type="password" id="password" name="password" autoComplete="new-password" minLength={10} required />
          <div className="hint">Au moins 10 caractères.</div>
        </div>
        <SubmitButton>Enregistrer</SubmitButton>
      </ActionForm>
    </div>
  );
}
