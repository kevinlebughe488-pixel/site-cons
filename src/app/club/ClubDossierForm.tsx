"use client";

import { useActionState, useRef, useState } from "react";
import { saveClubDossier } from "@/lib/actions/club";
import { FieldError, Flash, SubmitButton } from "@/components/forms";
import { DRC_PROVIDERS } from "@/lib/payments/providers";
import { SPORTS } from "@/lib/types";

export type DossierValues = {
  name: string;
  short_name: string;
  sport: string;
  city: string;
  commune: string;
  address: string;
  founded_on: string;
  legal_id: string;
  rep_name: string;
  rep_title: string;
  rep_phone: string;
  rep_email: string;
  contact_phone: string;
  description: string;
  color_primary: string;
  color_secondary: string;
  payout_method: "mobile_money" | "bank";
  payout_holder: string;
  payout_phone: string;
  payout_provider: string;
  bank_name: string;
  bank_account: string;
};

export const EMPTY_DOSSIER: DossierValues = {
  name: "", short_name: "", sport: "Football", city: "", commune: "", address: "", founded_on: "", legal_id: "",
  rep_name: "", rep_title: "", rep_phone: "", rep_email: "", contact_phone: "", description: "",
  color_primary: "#1d5237", color_secondary: "#ecd083", payout_method: "mobile_money", payout_holder: "",
  payout_phone: "", payout_provider: DRC_PROVIDERS[0].code, bank_name: "", bank_account: "",
};

type Props = {
  initial: DossierValues;
  /** « create » : premier enregistrement ; « edit » : dossier en préparation ou à compléter. */
  mode: "create" | "edit";
  /** Le compte connecté, pour remplir le représentant légal en un geste. */
  me: { name: string; phone: string; email: string };
  maxDate: string;
};

export function ClubDossierForm({ initial, mode, me, maxDate }: Props) {
  const [state, action] = useActionState(saveClubDossier, {});
  const v: DossierValues = { ...initial, ...(state.fields as Partial<DossierValues> | undefined) };
  const [method, setMethod] = useState<DossierValues["payout_method"]>(v.payout_method);
  const repName = useRef<HTMLInputElement>(null);
  const repPhone = useRef<HTMLInputElement>(null);
  const repEmail = useRef<HTMLInputElement>(null);
  const invalid = (name: string) => (state.field === name ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  function fillWithMe() {
    if (repName.current) repName.current.value = me.name;
    if (repPhone.current) repPhone.current.value = me.phone;
    if (repEmail.current) repEmail.current.value = me.email;
  }

  return (
    <form className="panel form dossier" action={action} noValidate>
      <div>
        <div className="eyebrow">{mode === "create" ? "Étape 2 · Dossier du club" : "Dossier du club"}</div>
        <h2 style={{ fontSize: "1.8rem", marginTop: 4 }}>{mode === "create" ? "Inscrire mon club" : "Informations du club"}</h2>
        <p className="small muted" style={{ marginTop: 6 }}>
          L&apos;inscription ne donne pas tout de suite le droit de lancer une campagne : l&apos;équipe Tribune vérifie
          d&apos;abord le club, son représentant légal et son compte de versement.
        </p>
      </div>
      <Flash state={state} />

      <fieldset>
        <legend>Identité du club</legend>
        <div className="two">
          <div className="field">
            <label htmlFor="name">Nom officiel du club</label>
            <input type="text" id="name" name="name" placeholder="Ex. : Association sportive Vita Club" defaultValue={v.name} {...invalid("name")} />
            <FieldError state={state} name="name" />
            <div className="hint">Tel qu&apos;il figure dans les statuts.</div>
          </div>
          <div className="field">
            <label htmlFor="short_name">Nom abrégé ou sigle</label>
            <input type="text" id="short_name" name="short_name" placeholder="Ex. : ASV" maxLength={4} defaultValue={v.short_name} {...invalid("short_name")} style={{ textTransform: "uppercase" }} />
            <FieldError state={state} name="short_name" />
            <div className="hint">2 à 4 lettres ou chiffres, affichés sur le blason.</div>
          </div>
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="sport">Discipline sportive</label>
            <input type="text" id="sport" name="sport" list="sports" defaultValue={v.sport} {...invalid("sport")} />
            <datalist id="sports">
              {SPORTS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <FieldError state={state} name="sport" />
          </div>
          <div className="field">
            <label htmlFor="founded_on">Date de création</label>
            <input type="date" id="founded_on" name="founded_on" min="1850-01-01" max={maxDate} defaultValue={v.founded_on} {...invalid("founded_on")} />
            <FieldError state={state} name="founded_on" />
            <div className="hint">Celle des statuts. Si seule l&apos;année est connue, choisissez le 1er janvier.</div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="legal_id">
            Identifiant juridique ou administratif <span className="muted">(si disponible)</span>
          </label>
          <input type="text" id="legal_id" name="legal_id" maxLength={80} placeholder="N° d'enregistrement, arrêté, affiliation, RCCM…" defaultValue={v.legal_id} {...invalid("legal_id")} />
          <FieldError state={state} name="legal_id" />
        </div>
      </fieldset>

      <fieldset>
        <legend>Siège</legend>
        <div className="two">
          <div className="field">
            <label htmlFor="city">Ville</label>
            <input type="text" id="city" name="city" placeholder="Kinshasa" defaultValue={v.city} {...invalid("city")} />
            <FieldError state={state} name="city" />
          </div>
          <div className="field">
            <label htmlFor="commune">Commune ou quartier</label>
            <input type="text" id="commune" name="commune" defaultValue={v.commune} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="address">Adresse du siège</label>
          <input type="text" id="address" name="address" placeholder="N°, avenue, quartier" defaultValue={v.address} {...invalid("address")} />
          <FieldError state={state} name="address" />
          <div className="hint">Visible seulement par l&apos;équipe Tribune et les gestionnaires du club.</div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Représentant légal</legend>
        <p className="small muted" style={{ marginTop: -4 }}>
          La personne qui engage le club (souvent le président).{" "}
          <button type="button" className="link-btn" onClick={fillWithMe}>
            C&apos;est moi : reprendre mes coordonnées
          </button>
        </p>
        <div className="two">
          <div className="field">
            <label htmlFor="rep_name">Nom et prénom</label>
            <input type="text" id="rep_name" name="rep_name" ref={repName} defaultValue={v.rep_name} {...invalid("rep_name")} />
            <FieldError state={state} name="rep_name" />
          </div>
          <div className="field">
            <label htmlFor="rep_title">Fonction</label>
            <input type="text" id="rep_title" name="rep_title" list="titles" placeholder="Président" defaultValue={v.rep_title} {...invalid("rep_title")} />
            <datalist id="titles">
              {["Président", "Vice-président", "Secrétaire général", "Trésorier", "Directeur général", "Manager général"].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <FieldError state={state} name="rep_title" />
          </div>
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="rep_phone">Téléphone</label>
            <input type="tel" id="rep_phone" name="rep_phone" ref={repPhone} placeholder="+243 81 000 0000" defaultValue={v.rep_phone} {...invalid("rep_phone")} />
            <FieldError state={state} name="rep_phone" />
          </div>
          <div className="field">
            <label htmlFor="rep_email">
              E-mail <span className="muted">(facultatif)</span>
            </label>
            <input type="email" id="rep_email" name="rep_email" ref={repEmail} defaultValue={v.rep_email} {...invalid("rep_email")} />
            <FieldError state={state} name="rep_email" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="contact_phone">
            Téléphone du club <span className="muted">(si différent)</span>
          </label>
          <input type="tel" id="contact_phone" name="contact_phone" placeholder="Par défaut : celui du représentant" defaultValue={v.contact_phone} {...invalid("contact_phone")} />
          <FieldError state={state} name="contact_phone" />
        </div>
      </fieldset>

      <fieldset>
        <legend>Compte de versement</legend>
        <p className="small muted" style={{ marginTop: -4 }}>
          Les fonds collectés sont versés par tranches, après la preuve de chaque jalon, sur un compte <b>au nom du club</b>.
          Il ne se change ensuite que par l&apos;équipe Tribune, pour éviter les détournements.
        </p>
        <div className="pay two">
          <label>
            <input type="radio" name="payout_method" value="mobile_money" checked={method === "mobile_money"} onChange={() => setMethod("mobile_money")} />
            <span>
              <b>Mobile Money</b>
              <br />
              <span className="small muted">M-Pesa, Airtel Money, Orange Money</span>
            </span>
            <span />
          </label>
          <label>
            <input type="radio" name="payout_method" value="bank" checked={method === "bank"} onChange={() => setMethod("bank")} />
            <span>
              <b>Compte bancaire</b>
              <br />
              <span className="small muted">Au nom du club</span>
            </span>
            <span />
          </label>
        </div>
        <div className="field">
          <label htmlFor="payout_holder">Titulaire du compte</label>
          <input type="text" id="payout_holder" name="payout_holder" placeholder="Nom exact du titulaire : le club ou son trésorier mandaté" defaultValue={v.payout_holder} {...invalid("payout_holder")} />
          <FieldError state={state} name="payout_holder" />
        </div>
        {method === "mobile_money" ? (
          <div className="two">
            <div className="field">
              <label htmlFor="payout_phone">Numéro Mobile Money</label>
              <input type="tel" id="payout_phone" name="payout_phone" placeholder="081 000 0000" defaultValue={v.payout_phone} {...invalid("payout_phone")} />
              <FieldError state={state} name="payout_phone" />
            </div>
            <div className="field">
              <label htmlFor="payout_provider">Opérateur</label>
              <select id="payout_provider" name="payout_provider" defaultValue={v.payout_provider || DRC_PROVIDERS[0].code} {...invalid("payout_provider")}>
                {DRC_PROVIDERS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label}
                  </option>
                ))}
              </select>
              <FieldError state={state} name="payout_provider" />
            </div>
          </div>
        ) : (
          <div className="two">
            <div className="field">
              <label htmlFor="bank_name">Banque</label>
              <input type="text" id="bank_name" name="bank_name" placeholder="Ex. : Rawbank, Equity BCDC, TMB…" defaultValue={v.bank_name} {...invalid("bank_name")} />
              <FieldError state={state} name="bank_name" />
            </div>
            <div className="field">
              <label htmlFor="bank_account">Numéro de compte</label>
              <input type="text" id="bank_account" name="bank_account" autoComplete="off" defaultValue={v.bank_account} {...invalid("bank_account")} />
              <FieldError state={state} name="bank_account" />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Présentation</legend>
        <div className="two">
          <div className="field">
            <label htmlFor="color_primary">Couleur principale</label>
            <input type="color" id="color_primary" name="color_primary" defaultValue={v.color_primary} />
          </div>
          <div className="field">
            <label htmlFor="color_secondary">Couleur secondaire</label>
            <input type="color" id="color_secondary" name="color_secondary" defaultValue={v.color_secondary} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="description">Présentation du club</label>
          <textarea id="description" name="description" placeholder="Histoire, palmarès, équipes, nombre de licenciés…" defaultValue={v.description} {...invalid("description")} />
          <FieldError state={state} name="description" />
        </div>
      </fieldset>

      <SubmitButton pendingLabel="Enregistrement…">{mode === "create" ? "Créer le dossier du club" : "Enregistrer le dossier"}</SubmitButton>
      {mode === "create" ? (
        <p className="small muted">Ensuite : ajoutez les documents du club, puis envoyez le dossier pour vérification.</p>
      ) : null}
    </form>
  );
}
