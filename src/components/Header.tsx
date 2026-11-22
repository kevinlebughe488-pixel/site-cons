import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { navigationFor } from "@/lib/navigation";
import { ROLE_LABELS } from "@/lib/rbac";
import { MainNav } from "@/components/MainNav";
import { UserMenu } from "@/components/UserMenu";

export async function Header() {
  const viewer = await getViewer();
  const nav = navigationFor(viewer);

  return (
    <header className="top">
      <div className="wrap">
        <Link className="logo" href={nav.home} aria-label="Tribune, accueil">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <rect x="1" y="1" width="32" height="32" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M1 17h32" stroke="currentColor" strokeWidth="2" />
            <circle cx="17" cy="17" r="6" fill="none" stroke="var(--gold)" strokeWidth="2.4" />
          </svg>
          <span>
            Tribune<small>{nav.tagline}</small>
          </span>
        </Link>
        <MainNav
          items={nav.items}
          mobileLinks={viewer ? [] : [{ href: "/connexion", label: "Connexion" }, { href: "/inscription", label: "Créer un compte" }]}
        />
        <div className="user-menu">
          {viewer ? (
            <>
              <Link
                className="bell"
                href="/notifications"
                aria-label={viewer.unread ? `Notifications : ${viewer.unread} non lue${viewer.unread > 1 ? "s" : ""}` : "Notifications"}
                title="Notifications"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                  <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
                  <path d="M10 20a2 2 0 0 0 4 0" />
                </svg>
                {viewer.unread ? <span className="count">{viewer.unread > 99 ? "99+" : viewer.unread}</span> : null}
              </Link>
              <UserMenu
                initials={(viewer.profile.first_name[0] + viewer.profile.last_name[0]).toUpperCase()}
                firstName={viewer.profile.first_name}
                role={ROLE_LABELS[viewer.profile.role]}
                links={nav.accountLinks}
              />
            </>
          ) : (
            <>
              <Link className="btn btn-ghost-light btn-sm hide-sm" href="/connexion">
                Connexion
              </Link>
              <Link className="btn btn-gold btn-sm" href="/inscription">
                S&apos;inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
