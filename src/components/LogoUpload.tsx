import { uploadClubLogo } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Crest } from "@/components/visuals";
import type { Club } from "@/lib/types";

export function LogoUpload({ club }: { club: Pick<Club, "id" | "short_name" | "color_primary" | "color_secondary" | "logo_path"> }) {
  return (
    <ActionForm action={uploadClubLogo}>
      <input type="hidden" name="club_id" value={club.id} />
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Crest club={club} size={56} />
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={`logo-${club.id}`}>Logo du club</label>
          <input type="file" id={`logo-${club.id}`} name="logo" accept="image/png,image/jpeg,image/webp" />
          <div className="hint">PNG, JPEG ou WebP, 1 Mo maximum, de préférence carré sur fond transparent.</div>
        </div>
      </div>
      <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Envoi…">
        Envoyer le logo
      </SubmitButton>
    </ActionForm>
  );
}
