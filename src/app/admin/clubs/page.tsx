import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ClubDossier, type ClubRow, type DossierRow, type HistoryEntry } from "./ClubDossier";
import { CLUB_STATUS_LABELS } from "@/lib/labels";
import { isDossierComplete, requiredItems, unwrapPrivate } from "@/lib/club-dossier";
import type { ClubPrivate, ClubStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Clubs · Back-office" };

const TABS: { status: ClubStatus; label: string; hint: string }[] = [
  { status: "pending", label: "À vérifier", hint: "Dossiers envoyés par les clubs : une décision de l'équipe est attendue." },
  {
    status: "changes_requested",
    label: "Compléments demandés",
    hint: "Le club complète son dossier puis le renvoie : il revient alors dans « À vérifier ».",
  },
  {
    status: "draft",
    label: "Dossiers en préparation",
    hint: "Dossiers que le club n'a pas encore envoyés. Un dossier déjà complet peut être vérifié sans attendre.",
  },
  { status: "verified", label: "Vérifiés", hint: "Clubs publics, autorisés à déposer des campagnes." },
  { status: "suspended", label: "Suspendus", hint: "Clubs arrêtés par un administrateur, avec leurs campagnes en cours." },
  { status: "rejected", label: "Refusés", hint: "Demandes refusées. Le demandeur peut inscrire un autre club." },
];

export default async function AdminClubsPage(props: PageProps<"/admin/clubs">) {
  const { profile } = await requirePermission("backoffice:access", "/admin/clubs");
  const role = profile.role;
  const { statut } = await props.searchParams;
  const status = TABS.some((t) => t.status === statut) ? (statut as ClubStatus) : "pending";
  const tab = TABS.find((t) => t.status === status)!;

  const supabase = await createClient();
  const [{ data, error }, { data: all }, { data: drafts }] = await Promise.all([
    supabase
      .from("clubs")
      .select(
        "*, reviewer:profiles!clubs_reviewed_by_fkey(first_name, last_name), members:club_members(member_role, created_at, user_id, profile:profiles(first_name, last_name, email, phone, role)), private:club_private(*), documents:club_documents(id, club_id, kind, file_name, mime_type, size_bytes, created_at, uploaded_by, uploader:profiles(first_name, last_name, role))",
      )
      .eq("status", status)
      .order(status === "pending" ? "submitted_at" : "created_at", { ascending: status === "pending" }),
    supabase.from("clubs").select("status"),
    // Dossiers en préparation : combien sont déjà complets (vérifiables sans attendre l'envoi) ?
    supabase
      .from("clubs")
      .select("documents:club_documents(kind), private:club_private(address, rep_phone, payout_holder)")
      .eq("status", "draft"),
  ]);
  const clubs = (data ?? []) as unknown as ClubRow[];
  const counts = new Map<string, number>();
  for (const row of (all ?? []) as { status: string }[]) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  const completeDrafts = ((drafts ?? []) as unknown as { documents: { kind: string }[]; private: ClubPrivate | ClubPrivate[] | null }[]).filter(
    (row) => isDossierComplete(unwrapPrivate(row.private), row.documents.map((d) => d.kind)),
  ).length;

  // Historique de chaque dossier (journal d'audit), du plus récent au plus ancien.
  const ids = clubs.map((c) => c.id);
  const { data: logRows } = ids.length
    ? await supabase
        .from("audit_log")
        .select("entity_id, action, details, created_at, actor:profiles(first_name, last_name, role)")
        .eq("entity_type", "club")
        .in("entity_id", ids)
        .like("action", "club.%")
        .order("created_at", { ascending: false })
        .limit(600)
    : { data: [] };
  const history = new Map<string, HistoryEntry[]>();
  for (const e of (logRows ?? []) as unknown as HistoryEntry[]) history.set(e.entity_id, [...(history.get(e.entity_id) ?? []), e]);

  // Un dossier complet passe en premier (dossiers en préparation, compléments demandés).
  const rows: DossierRow[] = clubs
    .map((c) => {
      const priv = unwrapPrivate(c.private);
      const docs = [...(c.documents ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const required = requiredItems(priv, docs.map((d) => d.kind));
      return { c, priv, docs, required, complete: required.every((i) => i.ok), log: history.get(c.id) ?? [] };
    })
    .sort((a, b) => Number(b.complete) - Number(a.complete));

  return (
    <>
      <h2>Clubs et inscriptions</h2>
      <p className="muted" style={{ marginBottom: 14 }}>
        L&apos;inscription d&apos;un club n&apos;ouvre aucun droit : vérifiez son existence (documents), son représentant
        légal et son compte de versement avant de l&apos;autoriser à collecter. Chaque décision est communiquée au club
        et inscrite au journal d&apos;audit.
      </p>
      <details className="box cr-guide">
        <summary>Comment se déroule une inscription ?</summary>
        <ol className="small">
          <li>
            Le club remplit son dossier : <b>Dossiers en préparation</b>. S&apos;il est complet, vous pouvez déjà le
            vérifier.
          </li>
          <li>
            Le club l&apos;envoie : <b>À vérifier</b>. Vous vérifiez le club, demandez des compléments ou refusez la
            demande.
          </li>
          <li>
            Compléments demandés : le club corrige et renvoie son dossier, qui revient dans <b>À vérifier</b>. Un dossier
            complété entre-temps (pièce reçue et ajoutée par vous) peut aussi être vérifié directement.
          </li>
          <li>
            Club vérifié : il est public et peut déposer des campagnes. Un administrateur peut le suspendre (et le
            réactiver).
          </li>
        </ol>
        <p className="small muted">
          Obligatoire pour vérifier : un document attestant l&apos;existence du club, l&apos;adresse du siège, le
          représentant légal et le compte de versement, puis les trois points de contrôle. Le logo et les autres pièces
          sont facultatifs. Le logo est choisi par le club : l&apos;équipe ne peut pas l&apos;envoyer ni le changer.
        </p>
      </details>
      <nav className="tabs" aria-label="Filtrer par statut">
        {TABS.map((t) => (
          <Link key={t.status} href={`/admin/clubs?statut=${t.status}`} aria-current={t.status === status ? "page" : undefined}>
            {t.label} ({counts.get(t.status) ?? 0})
            {t.status === "draft" && completeDrafts ? ` · ${completeDrafts} complet${completeDrafts > 1 ? "s" : ""}` : ""}
          </Link>
        ))}
      </nav>
      <p className="small muted" style={{ margin: "-6px 0 16px" }}>
        {tab.hint}
      </p>
      {error ? (
        <p className="flash error" role="alert">
          Lecture des dossiers impossible : {error.message}
        </p>
      ) : null}

      <div style={{ display: "grid", gap: 14 }}>
        {rows.map((row) => (
          <ClubDossier key={row.c.id} row={row} role={role} tab={status} single={rows.length === 1} />
        ))}
        {rows.length === 0 && !error ? (
          <div className="panel empty">
            <p className="muted">Aucun club avec le statut « {CLUB_STATUS_LABELS[status]} ».</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
