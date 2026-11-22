"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/club", label: "Tableau de bord", exact: true },
  { href: "/club/campagnes", label: "Campagnes" },
  { href: "/club/actualites", label: "Actualités" },
  { href: "/club/profil", label: "Profil du club" },
];

/** Rubriques de l'espace d'un club vérifié. */
export function ClubNav({ canCreate, publicHref }: { canCreate: boolean; publicHref: string | null }) {
  const pathname = usePathname();
  return (
    <div className="club-nav">
      <div className="wrap">
        <nav className="club-tabs" aria-label="Rubriques de l'espace club">
          {TABS.map((t) => {
            const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
            return (
              <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined}>
                {t.label}
              </Link>
            );
          })}
        </nav>
        <div className="club-nav-actions">
          {publicHref ? (
            <Link className="btn btn-ghost btn-sm" href={publicHref}>
              Page publique
            </Link>
          ) : null}
          {canCreate ? (
            <Link className="btn btn-primary btn-sm" href="/club/campagnes/nouvelle">
              Nouvelle campagne
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
