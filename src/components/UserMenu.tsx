"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavLink } from "@/lib/navigation";

/**
 * Menu du compte : initiales et prénom, qui s'ouvrent sur les liens personnels et la
 * déconnexion. Regroupés ici, ils ne prennent plus de place dans le menu du haut.
 */
export function UserMenu({
  initials,
  firstName,
  role,
  links,
}: {
  initials: string;
  firstName: string;
  /** Rôle affiché en tête du menu (Supporter, Gestionnaire de club…). */
  role: string;
  links: NavLink[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="nav-item account-menu" ref={ref}>
      <button type="button" className="account" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
        <span className="avatar">{initials}</span>
        <span className="small account-name">{firstName}</span>
        <svg className="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="nav-panel right">
          <div className="np-head">
            <b>{firstName}</b>
            <span>{role}</span>
          </div>
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              <b>{l.label}</b>
            </Link>
          ))}
          <Link href="/notifications" onClick={() => setOpen(false)}>
            <b>Notifications</b>
          </Link>
          {/* Vrai formulaire (rechargement complet) : voir app/auth/deconnexion/route.ts. */}
          <form action="/auth/deconnexion" method="post">
            <button type="submit" className="np-logout">
              Déconnexion
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
