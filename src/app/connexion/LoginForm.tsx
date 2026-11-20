"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { FieldError, Flash, SubmitButton } from "@/components/forms";
import { PasswordInput } from "@/components/PasswordFields";

/** Après un mot de passe incorrect : ce qui a été envoyé à l'identifiant saisi. */
function LoginHelp({ help, target }: { help?: string; target?: string }) {
  if (help === "sms") {
    return (
      <p className="flash info" role="status">
        Nous avons envoyé un code de connexion par SMS au <b className="num">{target}</b>.{" "}
        <Link href="/verification">Saisir le code</Link> pour vous connecter, ou réessayez votre mot de passe.
      </p>
    );
  }
  if (help === "email") {
    return (
      <p className="flash info" role="status">
        Nous avons envoyé un lien de connexion à <b>{target}</b>. Ouvrez-le dans ce navigateur pour vous connecter, ou réessayez votre
        mot de passe.
      </p>
    );
  }
  if (help === "limit") {
    return (
      <p className="flash info" role="status">
        Pour votre sécurité, aucun nouveau message de connexion n&apos;est envoyé pour l&apos;instant (demandes trop rapprochées).
        Réessayez dans quelques minutes, ou utilisez <Link href="/mot-de-passe-oublie">Mot de passe oublié</Link>.
      </p>
    );
  }
  if (help === "failed") {
    return (
      <p className="flash info" role="status">
        Le message de connexion n&apos;a pas pu être envoyé pour le moment. Réessayez, ou utilisez{" "}
        <Link href="/mot-de-passe-oublie">Mot de passe oublié</Link>.
      </p>
    );
  }
  return null;
}

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action] = useActionState(signIn, {});
  return (
    <form className="panel form" action={action} noValidate>
      <Flash state={state.field ? {} : state} />
      <LoginHelp help={state.fields?.help} target={state.fields?.target} />
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
          aria-describedby={state.field === "login" ? "login-error" : undefined}
          required
        />
        <FieldError state={state} name="login" />
      </div>
      <PasswordInput id="password" label="Mot de passe" autoComplete="current-password" state={state} />
      <div className="hint" style={{ marginTop: -8 }}>
        <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
      </div>
      <SubmitButton pendingLabel="Connexion…">Me connecter</SubmitButton>
    </form>
  );
}
