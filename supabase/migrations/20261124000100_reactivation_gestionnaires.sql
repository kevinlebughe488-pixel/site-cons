-- =====================================================================
-- 1. Club réactivé : ses campagnes reprennent.
--    Quand un club est suspendu, ses campagnes en cours le sont avec lui. À sa
--    réactivation, elles reprennent automatiquement et leur date de fin est
--    repoussée de la durée de la suspension. Une campagne suspendue à part par
--    l'équipe (pour ses propres raisons) reste suspendue jusqu'à sa propre
--    réactivation, qui repousse elle aussi la date de fin.
-- 2. Retrait d'un gestionnaire par un administrateur : motif obligatoire,
--    personne prévenue, journal d'audit ; jamais le dernier gestionnaire d'un
--    club ; la personne redevient supporter si elle ne gère aucun autre club.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Suspension retenue sur la campagne
-- ---------------------------------------------------------------------
alter table public.campaigns
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_with_club boolean not null default false;

-- Campagnes déjà suspendues : celles arrêtées avec leur club se reconnaissent à leur motif.
update public.campaigns
   set suspended_at = coalesce(suspended_at, updated_at),
       suspended_with_club = coalesce(review_note, '') like 'Club suspendu : %'
 where status = 'suspended';

-- Nombre de jours de suspension (jours de Kinshasa) : ce dont on repousse la date de fin.
create or replace function public.suspension_days(p_since timestamptz, p_fallback timestamptz) returns int
language sql stable set search_path = '' as $$
  select greatest(0, public.kinshasa_today() - (coalesce(p_since, p_fallback, now()) at time zone 'Africa/Kinshasa')::date);
$$;

-- Décisions sur un club : verify | request_changes | reject (équipe), suspend | reactivate (administrateur).
create or replace function public.review_club(p_club_id uuid, p_decision text, p_note text default null, p_criteria text[] default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_status text;
  v_new text;
  v_resumed int := 0;
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
    -- Les campagnes en cours s'arrêtent avec le club ; on retient quand et pourquoi.
    update public.campaigns
       set status = 'suspended', review_note = 'Club suspendu : ' || trim(p_note), suspended_at = now(), suspended_with_club = true
     where club_id = p_club_id and status = 'published';
  end if;
  if p_decision = 'reactivate' then
    -- Club réactivé : ses campagnes suspendues avec lui reprennent, et leur date de fin est
    -- repoussée de la durée de la suspension (les supporters ne perdent pas de jours de collecte).
    -- Contributeurs et club sont prévenus par campaigns_status_notify (« La campagne reprend »).
    -- Une campagne suspendue à part par l'équipe reste suspendue jusqu'à sa propre décision.
    update public.campaigns c
       set status = 'published',
           end_date = c.end_date + public.suspension_days(c.suspended_at, c.updated_at),
           review_note = null, suspended_at = null, suspended_with_club = false
     where c.club_id = p_club_id and c.status = 'suspended' and c.suspended_with_club;
    get diagnostics v_resumed = row_count;
  end if;

  perform public.write_audit('club.' || p_decision, 'club', p_club_id::text,
    jsonb_build_object('note', p_note, 'statut_precedent', v_status) || case when p_decision = 'verify'
      then jsonb_build_object('controles', to_jsonb(p_criteria))
      when p_decision = 'reactivate' then jsonb_build_object('campagnes_reprises', v_resumed)
      else '{}'::jsonb end);
end $$;

-- Suspension et réactivation d'une campagne seule (administrateur).
create or replace function public.set_campaign_suspension(p_campaign_id uuid, p_suspend boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.campaign_status;
  v_club_status public.club_status;
  v_days int := 0;
begin
  perform public.require_admin();
  select c.status, k.status into v_status, v_club_status
    from public.campaigns c join public.clubs k on k.id = c.club_id
   where c.id = p_campaign_id
     for update of c;
  if v_status is null then
    raise exception 'Campagne introuvable.';
  end if;
  if p_suspend and v_status <> 'published' then
    raise exception 'Seule une campagne en cours peut être suspendue.';
  end if;
  if not p_suspend and v_status <> 'suspended' then
    raise exception 'Cette campagne n''est pas suspendue.';
  end if;
  if not p_suspend and v_club_status <> 'verified' then
    raise exception 'Le club de cette campagne n''est pas vérifié (suspendu ?) : réactivez d''abord le club depuis la page Clubs.';
  end if;
  if p_suspend and coalesce(trim(p_note), '') = '' then
    raise exception 'Indiquez le motif de la suspension.';
  end if;
  if p_suspend then
    update public.campaigns
       set status = 'suspended', review_note = trim(p_note), suspended_at = now(), suspended_with_club = false
     where id = p_campaign_id;
  else
    -- Reprise : la date de fin est repoussée de la durée de la suspension.
    select public.suspension_days(suspended_at, updated_at) into v_days from public.campaigns where id = p_campaign_id;
    update public.campaigns
       set status = 'published', end_date = end_date + v_days, suspended_at = null, suspended_with_club = false
     where id = p_campaign_id;
  end if;
  perform public.write_audit(case when p_suspend then 'campagne.suspendue' else 'campagne.reactivee' end,
    'campaign', p_campaign_id::text,
    jsonb_build_object('note', p_note) || case when p_suspend then '{}'::jsonb else jsonb_build_object('jours_ajoutes', v_days) end);
end $$;

-- ---------------------------------------------------------------------
-- 2. Retrait d'un gestionnaire
-- ---------------------------------------------------------------------
create or replace function public.admin_remove_club_member(p_club_id uuid, p_user_id uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_club public.clubs;
  v_role public.club_member_role;
  v_email text;
  v_name text;
begin
  perform public.require_admin();
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Indiquez le motif du retrait : il est communiqué à la personne.';
  end if;
  select * into v_club from public.clubs where id = p_club_id for update;
  if v_club.id is null then
    raise exception 'Club introuvable.';
  end if;
  select member_role into v_role from public.club_members where club_id = p_club_id and user_id = p_user_id;
  if v_role is null then
    raise exception 'Ce compte ne gère pas ce club.';
  end if;
  if (select count(*) from public.club_members where club_id = p_club_id) <= 1 then
    raise exception 'C''est le dernier gestionnaire du club : ajoutez d''abord la personne qui le remplace, puis retirez-le.';
  end if;
  select email, trim(first_name || ' ' || last_name) into v_email, v_name from public.profiles where id = p_user_id;

  delete from public.club_members where club_id = p_club_id and user_id = p_user_id;
  -- Le compte qui avait ouvert le dossier part : le plus ancien gestionnaire restant le remplace.
  if v_role = 'owner' then
    update public.club_members set member_role = 'owner'
     where club_id = p_club_id
       and user_id = (select user_id from public.club_members where club_id = p_club_id order by created_at limit 1);
  end if;
  -- Sans autre club vérifié ou suspendu, la personne redevient supporter.
  if not exists (
    select 1 from public.club_members m join public.clubs c on c.id = m.club_id
     where m.user_id = p_user_id and c.status in ('verified', 'suspended')
  ) then
    update public.profiles set role = 'supporter' where id = p_user_id and role = 'club_manager';
  end if;

  perform public.notify(array[p_user_id], 'club_gestionnaire_retire', 'Vous ne gérez plus ' || v_club.name,
    trim(p_note), '/compte', null, p_club_id);
  perform public.notify(public.club_member_ids(p_club_id), 'club_gestionnaire_retire',
    coalesce(nullif(v_name, ''), 'Un gestionnaire') || ' ne gère plus le club', trim(p_note), '/club', null, p_club_id);
  perform public.write_audit('club.membre_retire', 'club', p_club_id::text,
    jsonb_build_object('utilisateur', p_user_id, 'email', v_email, 'note', trim(p_note)));
end $$;

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
revoke execute on function
  public.suspension_days(timestamptz, timestamptz),
  public.admin_remove_club_member(uuid, uuid, text)
from public, anon, authenticated;

grant execute on function public.admin_remove_club_member(uuid, uuid, text) to authenticated;
