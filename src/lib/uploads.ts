import "server-only";

// Fichiers envoyés par les utilisateurs (documents de club, photos de campagne).
// Le type est déduit du contenu du fichier, jamais de ce que déclare le
// navigateur : un fichier qui ne commence pas comme un vrai PDF, JPEG, PNG ou
// WebP est refusé.

export type DetectedFile = { bytes: Buffer; mime: "application/pdf" | "image/jpeg" | "image/png" | "image/webp"; ext: string };

function startsWith(bytes: Buffer, signature: number[], offset = 0): boolean {
  return signature.every((b, i) => bytes[offset + i] === b);
}

function detect(bytes: Buffer): Omit<DetectedFile, "bytes"> | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf" }; // %PDF-
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png" };
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return { mime: "image/webp", ext: "webp" };
  return null;
}

/** Lit un fichier de formulaire et vérifie sa taille et son type réel. */
export async function readUpload(
  value: FormDataEntryValue | null,
  options: { maxBytes: number; allowPdf: boolean; label: string },
): Promise<DetectedFile | { error: string }> {
  if (!(value instanceof File) || value.size === 0) return { error: `Choisissez ${options.label}.` };
  if (value.size > options.maxBytes) {
    return { error: `Le fichier dépasse ${Math.round(options.maxBytes / (1024 * 1024))} Mo. Réduisez-le (photo moins lourde, PDF compressé) et réessayez.` };
  }
  const bytes = Buffer.from(await value.arrayBuffer());
  const found = detect(bytes);
  if (!found || (found.mime === "application/pdf" && !options.allowPdf)) {
    return { error: options.allowPdf ? "Le fichier doit être un PDF ou une photo (JPEG, PNG, WebP)." : "La photo doit être une image JPEG, PNG ou WebP." };
  }
  return { ...found, bytes };
}

/** Nom de fichier affichable : sans chemin ni caractères de contrôle, 160 caractères au plus. */
export function cleanFileName(value: FormDataEntryValue | null, fallback: string): string {
  const raw = value instanceof File ? value.name : "";
  const name = raw.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim() ?? "";
  return (name || fallback).slice(0, 160);
}
