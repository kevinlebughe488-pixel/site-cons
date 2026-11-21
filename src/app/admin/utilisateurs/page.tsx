import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can, ROLE_LABELS, ROLES } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { reviewIdentity, setComplianceMember } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/visuals";
import { DOC_TYPES, KYC_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Comptes et rôles · Back-office" };

export default async function AdminUsersPage(props: PageProps<"/admin/utilisateurs">) {
  const { profile: me } = await requirePermission("user:read", "/admin/utilisateurs");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const kyc = sp.kyc === "pending";
  const roleFilter = typeof sp.role === "string" && (ROLES as readonly string[]).includes(sp.role) ? sp.role : "";

  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (kyc) query = query.eq("kyc_status", "pending");
  if (roleFilter) query = query.eq("role", roleFilter);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe.replace(/\D/g, "") || safe}%`);
  }
  const { data } = await query;
  const users = (data ?? []) as Profile[];

  return (
    <>
      <h2>Comptes et rôles</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        Chaque compte, son rôle et son niveau de vérification. Les rôles ne se changent pas à la main : un supporter qui
        inscrit son club devient gestionnaire quand le club est vérifié (ou quand vous l&apos;ajoutez comme gestionnaire
        d&apos;un club vérifié). Le seul geste possible ici est de faire entrer un compte supporter dans l&apos;équipe
        conformité, ou de l&apos;en faire sortir.
      </p>
      <form className="filters" method="get">
        <input type="text" name="q" defaultValue={q} placeholder="Nom, e-mail ou téléphone" aria-label="Rechercher" />
        <select name="role" defaultValue={roleFilter} aria-label="Rôle">
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <label className="check" style={{ alignItems: "center" }}>
          <input type="checkbox" name="kyc" value="pending" defaultChecked={kyc} />
          <span>Identités à vérifier</span>
        </label>
        <button className="btn btn-ghost btn-sm" type="submit">
          Filtrer
        </button>
      </form>
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Supporter</th>
              <th>Téléphone</th>
              <th>Inscrit le</th>
              <th>Vérification</th>
              <th>Rôle</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <b>
                    {u.first_name} {u.last_name}
                  </b>
                  <div className="small muted">{u.email}</div>
                  <div className="small muted">
                    {u.residence === "diaspora" ? "Diaspora" : "RDC"}
                    {u.city ? ` · ${u.city}` : ""}
                  </div>
                </td>
                <td className="num small" style={{ whiteSpace: "nowrap" }}>
                  {formatPhone(u.phone)}
                </td>
                <td className="num small">{formatDate(u.created_at)}</td>
                <td>
                  <Pill tone={u.kyc_status === "verified" ? "ok" : u.kyc_status === "pending" ? "warn" : u.kyc_status === "rejected" ? "bad" : "muted"}>
                    {KYC_LABELS[u.kyc_status]}
                  </Pill>
                  {u.kyc_doc_type ? (
                    <div className="small muted">
                      {DOC_TYPES[u.kyc_doc_type]} ••••{u.kyc_doc_last4}
                    </div>
                  ) : null}
                  {u.kyc_status === "pending" && can(me.role, "kyc:review") ? (
                    <ActionForm action={reviewIdentity} className="inline-form">
                      <input type="hidden" name="user_id" value={u.id} />
                      <SubmitButton className="btn btn-primary btn-sm" name="approve" value="true">
                        Vérifiée
                      </SubmitButton>
                      <SubmitButton className="btn btn-ghost btn-sm" name="approve" value="false">
                        Refuser
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                </td>
                <td>
                  <span className="small">{ROLE_LABELS[u.role]}</span>
                  {can(me.role, "user:set_role") && u.id !== me.id && (u.role === "supporter" || u.role === "compliance") ? (
                    <details className="role-change">
                      <summary className="small muted">{u.role === "supporter" ? "Équipe conformité…" : "Retirer de l'équipe…"}</summary>
                      <ActionForm action={setComplianceMember} className="inline-form">
                        <input type="hidden" name="user_id" value={u.id} />
                        <input type="hidden" name="join" value={u.role === "supporter" ? "true" : "false"} />
                        <SubmitButton
                          className="btn btn-ghost btn-sm"
                          pendingLabel="…"
                          confirm={
                            u.role === "supporter"
                              ? `Faire entrer ${u.first_name} ${u.last_name} dans l'équipe conformité ? Ce compte aura accès au back-office et ne pourra plus contribuer.`
                              : `Retirer ${u.first_name} ${u.last_name} de l'équipe conformité ? Le compte redevient supporter.`
                          }
                        >
                          {u.role === "supporter" ? "Nommer chargé·e de conformité" : "Redevient supporter"}
                        </SubmitButton>
                      </ActionForm>
                    </details>
                  ) : null}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Aucun compte ne correspond.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
