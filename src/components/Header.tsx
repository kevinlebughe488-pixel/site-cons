import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { navigationFor } from "@/lib/navigation";
import { signOut } from "@/lib/actions/auth";
import { NavLinks } from "@/components/NavLinks";

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
        <NavLinks items={nav.items} />
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
              <Link className="account" href="/compte" title={nav.accountLabel}>
                <span className="avatar">
                  {(viewer.profile.first_name[0] + viewer.profile.last_name[0]).toUpperCase()}
                </span>
                <span className="small">{viewer.profile.first_name}</span>
              </Link>
              <form action={signOut}>
                <button className="link-btn" type="submit">
                  Déconnexion
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="link-btn" href="/connexion">
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
