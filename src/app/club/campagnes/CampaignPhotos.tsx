"use client";

import { useActionState, useState } from "react";
import { deleteCampaignPhoto, setCampaignCover, uploadCampaignPhoto } from "@/lib/actions/club";
import { ActionForm, FieldError, Flash, SubmitButton } from "@/components/forms";
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
  today,
}: {
  campaignId: string;
  photos: CampaignPhoto[];
  coverPath: string | null;
  editable: boolean;
  /** Date du jour à Kinshasa (AAAA-MM-JJ) : date proposée et date maximale. */
  today: string;
}) {
  const [state, action] = useActionState(uploadCampaignPhoto, {});
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
              {editable ? (
                <div className="photo-actions">
                  {p.file_path !== coverPath ? (
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
        <form action={action} className="form" style={{ gap: 12 }} noValidate>
          <Flash state={state.field ? {} : state} />
          <input type="hidden" name="campaign_id" value={campaignId} />
          <FileField
            id={`photo-${campaignId}`}
            name="photo"
            label={photos.length ? "Ajouter une photo" : "Photo de la situation actuelle"}
            hint="Format paysage conseillé. La photo est allégée automatiquement."
            accept="image/jpeg,image/png,image/webp"
            maxSide={1600}
            maxBytes={2 * 1024 * 1024}
            onBusy={setBusy}
          />
          <FieldError state={state} name="photo" />
          <div className="field">
            <label htmlFor={`caption-${campaignId}`}>Ce que montre la photo</label>
            <input
              type="text"
              id={`caption-${campaignId}`}
              name="caption"
              maxLength={200}
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
          <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Envoi…" disabled={busy}>
            Ajouter la photo
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
