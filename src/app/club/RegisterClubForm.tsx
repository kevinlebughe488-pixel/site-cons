"use client";

import { useActionState } from "react";
import { registerClub } from "@/lib/actions/club";
import { Flash, SubmitButton } from "@/components/forms";
import { DRC_PROVIDERS } from "@/lib/payments/providers";

export function RegisterClubForm() {
  const [state, action] = useActionState(registerClub, {});
  const f = state.fields ?? {};
  return (
    <form className="panel form" action={action} noValidate>
      <div>
        <div className="eyebrow">Inscription du club</div>
        <h2 style={{ fontSize: "1.8rem", marginTop: 4 }}>Inscrire mon club</h2>
        <p className="small muted" style={{ marginTop: 6 }}>
          L&apos;équipe Tribune vérifie l&apos;identité du club et de ses dirigeants avant que vous puissiez lancer une
          campagne.
        </p>
      </div>
      <Flash state={state} />
      <div className="two">
        <div className="field">
          <label htmlFor="name">Nom complet du club</label>
          <input type="text" id="name" name="name" placeholder="Ex. : AS Vita Club" defaultValue={f.name} />
        </div>
        <div className="field">
          <label htmlFor="short_name">Sigle (2 à 4 caractères)</label>
          <input type="text" id="short_name" name="short_name" placeholder="Ex. : ASV" maxLength={4} defaultValue={f.short_name} />
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="city">Ville</label>
          <input type="text" id="city" name="city" placeholder="Kinshasa" defaultValue={f.city} />
        </div>
        <div className="field">
          <label htmlFor="commune">Commune ou quartier</label>
          <input type="text" id="commune" name="commune" defaultValue={f.commune} />
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="founded_year">Année de fondation</label>
          <input type="number" id="founded_year" name="founded_year" min={1850} max={2100} defaultValue={f.founded_year} />
        </div>
        <div className="field">
          <label htmlFor="president_name">Nom du président</label>
          <input type="text" id="president_name" name="president_name" defaultValue={f.president_name} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="contact_phone">Téléphone de contact du club</label>
        <input type="tel" id="contact_phone" name="contact_phone" placeholder="+243 81 000 0000" defaultValue={f.contact_phone} />
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="payout_phone">Compte Mobile Money qui recevra les fonds</label>
          <input type="tel" id="payout_phone" name="payout_phone" placeholder="081 000 0000" defaultValue={f.payout_phone} />
          <div className="hint">Au nom du club ou de son trésorier. Modifiable ensuite uniquement par l&apos;équipe Tribune.</div>
        </div>
        <div className="field">
          <label htmlFor="payout_provider">Opérateur</label>
          <select id="payout_provider" name="payout_provider" defaultValue={f.payout_provider || DRC_PROVIDERS[0].code}>
            {DRC_PROVIDERS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="color_primary">Couleur principale</label>
          <input type="color" id="color_primary" name="color_primary" defaultValue={f.color_primary || "#1d5237"} />
        </div>
        <div className="field">
          <label htmlFor="color_secondary">Couleur secondaire</label>
          <input type="color" id="color_secondary" name="color_secondary" defaultValue={f.color_secondary || "#ecd083"} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Présentation du club</label>
        <textarea id="description" name="description" placeholder="Histoire, palmarès, équipes, nombre de licenciés…" defaultValue={f.description} />
      </div>
      <p className="small muted">Le logo pourra être ajouté juste après l&apos;envoi de la demande.</p>
      <SubmitButton pendingLabel="Envoi…">Envoyer la demande</SubmitButton>
    </form>
  );
}
