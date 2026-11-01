"use client";

import { useState, useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * Partage d'une campagne : WhatsApp d'abord (le réseau le plus utilisé par les
 * supporters), puis Facebook, X, Telegram, copie du lien et partage natif du
 * téléphone. Le lien contient le code d'ambassadeur du supporter connecté.
 */
export function ShareButtons({ url, text, compact = false }: { url: string; text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  // Le serveur ne sait pas si le téléphone propose le partage natif : faux au premier rendu, puis la vraie valeur.
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, cls: "wa" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, cls: "fb" },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, cls: "x" },
    { label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}`, cls: "tg" },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez le lien :", url);
    }
  }

  return (
    <div className={`share${compact ? " compact" : ""}`}>
      {links.map((l) => (
        <a key={l.label} className={`share-btn ${l.cls}`} href={l.href} target="_blank" rel="noopener noreferrer">
          {l.label}
        </a>
      ))}
      <button type="button" className="share-btn" onClick={copy} aria-live="polite">
        {copied ? "Lien copié ✓" : "Copier le lien"}
      </button>
      {canShare ? (
        <button type="button" className="share-btn" onClick={() => navigator.share({ title: text, text, url }).catch(() => undefined)}>
          Partager…
        </button>
      ) : null}
    </div>
  );
}
