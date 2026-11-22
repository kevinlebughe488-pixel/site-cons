"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NavItem, NavLink } from "@/lib/navigation";

/** Chemin d'un lien, sans ancre ni paramètres, pour savoir s'il correspond à la page. */
const pathOf = (href: string) => href.split(/[?#]/)[0] || "/";

function isCurrent(href: string, pathname: string): boolean {
  const p = pathOf(href);
  return p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`);
}

function Chevron() {
  return (
    <svg className="chev" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Le lien de la page en cours : le plus précis qui lui correspond (ex. /club/campagnes plutôt que /club). */
function currentHref(links: NavLink[], pathname: string): string | null {
  const matches = links.filter((l) => !l.href.includes("#") && isCurrent(l.href, pathname));
  return matches.sort((a, b) => pathOf(b.href).length - pathOf(a.href).length)[0]?.href ?? null;
}

/**
 * Menu du haut regroupé en catégories : chaque catégorie s'ouvre sur ses liens
 * (clic, Entrée ou flèche bas ; Échap ou clic ailleurs pour fermer). Sur téléphone,
 * un bouton « Menu » ouvre toutes les catégories l'une sous l'autre.
 */
export function MainNav({ items, mobileLinks = [] }: { items: NavItem[]; /** Liens ajoutés en bas du menu téléphone (ex. Connexion). */ mobileLinks?: NavLink[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allLinks = items.flatMap((i) => (i.children ? i.children : i.href ? [{ href: i.href, label: i.label }] : []));
  const here = currentHref(allLinks, pathname);

  // Une nouvelle page ferme les menus.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
    setMobile(false);
  }

  useEffect(() => {
    if (!open && !mobile) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(null);
        setMobile(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mobile]);

  return (
    <div className="nav-wrap" ref={ref}>
      <nav className="main" aria-label="Navigation principale">
        {items.map((item) =>
          item.children ? (
            <div className="nav-item" key={item.label}>
              <button
                type="button"
                className={`nav-trigger${item.children.some((c) => c.href === here) ? " current" : ""}`}
                aria-expanded={open === item.label}
                aria-haspopup="true"
                onClick={() => setOpen(open === item.label ? null : item.label)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(item.label);
                  }
                }}
              >
                {item.label}
                <Chevron />
              </button>
              {open === item.label ? (
                <div className="nav-panel">
                  {item.children.map((c) => (
                    <Link key={c.href} href={c.href} aria-current={c.href === here ? "page" : undefined} onClick={() => setOpen(null)}>
                      <b>{c.label}</b>
                      {c.description ? <span>{c.description}</span> : null}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ) : item.href ? (
            <Link key={item.href} className={`nav-link${item.href === here ? " current" : ""}`} href={item.href} aria-current={item.href === here ? "page" : undefined}>
              {item.label}
            </Link>
          ) : null,
        )}
      </nav>

      <button type="button" className="menu-toggle" aria-expanded={mobile} aria-controls="menu-mobile" aria-label="Menu" onClick={() => setMobile(!mobile)}>
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
          {mobile ? (
            <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
        <span className="mt-label">Menu</span>
      </button>
      {mobile ? (
        <div className="menu-mobile" id="menu-mobile">
          {items.map((item) =>
            item.children ? (
              <div key={item.label} className="mm-group">
                <div className="mm-title">{item.label}</div>
                {item.children.map((c) => (
                  <Link key={c.href} href={c.href} aria-current={c.href === here ? "page" : undefined} onClick={() => setMobile(false)}>
                    {c.label}
                  </Link>
                ))}
              </div>
            ) : item.href ? (
              <div key={item.href} className="mm-group">
                <Link href={item.href} aria-current={item.href === here ? "page" : undefined} onClick={() => setMobile(false)}>
                  {item.label}
                </Link>
              </div>
            ) : null,
          )}
          {mobileLinks.length ? (
            <div className="mm-group">
              <div className="mm-title">Compte</div>
              {mobileLinks.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMobile(false)}>
                  {l.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
