"use client";

import { useRef, useState } from "react";
import { uploadClubLogo } from "@/lib/actions/club";
import { useFormAction } from "@/components/forms";
import { Crest, logoUrl } from "@/components/visuals";
import { formatBytes, replaceInputFile, shrinkImage } from "@/lib/images";
import type { Club } from "@/lib/types";

export type LogoClub = Pick<Club, "id" | "short_name" | "color_primary" | "color_secondary" | "logo_path">;

const MAX_BYTES = 1024 * 1024;

export function PencilIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M11.3 1.7a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L5.6 13.4 2 14l.6-3.6Z" fill="currentColor" />
    </svg>
  );
}

/** Logo du club dans un carré blanc arrondi (ou le blason dessiné aux couleurs du club). */
export function ClubAvatar({ club, size, preview }: { club: LogoClub; size: number; preview?: string | null }) {
  const src = preview ?? (club.logo_path ? logoUrl(club.logo_path) : null);
  return (
    <span className="club-avatar" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        <Crest club={{ ...club, logo_path: null }} size={Math.round(size * 0.58)} />
      )}
    </span>
  );
}

/**
 * Logo modifiable, comme une photo de profil : le crayon (ou un clic sur le logo)
 * ouvre le choix d'une image, envoyée aussitôt ; l'aperçu change tout de suite.
 * Réservé aux gestionnaires du club (l'action serveur le vérifie).
 */
export function LogoEdit({ club, size = 96, showStatus = true }: { club: LogoClub; size?: number; showStatus?: boolean }) {
  const { state, pending, formProps } = useFormAction(uploadClubLogo, { resetOnSuccess: true });
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function onChoose(event: React.ChangeEvent<HTMLInputElement>) {
    const field = event.currentTarget;
    const file = field.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      field.value = "";
      setProblem("Choisissez une image PNG, JPEG ou WebP.");
      return;
    }
    const ready = await shrinkImage(file, 1024);
    const sent = ready !== file && replaceInputFile(field, ready) ? ready : file;
    if (sent.size > MAX_BYTES) {
      field.value = "";
      setProblem(`L'image pèse ${formatBytes(sent.size)} : 1 Mo au plus. Choisissez une image plus légère.`);
      return;
    }
    setProblem(null);
    setPreview(URL.createObjectURL(sent));
    field.form?.requestSubmit();
  }

  const message = pending ? "Envoi du logo…" : (problem ?? state.error ?? state.success ?? null);
  const tone = pending ? "" : problem || state.error ? " bad" : state.success ? " ok" : "";

  return (
    <form {...formProps} className="logo-edit">
      <input type="hidden" name="club_id" value={club.id} />
      <input ref={input} type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} onChange={onChoose} />
      <button
        type="button"
        className={`logo-edit-btn${pending ? " busy" : ""}`}
        onClick={() => input.current?.click()}
        disabled={pending}
        aria-label={club.logo_path ? "Changer le logo du club" : "Ajouter le logo du club"}
        title={club.logo_path ? "Changer le logo" : "Ajouter le logo"}
      >
        <ClubAvatar club={club} size={size} preview={state.error || problem ? null : preview} />
        <span className="logo-pencil" aria-hidden="true">
          <PencilIcon size={Math.max(12, Math.round(size / 7))} />
        </span>
      </button>
      {showStatus ? (
        <span className={`logo-status small${tone}`} role="status">
          {message ?? (club.logo_path ? "PNG, JPEG ou WebP, 1 Mo au plus." : "Aucun logo : un blason aux couleurs du club est affiché.")}
        </span>
      ) : null}
    </form>
  );
}
