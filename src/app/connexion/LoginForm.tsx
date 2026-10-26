"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { Flash, SubmitButton } from "@/components/forms";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action] = useActionState(signIn, {});
  return (
    <form className="panel form" action={action} noValidate>
      <Flash state={state} />
      <input type="hidden" name="suite" value={returnTo} />
      <div className="field">
        <label htmlFor="email">E-mail</label>
        <input type="email" id="email" name="email" autoComplete="email" defaultValue={state.fields?.email} required />
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input type="password" id="password" name="password" autoComplete="current-password" required />
        <div className="hint">
          <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        </div>
      </div>
      <SubmitButton pendingLabel="Connexion…">Me connecter</SubmitButton>
    </form>
  );
}
