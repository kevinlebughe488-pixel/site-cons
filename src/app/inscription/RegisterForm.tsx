"use client";

import { useActionState } from "react";
import { completeGoogleSignup, register } from "@/lib/actions/auth";
import { FieldError, Flash, SubmitButton } from "@/components/forms";

/**
 * Formulaire d'inscription. Avec `google`, l'adresse vient de Google (déjà
 * vérifiée) et il n'y a pas de mot de passe.
 */
export function RegisterForm({
  clubs,
  returnTo,
  google,
}: {
  clubs: { id: string; name: string }[];
  returnTo: string;
  google?: { email: string; firstName: string; lastName: string };
}) {
  const [state, action] = useActionState(google ? completeGoogleSignup : register, {});
  const f = state.fields ?? {};
  const invalid = (name: string) => (state.field === name ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});
  if (state.success) {
    return (
      <div className="panel">
        <Flash state={state} />
      </div>
    );
  }
  return (
    <form className="panel form" action={action} noValidate>
      <Flash state={state} />
      <input type="hidden" name="suite" value={returnTo} />
      <div className="two">
        <div className="field">
          <label htmlFor="first_name">Prénom</label>
          <input type="text" id="first_name" name="first_name" {...invalid("first_name")} autoComplete="given-name" defaultValue={f.first_name ?? google?.firstName} required />
          <FieldError state={state} name="first_name" />
        </div>
        <div className="field">
          <label htmlFor="last_name">Nom</label>
          <input type="text" id="last_name" name="last_name" {...invalid("last_name")} autoComplete="family-name" defaultValue={f.last_name ?? google?.lastName} required />
          <FieldError state={state} name="last_name" />
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="phone">Téléphone (Mobile Money)</label>
          <input type="tel" id="phone" name="phone" {...invalid("phone")} placeholder="+243 81 000 0000" autoComplete="tel" defaultValue={f.phone} required />
          <FieldError state={state} name="phone" />
          <div className="hint">Sert à payer, à recevoir les remboursements et à vous identifier.</div>
        </div>
        {google ? (
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input type="email" id="email" value={google.email} readOnly disabled />
            <div className="hint">Confirmée par Google. Vous vous connecterez avec Google.</div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input type="email" id="email" name="email" {...invalid("email")} autoComplete="email" defaultValue={f.email} required />
            <FieldError state={state} name="email" />
            <div className="hint">Pour vous connecter et recevoir vos reçus.</div>
          </div>
        )}
      </div>
      {google ? null : (
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input type="password" id="password" name="password" {...invalid("password")} autoComplete="new-password" minLength={10} required />
          <FieldError state={state} name="password" />
          <div className="hint">Au moins 10 caractères.</div>
        </div>
      )}
      <div className="two">
        <div className="field">
          <label htmlFor="residence">Vous vivez</label>
          <select id="residence" name="residence" defaultValue={f.residence || "rdc"}>
            <option value="rdc">En RDC</option>
            <option value="diaspora">Hors de RDC (diaspora)</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="location">Ville et pays</label>
          <input type="text" id="location" name="location" {...invalid("location")} placeholder="Kinshasa, RDC" defaultValue={f.location} />
          <FieldError state={state} name="location" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="followed_club_id">Club que vous suivez</label>
        <select id="followed_club_id" name="followed_club_id" defaultValue={f.followed_club_id || ""}>
          <option value="">Aucun en particulier</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <label className="check">
        <input type="checkbox" name="consent" defaultChecked={f.consent === "on"} {...invalid("consent")} />
        <span>
          J&apos;accepte que Tribune conserve mon identité et l&apos;historique de mes contributions pour la traçabilité
          des fonds et les obligations de vigilance. Mes coordonnées ne sont jamais publiées.
        </span>
      </label>
      {state.field === "consent" ? (
        <p className="small" style={{ color: "var(--bad)", fontWeight: 600, marginTop: -6 }}>
          {state.error}
        </p>
      ) : null}
      <label className="check">
        <input type="checkbox" name="newsletter" defaultChecked={state.fields ? f.newsletter === "on" : true} />
        <span>Recevoir les nouvelles des campagnes que je soutiens</span>
      </label>
      <SubmitButton pendingLabel="Création du compte…">Créer mon compte</SubmitButton>
    </form>
  );
}
