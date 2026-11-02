"use client";

import { useActionState, useState } from "react";
import { uploadCampaignCover } from "@/lib/actions/club";
import { Flash, SubmitButton } from "@/components/forms";
import { FileField } from "@/components/FileField";

/** Photo de couverture d'une campagne (club tant que le dossier est modifiable, équipe Tribune à tout moment). */
export function CoverUpload({ campaignId, coverSrc }: { campaignId: string; coverSrc: string | null }) {
  const [state, action] = useActionState(uploadCampaignCover, {});
  const [busy, setBusy] = useState(false);
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <Flash state={state} />
      <input type="hidden" name="campaign_id" value={campaignId} />
      {coverSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverSrc} alt="Photo de couverture actuelle" className="cover-preview" />
      ) : (
        <p className="small muted">Pas encore de photo : la fiche de la campagne affiche les couleurs et le blason du club.</p>
      )}
      <FileField
        id={`cover-${campaignId}`}
        name="cover"
        label={coverSrc ? "Remplacer la photo" : "Photo du projet"}
        hint="Le terrain, le chantier, le matériel… Format paysage conseillé. La photo est allégée automatiquement."
        accept="image/jpeg,image/png,image/webp"
        maxSide={1280}
        maxBytes={2 * 1024 * 1024}
        onBusy={setBusy}
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <SubmitButton className="btn btn-ghost btn-sm" name="intent" value="upload" pendingLabel="Envoi…" disabled={busy}>
          Enregistrer la photo
        </SubmitButton>
        {coverSrc ? (
          <SubmitButton className="btn btn-ghost btn-sm" name="intent" value="remove" pendingLabel="…" confirm="Retirer la photo de couverture ?">
            Retirer
          </SubmitButton>
        ) : null}
      </div>
    </form>
  );
}
