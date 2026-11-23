"use client";

import { useState } from "react";
import { postNews } from "@/lib/actions/club";
import { FieldError, Flash, SubmitButton, useFormAction } from "@/components/forms";
import { plural } from "@/lib/format";

type CampaignChoice = { id: string; title: string; backers: number };

const TITLE_MIN = 3;
const BODY_MIN = 10;

/**
 * Le seul formulaire de publication du club : une actualité du club, une nouvelle
 * d'une campagne (page de la campagne, contributeurs prévenus) ou un message
 * réservé aux contributeurs d'une campagne. Les champs restent remplis si l'envoi
 * est refusé, et sont vidés une fois la publication faite.
 */
export function NewsForm({ campaigns, preselected }: { campaigns: CampaignChoice[]; preselected: string | null }) {
  const { state, formProps } = useFormAction(postNews, { resetOnSuccess: true });
  const [about, setAbout] = useState(preselected && campaigns.some((c) => c.id === preselected) ? preselected : "");
  const [audience, setAudience] = useState<"public" | "contributors">("public");
  const [titleLen, setTitleLen] = useState(0);
  const [bodyLen, setBodyLen] = useState(0);
  const campaign = campaigns.find((c) => c.id === about) ?? null;
  // Un message aux contributeurs n'a de sens que pour une campagne qui en a.
  const canTargetBackers = !!campaign && campaign.backers > 0;
  const target = canTargetBackers ? audience : "public";

  return (
    <form {...formProps} className="form" onReset={() => {
      setTitleLen(0);
      setBodyLen(0);
    }}>
      <Flash state={state.field ? {} : state} />
      <div className="field">
        <label htmlFor="news-about">De quoi parle la nouvelle ?</label>
        <select id="news-about" name="campaign_id" value={about} onChange={(e) => setAbout(e.target.value)}>
          <option value="">Le club (résultats, vie du club, remerciements)</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              Campagne : {c.title}
            </option>
          ))}
        </select>
        <div className="hint">
          {campaign
            ? "Publiée sur la page de la campagne ; ses contributeurs sont prévenus."
            : "Publiée sur la page du club ; ceux qui le suivent et les contributeurs de ses campagnes sont prévenus."}
        </div>
      </div>
      {campaign ? (
        <fieldset className="audience">
          <legend className="small" style={{ fontWeight: 700 }}>
            Destinataires
          </legend>
          <label className="check">
            <input type="radio" name="audience" value="public" checked={target === "public"} onChange={() => setAudience("public")} />
            <span>
              <b>Tout le monde</b> · <span className="small muted">sur la page de la campagne, contributeurs prévenus</span>
            </span>
          </label>
          <label className="check" style={canTargetBackers ? undefined : { opacity: 0.55 }}>
            <input
              type="radio"
              name="audience"
              value="contributors"
              disabled={!canTargetBackers}
              checked={target === "contributors"}
              onChange={() => setAudience("contributors")}
            />
            <span>
              <b>Seulement les contributeurs</b> ·{" "}
              <span className="small muted">
                {canTargetBackers ? `message réservé aux ${plural(campaign.backers, "contributeur")}` : "pas encore de contributeur"}
              </span>
            </span>
          </label>
        </fieldset>
      ) : (
        <input type="hidden" name="audience" value="public" />
      )}
      <div className="field">
        <label htmlFor="news-title">Titre</label>
        <input
          type="text"
          id="news-title"
          name="title"
          maxLength={140}
          required
          minLength={TITLE_MIN}
          onChange={(e) => setTitleLen(e.target.value.trim().length)}
          aria-invalid={state.field === "title" || undefined}
        />
        <FieldError state={state} name="title" />
      </div>
      <div className="field">
        <label htmlFor="news-body">Texte</label>
        <textarea
          id="news-body"
          name="body"
          required
          minLength={BODY_MIN}
          maxLength={4000}
          placeholder={campaign ? "Où en est le projet ? Un merci, une échéance, une photo publiée…" : "Le résultat du week-end, une nouvelle du club, un merci aux supporters…"}
          onChange={(e) => setBodyLen(e.target.value.trim().length)}
          aria-invalid={state.field === "body" || undefined}
        />
        <FieldError state={state} name="body" />
        <div className="hint" style={{ color: bodyLen >= BODY_MIN && titleLen >= TITLE_MIN ? "var(--ok)" : undefined }}>
          {bodyLen >= BODY_MIN ? `${bodyLen} caractères ✓` : `Au moins ${BODY_MIN} caractères (${bodyLen} pour l'instant).`}
        </div>
      </div>
      <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Publication…">
        Publier
      </SubmitButton>
    </form>
  );
}
