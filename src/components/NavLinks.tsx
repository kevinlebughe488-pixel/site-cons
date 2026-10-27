"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // Le lien actif est celui dont l'adresse correspond le plus précisément à la page.
  const matches = items.filter((i) => pathname === i.href || (i.href !== "/" && pathname.startsWith(`${i.href}/`)));
  const current = matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="main" aria-label="Navigation principale">
      {items.map((item) => {
        const active = item.href === current;
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
