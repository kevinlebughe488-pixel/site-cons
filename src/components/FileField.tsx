"use client";

import { useEffect, useRef, useState } from "react";
import { formatBytes, replaceInputFile, shrinkImage } from "@/lib/images";

/** Le fichier correspond-il au filtre `accept` du champ (types MIME, « image/* » ou extensions) ? */
function accepted(file: File, accept: string): boolean {
  const rules = accept.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
  if (!rules.length) return true;
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return rules.some((r) => (r.startsWith(".") ? name.endsWith(r) : r.endsWith("/*") ? type.startsWith(r.slice(0, -1)) : type === r));
}

function FolderIcon() {
  return (
    <svg className="dz-icon" width="40" height="32" viewBox="0 0 40 32" aria-hidden="true">
      <path d="M4 2h11l4 4h17a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Champ fichier en zone « Glisser-déposer un fichier ou parcourir ». Il allège les
 * photos avant l'envoi (voir lib/images.ts) et affiche le fichier retenu.
 * `onBusy` signale au formulaire de patienter pendant la préparation.
 */
export function FileField({
  id,
  name,
  label,
  hint,
  accept,
  maxSide = 1600,
  maxBytes,
  onBusy,
}: {
  id: string;
  name: string;
  label: string;
  hint?: string;
  accept: string;
  maxSide?: number;
  /** Taille maximale acceptée par le serveur : un fichier plus lourd n'est pas envoyé. */
  maxBytes: number;
  onBusy?: (busy: boolean) => void;
}) {
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [over, setOver] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // Après un envoi réussi, React vide le formulaire : on efface aussi le fichier affiché.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const clear = () => {
      setInfo(null);
      setError(false);
      setChosen(false);
    };
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  const reject = (input: HTMLInputElement, message: string) => {
    input.value = "";
    setChosen(false);
    setError(true);
    setInfo(message);
  };

  async function prepare(input: HTMLInputElement, file: File | undefined) {
    if (!file) {
      setInfo(null);
      setError(false);
      setChosen(false);
      return;
    }
    if (!accepted(file, accept)) {
      reject(input, `${file.name} n'est pas d'un type accepté.`);
      return;
    }
    onBusy?.(true);
    setError(false);
    setInfo("Préparation du fichier…");
    const ready = await shrinkImage(file, maxSide);
    const replaced = ready !== file && replaceInputFile(input, ready);
    const sent = replaced ? ready : file;
    if (sent.size > maxBytes) {
      // Trop lourd même après allègement : on ne l'envoie pas (le serveur le refuserait).
      reject(input, `${sent.name} pèse ${formatBytes(sent.size)} : ${formatBytes(maxBytes)} au plus. Réduisez-le (PDF compressé, photo moins lourde) puis réessayez.`);
      onBusy?.(false);
      return;
    }
    setChosen(true);
    setInfo(`${sent.name} · ${formatBytes(sent.size)}${replaced ? " (photo allégée)" : ""}`);
    onBusy?.(false);
  }

  function onDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setOver(false);
    const input = ref.current;
    const file = event.dataTransfer.files?.[0];
    if (!input || !file) return;
    if (!replaceInputFile(input, file)) {
      reject(input, "Votre navigateur ne permet pas de déposer un fichier ici : cliquez sur « parcourir ».");
      return;
    }
    void prepare(input, file);
  }

  return (
    <div className="field">
      <span className="field-title" id={`${id}-title`}>
        {label}
      </span>
      <label
        htmlFor={id}
        className={`dropzone${over ? " over" : ""}${chosen ? " chosen" : ""}${error ? " invalid" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <FolderIcon />
        {chosen && info ? (
          <span className="dz-text">
            <b>✓ {info}</b>
            <span className="dz-change">Changer de fichier</span>
          </span>
        ) : (
          <span className="dz-text">
            Glisser-déposer un fichier ou <u>parcourir</u>
          </span>
        )}
        <input
          ref={ref}
          className="sr-only"
          type="file"
          id={id}
          name={name}
          accept={accept}
          aria-labelledby={`${id}-title`}
          aria-describedby={`${id}-hint`}
          onChange={(e) => void prepare(e.currentTarget, e.currentTarget.files?.[0])}
        />
      </label>
      <div id={`${id}-hint`} className={`hint${error ? " field-error" : ""}`} role={error ? "alert" : undefined}>
        {!chosen && info ? info : hint}
      </div>
    </div>
  );
}
