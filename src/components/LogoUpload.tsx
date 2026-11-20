import { uploadClubLogo } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { FileField } from "@/components/FileField";
import { Crest } from "@/components/visuals";
import type { Club } from "@/lib/types";

export function LogoUpload({ club }: { club: Pick<Club, "id" | "short_name" | "color_primary" | "color_secondary" | "logo_path"> }) {
  return (
    <ActionForm action={uploadClubLogo}>
      <input type="hidden" name="club_id" value={club.id} />
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Crest club={club} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <FileField
            id={`logo-${club.id}`}
            name="logo"
            label="Logo du club"
            hint="PNG, JPEG ou WebP, 1 Mo maximum, de préférence carré sur fond transparent."
            accept="image/png,image/jpeg,image/webp"
            maxSide={1024}
            maxBytes={1024 * 1024}
          />
        </div>
      </div>
      <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Envoi…">
        Envoyer le logo
      </SubmitButton>
    </ActionForm>
  );
}
