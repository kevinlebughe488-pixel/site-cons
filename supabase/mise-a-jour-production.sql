-- =====================================================================
-- MISE À JOUR DE LA BASE EN PRODUCTION : à exécuter UNE SEULE FOIS dans
-- Supabase > SQL Editor (projet « tribune-supporters »), AVANT de fusionner
-- la pull request de ces changements. Reprend la migration :
--   - 20261123000100_inscription_campagnes.sql
-- (les migrations précédentes sont déjà appliquées). Tout passe ou rien
-- ne passe. Résultat attendu : « Success. No rows returned ».
-- =====================================================================

begin;

-- =====================================================================
-- Inscription des clubs et campagnes : règles alignées sur le parcours.
--
-- 1. La pièce d'identité du représentant légal devient obligatoire pour
--    envoyer un dossier de club et pour qu'un dossier non (re)envoyé soit
--    vérifié par l'équipe (elle était seulement conseillée). Les dossiers déjà
--    envoyés restent vérifiables tels quels.
-- 2. L'équipe Tribune n'envoie plus de fichiers à la place des clubs
--    (logo, documents, devis, photos) : les règles d'accès aux fichiers ne
--    changent pas (envois faits par le serveur), seules les actions de
--    l'application le refusent désormais.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pièce d'identité du représentant légal exigée
-- ---------------------------------------------------------------------
create or replace function public.club_dossier_complete(p_club_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
           select 1 from public.club_documents
            where club_id = p_club_id and kind in ('statuts', 'enregistrement', 'affiliation'))
     and exists (
           select 1 from public.club_documents
            where club_id = p_club_id and kind = 'identite_representant')
     and exists (
           select 1 from public.club_private
            where club_id = p_club_id and payout_holder <> '' and rep_phone is not null and address <> '');
$$;

create or replace function public.submit_club_registration(p_club_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status text;
begin
  perform public.require_user();
  if not public.is_club_member(p_club_id) then
    raise exception 'Vous ne gérez pas ce club.' using errcode = '42501';
  end if;
  select status::text into v_status from public.clubs where id = p_club_id for update;
  if v_status not in ('draft', 'changes_requested') then
    raise exception 'Ce dossier a déjà été envoyé.';
  end if;
  if not exists (
    select 1 from public.club_documents
     where club_id = p_club_id and kind in ('statuts', 'enregistrement', 'affiliation')
  ) then
    raise exception 'Ajoutez au moins un document attestant l''existence du club : statuts, enregistrement officiel ou attestation d''affiliation.';
  end if;
  if not exists (
    select 1 from public.club_documents where club_id = p_club_id and kind = 'identite_representant'
  ) then
    raise exception 'Ajoutez la pièce d''identité du représentant légal (carte d''électeur, passeport ou permis de conduire).';
  end if;
  if not exists (
    select 1 from public.club_private where club_id = p_club_id and payout_holder <> '' and rep_phone is not null and address <> ''
  ) then
    raise exception 'Complétez l''adresse du siège, le représentant légal et le compte de versement avant d''envoyer le dossier.';
  end if;

  update public.clubs set status = 'pending', submitted_at = now() where id = p_club_id;
  perform public.write_audit('club.dossier_envoye', 'club', p_club_id::text,
    jsonb_build_object('documents', (select count(*) from public.club_documents where club_id = p_club_id)));
end $$;

-- Même fonction de décision, avec la liste à jour de ce qui manque à un dossier incomplet.
-- Décisions : verify | request_changes | reject (équipe), suspend | reactivate (administrateur).
create or replace function public.review_club(p_club_id uuid, p_decision text, p_note text default null, p_criteria text[] default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_status text;
  v_new text;
begin
  if p_decision in ('verify', 'request_changes', 'reject') then
    v_actor := public.require_staff();
  elsif p_decision in ('suspend', 'reactivate') then
    v_actor := public.require_admin();
  else
    raise exception 'Décision inconnue.';
  end if;

  select status::text into v_status from public.clubs where id = p_club_id for update;
  if v_status is null then
    raise exception 'Club introuvable.';
  end if;

  v_new := case p_decision
    when 'verify' then case when v_status in ('pending', 'draft', 'changes_requested') then 'verified' end
    when 'request_changes' then case when v_status in ('pending', 'draft') then 'changes_requested' end
    when 'reject' then case when v_status in ('pending', 'changes_requested', 'draft') then 'rejected' end
    when 'suspend' then case when v_status = 'verified' then 'suspended' end
    when 'reactivate' then case when v_status = 'suspended' then 'verified' end
  end;
  if v_new is null then
    raise exception 'Cette décision n''est pas possible pour un club au statut « % ».', v_status;
  end if;
  if p_decision in ('request_changes', 'reject', 'suspend') and coalesce(trim(p_note), '') = '' then
    raise exception 'Indiquez le motif de la décision : il est communiqué au club.';
  end if;
  if p_decision = 'verify' and not coalesce(p_criteria, '{}') @> array['existence', 'representant', 'compte'] then
    raise exception 'Pour vérifier le club, confirmez les trois points de contrôle : existence du club, représentant légal et compte de versement.';
  end if;
  -- Un dossier que le club n'a pas (re)envoyé n'est vérifié que s'il est complet, comme s'il avait été envoyé.
  if p_decision = 'verify' and v_status in ('draft', 'changes_requested') and not public.club_dossier_complete(p_club_id) then
    raise exception 'Ce dossier est incomplet : il faut un document attestant l''existence du club, la pièce d''identité du représentant légal, l''adresse du siège, le représentant légal et le compte de versement.';
  end if;

  update public.clubs
     set status = v_new::public.club_status, review_note = nullif(trim(p_note), ''), reviewed_by = v_actor, reviewed_at = now(),
         submitted_at = coalesce(submitted_at, case when v_status = 'draft' then now() end)
   where id = p_club_id;

  if v_new = 'verified' then
    update public.profiles p set role = 'club_manager'
      from public.club_members m
     where m.club_id = p_club_id and m.user_id = p.id and p.role = 'supporter';
  end if;
  if v_new = 'suspended' then
    update public.campaigns set status = 'suspended', review_note = 'Club suspendu : ' || trim(p_note)
     where club_id = p_club_id and status = 'published';
  end if;

  perform public.write_audit('club.' || p_decision, 'club', p_club_id::text,
    jsonb_build_object('note', p_note, 'statut_precedent', v_status) || case when p_decision = 'verify'
      then jsonb_build_object('controles', to_jsonb(p_criteria)) else '{}'::jsonb end);
end $$;

-- ---------------------------------------------------------------------
-- 3. L'équipe Tribune est prévenue de ce qu'elle doit traiter
-- ---------------------------------------------------------------------
-- Avant, un dossier de club envoyé ou une campagne envoyée en revue n'apparaissait
-- que dans les compteurs du tableau de bord : la conformité et les administrateurs
-- reçoivent maintenant une notification, avec le lien vers la page à traiter.
create or replace function public.staff_ids() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(id), '{}') from public.profiles where role in ('compliance', 'admin');
$$;

create or replace function public.clubs_notify_staff() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.notify(public.staff_ids(), 'club_a_verifier',
    case when old.status = 'changes_requested' then 'Dossier de club renvoyé : ' else 'Nouveau dossier de club : ' end || new.name,
    'Le club a envoyé son dossier pour vérification.', '/admin/clubs?statut=pending', null, new.id);
  return null;
end $$;

drop trigger if exists clubs_notify_staff on public.clubs;
create trigger clubs_notify_staff
  after update of status on public.clubs
  for each row when (new.status = 'pending' and old.status is distinct from 'pending')
  execute function public.clubs_notify_staff();

create or replace function public.campaigns_notify_staff() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_club text;
begin
  select name into v_club from public.clubs where id = new.club_id;
  perform public.notify(public.staff_ids(), 'campagne_a_instruire',
    case when old.status = 'changes_requested' then 'Campagne corrigée à instruire : ' else 'Campagne à instruire : ' end || new.title,
    coalesce(v_club, 'Un club') || ' demande la publication (objectif ' || public.fmt_money(new.goal_amount, new.currency) || ').',
    '/admin/campagnes/' || new.id, new.id, new.club_id);
  return null;
end $$;

drop trigger if exists campaigns_notify_staff on public.campaigns;
create trigger campaigns_notify_staff
  after update of status on public.campaigns
  for each row when (new.status = 'in_review' and old.status is distinct from 'in_review')
  execute function public.campaigns_notify_staff();

revoke execute on function
  public.staff_ids(),
  public.clubs_notify_staff(),
  public.campaigns_notify_staff()
from public, anon, authenticated;

commit;
