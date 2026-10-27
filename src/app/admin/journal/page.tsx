import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";

export const metadata: Metadata = { title: "Journal d'audit · Back-office" };

export default async function AuditLogPage(props: PageProps<"/admin/journal">) {
  await requirePermission("audit:read", "/admin/journal");
  const { type } = await props.searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("audit_log")
    .select("*, actor:profiles(first_name, last_name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (typeof type === "string" && /^[a-z_]+$/.test(type)) query = query.eq("entity_type", type);
  const { data } = await query;
  const entries = (data ?? []) as (AuditEntry & { actor: { first_name: string; last_name: string } | null })[];

  return (
    <>
      <h2>Journal d&apos;audit</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Chaque inscription, paiement et décision, avec la date et l&apos;auteur. Le journal n&apos;est modifiable par
        personne depuis l&apos;application.
      </p>
      <form className="filters" method="get">
        <select name="type" defaultValue={typeof type === "string" ? type : ""} aria-label="Type">
          <option value="">Tous les éléments</option>
          <option value="contribution">Contributions</option>
          <option value="campaign">Campagnes</option>
          <option value="club">Clubs</option>
          <option value="profile">Profils</option>
        </select>
        <button className="btn btn-ghost btn-sm" type="submit">
          Filtrer
        </button>
      </form>
      <div className="panel">
        <ul className="log">
          {entries.map((e) => (
            <li key={e.id}>
              <time>{formatDate(e.created_at, true)}</time>
              <span>
                <b>{e.actor ? `${e.actor.first_name} ${e.actor.last_name}` : "Système"}</b> — {e.action}{" "}
                <span className="muted small">
                  ({e.entity_type} {e.entity_id?.slice(0, 8)})
                  {Object.keys(e.details ?? {}).length ? ` · ${JSON.stringify(e.details)}` : ""}
                </span>
              </span>
            </li>
          ))}
          {entries.length === 0 ? <li className="muted">Aucune entrée.</li> : null}
        </ul>
      </div>
    </>
  );
}
