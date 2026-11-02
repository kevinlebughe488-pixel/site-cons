import Link from "next/link";
import { deleteComment, reportComment } from "@/lib/actions/community";
import { ActionForm, SubmitButton } from "@/components/forms";
import { formatDate, plural } from "@/lib/format";
import type { CommentRow } from "@/lib/types";
import { CommentForm } from "./CommentForm";

type Props = {
  campaignId: string;
  slug: string;
  rows: CommentRow[];
  /** Le visiteur peut écrire (supporter, ou gestionnaire du club de la campagne). */
  canPost: boolean;
  loggedIn: boolean;
  /** Équipe Tribune : lien vers la modération. */
  staff: boolean;
  /** Campagne publique (on ne commente pas un brouillon). */
  open: boolean;
};

function CommentItem({ c, replies, props }: { c: CommentRow; replies: CommentRow[]; props: Props }) {
  return (
    <li id={`commentaire-${c.id}`} className={`comment${c.author_kind === "club" ? " from-club" : ""}`}>
      <div className="meta">
        <b>{c.author_label}</b>
        {c.author_kind === "club" ? <span className="badge club">Réponse du club</span> : c.is_backer ? <span className="badge">Contributeur</span> : null}
        <time className="small muted" dateTime={c.created_at}>
          {formatDate(c.created_at, true)}
        </time>
      </div>
      <p style={{ whiteSpace: "pre-line" }}>{c.body}</p>
      <div className="acts">
        {props.canPost && props.open && !c.parent_id ? (
          <details className="reply">
            <summary>Répondre</summary>
            <CommentForm campaignId={props.campaignId} slug={props.slug} parentId={c.id} compact />
          </details>
        ) : null}
        {props.loggedIn && !c.is_mine ? (
          <ActionForm action={reportComment} className="inline-form">
            <input type="hidden" name="comment_id" value={c.id} />
            <SubmitButton className="link-btn small" pendingLabel="…" confirm="Signaler ce commentaire à l'équipe Tribune ?">
              Signaler
            </SubmitButton>
          </ActionForm>
        ) : null}
        {c.is_mine ? (
          <ActionForm action={deleteComment} className="inline-form">
            <input type="hidden" name="comment_id" value={c.id} />
            <input type="hidden" name="slug" value={props.slug} />
            <SubmitButton className="link-btn small" pendingLabel="…" confirm="Retirer votre commentaire ?">
              Retirer
            </SubmitButton>
          </ActionForm>
        ) : null}
      </div>
      {replies.length ? (
        <ul className="comments replies">
          {replies.map((r) => (
            <CommentItem key={r.id} c={r} replies={[]} props={props} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Fil de commentaires d'une campagne : questions des supporters et réponses du club. */
export function Comments(props: Props) {
  const roots = props.rows.filter((r) => !r.parent_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const replies = new Map<string, CommentRow[]>();
  for (const r of props.rows) {
    if (!r.parent_id) continue;
    replies.set(r.parent_id, [...(replies.get(r.parent_id) ?? []), r]);
  }
  for (const list of replies.values()) list.sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div className="block" id="commentaires">
      <h2>Commentaires</h2>
      <p className="muted" style={{ marginBottom: 14 }}>
        Posez vos questions au club, encouragez l&apos;équipe. Votre prénom et l&apos;initiale de votre nom sont affichés ;
        les commentaires sont modérés par l&apos;équipe Tribune.
        {props.staff ? (
          <>
            {" "}
            <Link href="/admin/commentaires">Modération →</Link>
          </>
        ) : null}
      </p>
      {props.open ? (
        props.canPost ? (
          <CommentForm campaignId={props.campaignId} slug={props.slug} />
        ) : !props.loggedIn ? (
          <p className="panel small" style={{ padding: 16 }}>
            <Link href={`/connexion?suite=${encodeURIComponent(`/campagnes/${props.slug}#commentaires`)}`}>Connectez-vous</Link> ou{" "}
            <Link href="/inscription?profil=supporter">créez un compte supporter</Link> pour commenter.
          </p>
        ) : null
      ) : null}
      {roots.length ? (
        <>
          <p className="small muted" style={{ margin: "16px 0 8px" }}>
            {plural(props.rows.length, "commentaire")}
          </p>
          <ul className="comments">
            {roots.map((c) => (
              <CommentItem key={c.id} c={c} replies={replies.get(c.id) ?? []} props={props} />
            ))}
          </ul>
        </>
      ) : (
        <p className="muted small" style={{ marginTop: 14 }}>
          Pas encore de commentaire.
        </p>
      )}
    </div>
  );
}
