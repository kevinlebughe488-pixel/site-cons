"use client";

import { useEffect, useRef, useState } from "react";
import { formatBytes, replaceInputFile, shrinkImage } from "@/lib/images";

/**
 * Champ fichier qui allège les photos avant l'envoi (voir lib/images.ts) et
 * affiche le fichier retenu. `onBusy` signale au formulaire de patienter.
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
  const [tooBig, setTooBig] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // Après un envoi réussi, React vide le formulaire : on efface aussi le nom du fichier affiché.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const clear = () => {
      setInfo(null);
      setTooBig(false);
    };
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      setInfo(null);
      setTooBig(false);
      return;
    }
    onBusy?.(true);
    setInfo("Préparation du fichier…");
    const ready = await shrinkImage(file, maxSide);
    const replaced = ready !== file && replaceInputFile(input, ready);
    const sent = replaced ? ready : file;
    if (sent.size > maxBytes) {
      // Trop lourd même après allègement : on ne l'envoie pas (le serveur le refuserait).
      input.value = "";
      setTooBig(true);
      setInfo(`${sent.name} pèse ${formatBytes(sent.size)} : ${formatBytes(maxBytes)} au plus. Réduisez-le (PDF compressé, photo moins lourde) puis réessayez.`);
      onBusy?.(false);
      return;
    }
    setTooBig(false);
    setInfo(`${sent.name} · ${formatBytes(sent.size)}${replaced ? " (photo allégée pour l'envoi)" : ""}`);
    onBusy?.(false);
  }

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input ref={ref} type="file" id={id} name={name} accept={accept} onChange={onChange} />
      {info ? <div className={`hint${tooBig ? " field-error" : ""}`}>{info}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}
