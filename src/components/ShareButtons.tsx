"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties, type MouseEvent, type ReactNode } from "react";

const noop = () => () => {};

// Pictogrammes simples dessinés en ligne (aucune bibliothèque ni image externe).
function Icon({ children, filled = false }: { children: ReactNode; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  // Bulle de discussion.
  wa: (
    <Icon>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
    </Icon>
  ),
  // Lettre « f ».
  fb: (
    <Icon filled>
      <path d="M17 2h-3a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </Icon>
  ),
  // Lettre « X ».
  x: (
    <Icon>
      <path d="M4 4h4.5L20 20h-4.5z" strokeWidth="1.7" />
      <path d="M19.5 4l-6.2 7M10.7 13l-6.2 7" strokeWidth="1.9" />
    </Icon>
  ),
  // Avion en papier.
  tg: (
    <Icon>
      <path d="M21.5 3.5 2.5 11l7 2.6M21.5 3.5 18 20.5l-8.5-6.9M21.5 3.5l-12 10.1V19l3.2-3.3" />
    </Icon>
  ),
  // Maillons de chaîne.
  link: (
    <Icon>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.8 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
    </Icon>
  ),
  check: (
    <Icon>
      <path d="M20 6 9 17l-5-5" />
    </Icon>
  ),
  // Trois points reliés : partage natif du téléphone.
  more: (
    <Icon>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </Icon>
  ),
};

/**
 * Partage d'une campagne : WhatsApp d'abord (le réseau le plus utilisé par les
 * supporters), puis Facebook, X, Telegram, copie du lien et partage natif du
 * téléphone. Le lien contient le code d'ambassadeur du supporter connecté.
 * Une seule rangée de boutons ronds : si la place manque, la rangée défile
 * horizontalement au lieu de passer à la ligne.
 */
export function ShareButtons({ url, text, compact = false }: { url: string; text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  // Position horizontale de la bulle « Lien copié », centrée sur le bouton de copie.
  const [bubbleX, setBubbleX] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  // Le serveur ne sait pas si le téléphone propose le partage natif : faux au premier rendu, puis la vraie valeur.
  const canShare = useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, cls: "wa" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, cls: "fb" },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, cls: "x" },
    { label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${t}`, cls: "tg" },
  ] as const;

  async function copy(e: MouseEvent<HTMLButtonElement>) {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(url);
      setBubbleX(btn.offsetLeft - (rowRef.current?.scrollLeft ?? 0) + btn.offsetWidth / 2);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copiez le lien :", url);
    }
  }

  return (
    <div className={`share${compact ? " compact" : ""}`}>
      <div className="share-row" ref={rowRef}>
        {links.map((l) => (
          <a
            key={l.label}
            className={`share-btn ${l.cls}`}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Partager sur ${l.label}`}
            title={`Partager sur ${l.label}`}
          >
            {ICONS[l.cls]}
          </a>
        ))}
        <button
          type="button"
          className={`share-btn${copied ? " done" : ""}`}
          onClick={copy}
          aria-label="Copier le lien"
          title="Copier le lien"
        >
          {copied ? ICONS.check : ICONS.link}
        </button>
        {canShare ? (
          <button
            type="button"
            className="share-btn"
            onClick={() => navigator.share({ title: text, text, url }).catch(() => undefined)}
            aria-label="Partager…"
            title="Partager…"
          >
            {ICONS.more}
          </button>
        ) : null}
      </div>
      {/* Toujours présente pour que les lecteurs d'écran annoncent la confirmation. */}
      <span className="share-toast" role="status" style={{ "--x": `${bubbleX}px` } as CSSProperties}>
        {copied ? "Lien copié" : ""}
      </span>
    </div>
  );
}
