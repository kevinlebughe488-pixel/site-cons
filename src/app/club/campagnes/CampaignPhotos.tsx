"use client";

import { useState } from "react";
import { deleteCampaignPhoto, setCampaignCover, uploadCampaignPhoto } from "@/lib/actions/club";
import { ActionForm, FieldError, Flash, SubmitButton, useFormAction } from "@/components/forms";
import { FileField } from "@/components/FileField";
import { coverUrl } from "@/components/visuals";
import { formatDate } from "@/lib/format";
import type { CampaignPhoto } from "@/lib/types";

/**
 * Photos de la situation actuelle d'une campagne : ce que les supporters verront
 * (la pelouse aujourd'hui, le vestiaire, le matériel usé…). Le club les gère tant
 * que le dossier est modifiable, l'équipe Tribune à tout moment.
 */
export function CampaignPhotos({
  campaignId,
  photos,
  coverPath,
  editable,
  removable = false,
  today,
}: {
  campaignId: string;
  photos: CampaignPhoto[];
  coverPath: string | null;
  editable: boolean;
  /** Équipe Tribune : peut retirer une photo (modération), sans en ajouter ni changer la couverture. */
  removable?: boolean;
  /** Date du jour à Kinshasa (AAAA-MM-JJ) : date proposée et date maximale. */
  today: string;
}) {
  const { state, formProps } = useFormAction(uploadCampaignPhoto, { resetOnSuccess: true });
  const [busy, setBusy] = useState(false);
  const full = photos.length >= 6;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {photos.length ? (
        <div className="photo-grid">
          {photos.map((p) => (
            <figure key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl(p.file_path)} alt={p.caption} loading="lazy" />
              <figcaption>
                <b>{p.caption}</b>
                <span className="small muted">{p.taken_on ? `Photo du ${formatDate(p.taken_on)}` : "Date inconnue"}</span>
              </figcaption>
              {p.file_path === coverPath ? <span className="badge cover-badge">Couverture</span> : null}
              {editable || removable ? (
                <div className="photo-actions">
                  {editable && p.file_path !== coverPath ? (
                    <ActionForm action={setCampaignCover} className="inline-form">
                      <input type="hidden" name="photo_id" value={p.id} />
                      <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
                        Couverture
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                  <ActionForm action={deleteCampaignPhoto} className="inline-form">
                    <input type="hidden" name="photo_id" value={p.id} />
                    <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…" confirm="Retirer cette photo ?">
                      Retirer
                    </SubmitButton>
                  </ActionForm>
                </div>
              ) : null}
            </figure>
          ))}
        </div>
      ) : (
        <p className="small muted">
          Aucune photo pour le moment. Au moins une est exigée pour envoyer la campagne en revue : sans photo, la fiche affiche les
          couleurs du club.
        </p>
      )}
      {editable && !full ? (
        <form {...formProps} className="form" style={{ gap: 12 }}>
          <Flash state={state.field ? {} : state} />
          <input type="hidden" name="campaign_id" value={campaignId} />
          <p className="small muted" style={{ margin: 0 }}>
            Écrivez d&apos;abord ce que montre la photo et sa date, puis choisissez-la : elle est envoyée aussitôt.
          </p>
          <div className="two">
            <div className="field">
              <label htmlFor={`caption-${campaignId}`}>
                Ce que montre la photo <span className="req">*</span>
              </label>
              <input
                type="text"
                id={`caption-${campaignId}`}
                name="caption"
                maxLength={200}
                required
                placeholder="Ex. : la pelouse du stade aujourd'hui, pelée devant les buts"
                aria-invalid={state.field === "caption" || undefined}
              />
              <FieldError state={state} name="caption" />
            </div>
            <div className="field">
              <label htmlFor={`taken-${campaignId}`}>Date de la photo</label>
              <input type="date" id={`taken-${campaignId}`} name="taken_on" defaultValue={today} max={today} aria-invalid={state.field === "taken_on" || undefined} />
              <FieldError state={state} name="taken_on" />
            </div>
          </div>
          <FileField
            id={`photo-${campaignId}`}
            name="photo"
            label={photos.length ? "Ajouter une photo" : "Photo de la situation actuelle"}
            hint="Format paysage conseillé. La photo est allégée automatiquement."
            accept="image/jpeg,image/png,image/webp"
            maxSide={1600}
            maxBytes={2 * 1024 * 1024}
            onBusy={setBusy}
            autoSubmit
          />
          <FieldError state={state} name="photo" />
          {/* Le fichier part dès qu'il est choisi ; ce bouton sert si l'envoi a dû attendre (légende manquante, erreur). */}
          <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Envoi…" disabled={busy}>
            Envoyer la photo
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
