"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ClubAvatar, LogoEdit, PencilIcon, type LogoClub } from "@/components/LogoEdit";

type MenuClub = LogoClub & { name: string; slug: string; status: string; statusLabel: string };

/**
 * Logo du club dans l'en-tête de l'espace club, avec un crayon : un clic ouvre un
 * menu de profil où l'on change le logo sur place, et qui mène au profil du club.
 */
export function ClubCrestMenu({ club }: { club: MenuClub }) {
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
    <div className="crest-menu" ref={ref}>
      <button
        type="button"
        className="crest-trigger"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Profil du club et logo"
        title="Profil du club et logo"
        onClick={() => setOpen(!open)}
      >
        <ClubAvatar club={club} size={64} />
        <span className="logo-pencil" aria-hidden="true">
          <PencilIcon size={12} />
        </span>
      </button>
      {open ? (
        <div className="nav-panel crest-panel">
          <div className="crest-panel-head">
            <LogoEdit club={club} size={76} showStatus={false} />
            <div style={{ minWidth: 0 }}>
              <b>{club.name}</b>
              <span>{club.statusLabel}</span>
              <span className="small muted">Touchez le logo pour le changer.</span>
            </div>
          </div>
          <Link href="/club/profil" onClick={() => setOpen(false)}>
            <b>Profil du club</b>
            <span>Identité, siège, représentant, compte, présentation, documents</span>
          </Link>
          {club.status === "verified" ? (
            <Link href={`/clubs/${club.slug}`} onClick={() => setOpen(false)}>
              <b>Page publique du club</b>
              <span>Ce que voient les supporters</span>
            </Link>
          ) : null}
          <Link href="/club" onClick={() => setOpen(false)}>
            <b>Tableau de bord</b>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
