-- =====================================================================
-- MISE À JOUR DE LA BASE EN PRODUCTION : à exécuter UNE SEULE FOIS dans
-- Supabase > SQL Editor (projet « tribune-supporters »), AVANT de fusionner
-- la pull request de ces changements.
-- Reprend la migration :
--   - 20261122000200_back_office_clubs.sql
-- (les migrations précédentes sont déjà appliquées). Tout passe ou rien
-- ne passe. Résultat attendu : « Success. No rows returned ».
-- =====================================================================

begin;

-- =====================================================================
-- Back-office : vérification des clubs, règles rendues cohérentes.
--
-- 1. Un dossier « compléments demandés » complet peut être vérifié par
--    l'équipe sans attendre que le club le renvoie (par exemple quand la
--    pièce manquante a été reçue autrement et ajoutée par l'équipe), aux
--    mêmes conditions qu'un dossier en préparation : complet et trois
--    points de contrôle confirmés. Les gestionnaires sont prévenus.
-- 2. Ajout d'un gestionnaire à un club vérifié : refusé si le compte gère
--    déjà un club (ou a une demande en cours), comme pour l'inscription ;
--    refusé s'il est déjà gestionnaire de ce club. La personne ajoutée est
--    prévenue.
-- 3. Une campagne suspendue n'est réactivée que si son club est vérifié :
--    la suspension d'un club suspend ses campagnes en cours, elles ne
--    doivent pas pouvoir collecter tant que le club reste suspendu (même
--    règle que la publication d'une campagne).
--
-- Les droits de lecture de l'équipe (club_private, club_documents,
-- club_members, profiles, audit_log) sont inchangés : ils permettent déjà
-- à la conformité et aux administrateurs de lire tout le dossier.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Vérification d'un dossier « compléments demandés » complet
-- ---------------------------------------------------------------------
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
    raise exception 'Ce dossier est incomplet : il faut un document attestant l''existence du club, l''adresse du siège, le représentant légal et le compte de versement.';
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

-- Club vérifié (dossier envoyé, en préparation ou en attente de compléments) : ses gestionnaires sont prévenus.
create or replace function public.clubs_status_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_members uuid[] := public.club_member_ids(new.id);
  v_new text := new.status::text;
  v_old text := old.status::text;
begin
  if v_new = 'verified' and v_old in ('pending', 'draft', 'changes_requested') then
    perform public.notify(v_members, 'club_verifie', 'Votre club est vérifié',
      new.name || ' est vérifié par l''équipe Tribune. Vous pouvez déposer votre première campagne.', '/club', null, new.id);
  elsif v_new = 'verified' and v_old = 'suspended' then
    perform public.notify(v_members, 'club_reactive', 'Votre club est réactivé',
      new.name || ' peut de nouveau collecter.', '/club', null, new.id);
  elsif v_new = 'changes_requested' then
    perform public.notify(v_members, 'club_complements', 'Compléments demandés pour votre dossier',
      coalesce(new.review_note, 'L''équipe Tribune a besoin d''informations ou de documents supplémentaires.'), '/club', null, new.id);
  elsif v_new = 'rejected' then
    perform public.notify(v_members, 'club_refuse', 'Demande d''inscription refusée', coalesce(new.review_note, ''), '/club', null, new.id);
  elsif v_new = 'suspended' then
    perform public.notify(v_members, 'club_suspendu', 'Votre club est suspendu', coalesce(new.review_note, ''), '/club', null, new.id);
  end if;
  return null;
end $$;

-- ---------------------------------------------------------------------
-- 2. Ajout d'un gestionnaire à un club vérifié
-- ---------------------------------------------------------------------
create or replace function public.admin_add_club_member(p_club_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_club public.clubs;
  v_email text;
begin
  perform public.require_admin();
  select * into v_club from public.clubs where id = p_club_id;
  if v_club.id is null or v_club.status <> 'verified' then
    raise exception 'Le club doit être vérifié.';
  end if;
  select email into v_email from public.profiles where id = p_user_id;
  if not found then
    raise exception 'Utilisateur introuvable.';
  end if;
  if exists (select 1 from public.club_members where club_id = p_club_id and user_id = p_user_id) then
    raise exception 'Ce compte est déjà gestionnaire de ce club.';
  end if;
  -- Même règle qu'à l'inscription : un compte ne gère qu'un club (une demande refusée ne compte pas).
  if exists (
    select 1 from public.club_members m join public.clubs c on c.id = m.club_id
     where m.user_id = p_user_id and c.status::text <> 'rejected'
  ) then
    raise exception 'Ce compte gère déjà un autre club (ou une demande d''inscription est en cours) : il ne peut pas gérer ce club aussi.';
  end if;

  -- Un compte de l'équipe Tribune est refusé par le déclencheur club_members_check_role.
  insert into public.club_members (club_id, user_id, member_role) values (p_club_id, p_user_id, 'manager');
  update public.profiles set role = 'club_manager' where id = p_user_id and role = 'supporter';
  perform public.notify(array[p_user_id], 'club_gestionnaire', 'Vous gérez maintenant ' || v_club.name,
    'L''équipe Tribune vous a ajouté comme gestionnaire du club. Vous pouvez déposer ses campagnes et publier ses nouvelles.',
    '/club', null, p_club_id);
  perform public.write_audit('club.membre_ajoute', 'club', p_club_id::text,
    jsonb_build_object('utilisateur', p_user_id, 'email', v_email));
end $$;

-- ---------------------------------------------------------------------
-- 3. Réactivation d'une campagne : seulement si le club est vérifié
-- ---------------------------------------------------------------------
create or replace function public.set_campaign_suspension(p_campaign_id uuid, p_suspend boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.campaign_status;
  v_club_status public.club_status;
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
  update public.campaigns
     set status = case when p_suspend then 'suspended'::public.campaign_status else 'published'::public.campaign_status end,
         review_note = case when p_suspend then trim(p_note) else review_note end
   where id = p_campaign_id;
  perform public.write_audit(case when p_suspend then 'campagne.suspendue' else 'campagne.reactivee' end,
    'campaign', p_campaign_id::text, jsonb_build_object('note', p_note));
end $$;

commit;
