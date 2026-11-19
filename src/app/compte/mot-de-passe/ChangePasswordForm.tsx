"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { changePassword } from "@/lib/actions/auth";
import { Flash, SubmitButton } from "@/components/forms";
import { NewPasswordFields, PasswordInput } from "@/components/PasswordFields";

/**
 * Modifier son mot de passe depuis « Mon compte ». Une fois la modification faite,
 * le formulaire laisse la place à un écran de confirmation.
 */
export function ChangePasswordForm() {
  const [state, action] = useActionState(changePassword, {});
  const [current, setCurrent] = useState("");

  if (state.success) {
    return (
      <div className="panel done-screen" role="status">
        <div className="done-icon" aria-hidden="true">✓</div>
        <h2>Mot de passe modifié</h2>
        <p className="muted">
          Utilisez-le dès votre prochaine connexion. {state.success} Vos autres appareils ont été déconnectés.
        </p>
        <Link className="btn btn-primary" href="/compte">
          Retour à mon compte
        </Link>
      </div>
    );
  }

  return (
    <form className="panel form" action={action} noValidate>
      <Flash state={state.field ? {} : state} />
      <PasswordInput id="current_password" label="Mot de passe actuel" autoComplete="current-password" state={state} value={current} onChange={setCurrent} />
      <hr className="sep" />
      <NewPasswordFields state={state} current={current} />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <SubmitButton pendingLabel="Vérification…">Modifier le mot de passe</SubmitButton>
        <Link className="btn btn-ghost" href="/compte">
          Annuler
        </Link>
      </div>
      <p className="small muted">
        Mot de passe actuel oublié ? <Link href="/mot-de-passe-oublie">Recevoir un code par SMS</Link>
      </p>
    </form>
  );
}
