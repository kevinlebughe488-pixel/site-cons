import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead } from "@/lib/actions/community";
import { ActionForm, SubmitButton } from "@/components/forms";
import { formatDate } from "@/lib/format";
import type { Notification } from "@/lib/types";

export const metadata: Metadata = { title: "Notifications" };

/** Petit pictogramme par type de notification. */
function icon(kind: string): string {
  if (kind.startsWith("objectif") || kind === "campagne_financee") return "★";
  if (kind.startsWith("campagne_lancee") || kind === "campagne_publiee") return "▶";
  if (kind.startsWith("commentaire")) return "✎";
  if (kind === "message_club") return "✉";
  if (kind === "nouvelle" || kind === "actualite" || kind.startsWith("nouvelle_")) return "≡";
  if (kind.includes("suspendu") || kind.includes("refuse") || kind === "campagne_non_financee") return "!";
  if (kind.startsWith("club")) return "◆";
  return "•";
}

export default async function NotificationsPage() {
  const viewer = await requireViewer("/notifications");
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, link, campaign_id, club_id, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const items = (data ?? []) as Notification[];
  const unread = items.filter((n) => !n.read_at).length;
  const supporter = can(viewer.profile.role, "contribution:create");

  return (
    <div className="wrap page" style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)" }}>Notifications</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            {unread ? `${unread} non lue${unread > 1 ? "s" : ""}.` : "Tout est lu."}
          </p>
        </div>
        {unread ? (
          <ActionForm action={markAllNotificationsRead} className="inline-form">
            <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
              Tout marquer comme lu
            </SubmitButton>
          </ActionForm>
        ) : null}
      </div>
      {items.length ? (
        <ul className="notifs">
          {items.map((n) => (
            <li key={n.id} className={n.read_at ? "" : "unread"}>
              {/* Lien simple : un préchargement (Link) ouvrirait la notification, donc la marquerait lue, dès l'affichage. */}
              <a href={`/notifications/ouvrir/${n.id}`}>
                <span className="ic" aria-hidden="true">
                  {icon(n.kind)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <b>{n.title}</b>
                  {n.body ? <span className="small muted body">{n.body}</span> : null}
                  <time className="small muted" dateTime={n.created_at}>
                    {formatDate(n.created_at, true)}
                    {n.read_at ? "" : " · nouveau"}
                  </time>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel empty">
          <p>
            <b>Aucune notification pour l&apos;instant.</b>
          </p>
          <p className="small muted" style={{ marginTop: 6 }}>
            {supporter
              ? "Vous serez prévenu ici quand le club que vous suivez lance un projet, quand une campagne que vous soutenez atteint son objectif, publie une nouvelle ou vous écrit, et à sa clôture."
              : "Vous serez prévenu ici des décisions de l'équipe Tribune, des commentaires des supporters et des étapes de vos campagnes."}
          </p>
          {supporter ? (
            <Link className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} href="/campagnes">
              Voir les campagnes
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
