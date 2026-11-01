"use client";

import { useActionState } from "react";
import { register } from "@/lib/actions/auth";
import { FieldError, Flash, SubmitButton } from "@/components/forms";

type Props = {
  /** « supporter » : compte personnel ; « club » : compte du représentant qui inscrira son club. */
  kind: "supporter" | "club";
  clubs: { id: string; name: string }[];
  returnTo: string;
};

export function RegisterForm({ kind, clubs, returnTo }: Props) {
  const [state, action] = useActionState(register, {});
  const f = state.fields ?? {};
  const invalid = (name: string) => (state.field === name ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});
  const club = kind === "club";
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
      <input type="hidden" name="account_type" value={kind} />
      {club ? (
        <p className="small muted" style={{ margin: 0 }}>
          Ce compte est le vôtre, à votre nom : vous l&apos;utiliserez pour inscrire le club, déposer ses projets et
          suivre les financements.
        </p>
      ) : null}
      <div className="two">
        <div className="field">
          <label htmlFor="first_name">Prénom</label>
          <input type="text" id="first_name" name="first_name" {...invalid("first_name")} autoComplete="given-name" defaultValue={f.first_name} required />
          <FieldError state={state} name="first_name" />
        </div>
        <div className="field">
          <label htmlFor="last_name">Nom</label>
          <input type="text" id="last_name" name="last_name" {...invalid("last_name")} autoComplete="family-name" defaultValue={f.last_name} required />
          <FieldError state={state} name="last_name" />
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="phone">{club ? "Votre téléphone" : "Téléphone (Mobile Money)"}</label>
          <input type="tel" id="phone" name="phone" {...invalid("phone")} placeholder="+243 81 000 0000" autoComplete="tel" defaultValue={f.phone} required />
          <FieldError state={state} name="phone" />
          <div className="hint">{club ? "Reçoit les codes de connexion par SMS." : "Sert à payer, à recevoir les remboursements et à vous identifier."}</div>
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input type="email" id="email" name="email" {...invalid("email")} autoComplete="email" defaultValue={f.email} required />
          <FieldError state={state} name="email" />
          <div className="hint">{club ? "Pour vous connecter et suivre le dossier du club." : "Pour vous connecter et recevoir vos reçus."}</div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input type="password" id="password" name="password" {...invalid("password")} autoComplete="new-password" minLength={10} required />
        <FieldError state={state} name="password" />
        <div className="hint">Au moins 10 caractères.</div>
      </div>
      {club ? null : (
        <>
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
            <div className="hint">Vous serez prévenu quand ce club lance un projet.</div>
          </div>
        </>
      )}
      <label className="check">
        <input type="checkbox" name="consent" defaultChecked={f.consent === "on"} {...invalid("consent")} />
        <span>
          {club
            ? "J'accepte que Tribune conserve mon identité et les informations du club que je représente pour vérifier le club, tracer les fonds et respecter les obligations de vigilance. Mes coordonnées ne sont jamais publiées."
            : "J'accepte que Tribune conserve mon identité et l'historique de mes contributions pour la traçabilité des fonds et les obligations de vigilance. Mes coordonnées ne sont jamais publiées."}
        </span>
      </label>
      {state.field === "consent" ? (
        <p className="small" style={{ color: "var(--bad)", fontWeight: 600, marginTop: -6 }}>
          {state.error}
        </p>
      ) : null}
      {club ? null : (
        <label className="check">
          <input type="checkbox" name="newsletter" defaultChecked={state.fields ? f.newsletter === "on" : true} />
          <span>Recevoir les nouvelles des campagnes que je soutiens</span>
        </label>
      )}
      <SubmitButton pendingLabel="Création du compte…">{club ? "Créer mon compte et continuer" : "Créer mon compte"}</SubmitButton>
    </form>
  );
}
