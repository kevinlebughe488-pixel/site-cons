"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { FieldError, Flash, SubmitButton } from "@/components/forms";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action] = useActionState(signIn, {});
  return (
    <form className="form" action={action} noValidate>
      <Flash state={state} />
      <input type="hidden" name="suite" value={returnTo} />
      <div className="field">
        <label htmlFor="login">E-mail ou numéro de téléphone</label>
        <input
          type="text"
          id="login"
          name="login"
          autoComplete="username"
          placeholder="vous@exemple.com ou 081 234 5678"
          defaultValue={state.fields?.login}
          aria-invalid={state.field === "login" || undefined}
          required
        />
        <FieldError state={state} name="login" />
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input type="password" id="password" name="password" autoComplete="current-password" aria-invalid={state.field === "password" || undefined} required />
        <FieldError state={state} name="password" />
        <div className="hint">
          <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        </div>
      </div>
      <SubmitButton pendingLabel="Connexion…">Me connecter</SubmitButton>
    </form>
  );
}
