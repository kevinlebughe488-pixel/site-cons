"use client";

import { postComment } from "@/lib/actions/community";
import { Flash, SubmitButton, useFormAction } from "@/components/forms";

export function CommentForm({ campaignId, slug, parentId, compact = false }: { campaignId: string; slug: string; parentId?: string; compact?: boolean }) {
  const { state, formProps } = useFormAction(postComment, { resetOnSuccess: true });
  const id = `comment-${parentId ?? "new"}`;
  return (
    <form {...formProps} className="form comment-form" style={{ gap: 10 }}>
      <Flash state={state} />
      <input type="hidden" name="campaign_id" value={campaignId} />
      <input type="hidden" name="slug" value={slug} />
      {parentId ? <input type="hidden" name="parent_id" value={parentId} /> : null}
      <label htmlFor={id} className="sr-only">
        {parentId ? "Votre réponse" : "Votre commentaire"}
      </label>
      <textarea
        id={id}
        name="body"
        maxLength={1000}
        required
        style={{ minHeight: compact ? 70 : 90 }}
        placeholder={parentId ? "Votre réponse…" : "Une question, un encouragement pour le club…"}
        defaultValue={state.error ? state.fields?.body : undefined}
      />
      <div>
        <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Publication…">
          {parentId ? "Répondre" : "Publier"}
        </SubmitButton>
      </div>
    </form>
  );
}
