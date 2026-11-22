-- =====================================================================
-- 1. Les clubs publient leurs nouvelles directement.
--    Avant : chaque nouvelle, actualité ou message aux contributeurs attendait
--    la relecture de l'équipe Tribune. Maintenant la publication est immédiate
--    (destinataires prévenus tout de suite) et l'équipe Tribune peut la retirer
--    après coup si elle pose problème (promesse non tenue, données
--    personnelles, propos injurieux…) : la nouvelle disparaît des pages
--    publiques et des notifications des supporters, et le club est prévenu
--    du motif. Garde-fou : 10 publications au plus par club sur 24 heures.
-- 2. Un dossier de club « en préparation » (jamais envoyé) peut être traité
--    par l'équipe : vérifié s'il est complet (mêmes conditions que l'envoi,
--    plus les trois points de contrôle), complété sur demande ou refusé.
-- 3. Rôles : un administrateur ne change plus librement le rôle d'un compte.
--    Supporter → gestionnaire de club se fait seul, à la vérification du club ;
--    le back-office ne sert qu'à nommer (ou retirer) un·e chargé·e de
--    conformité. Le rôle d'administrateur se donne par le script promote.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nouvelles publiées directement, retirées au besoin par l'équipe
-- ---------------------------------------------------------------------
create or replace function public.post_club_news(p_club_id uuid, p_campaign_id uuid, p_audience text, p_title text, p_body text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_club_status text;
  c public.campaigns;
  v_title text := trim(coalesce(p_title, ''));
  v_body text := trim(coalesce(p_body, ''));
  v_id uuid;
begin
  if not public.is_club_member(p_club_id) then
    raise exception 'Vous ne gérez pas ce club.' using errcode = '42501';
  end if;
  select status::text into v_club_status from public.clubs where id = p_club_id;
  if v_club_status is distinct from 'verified' then
    raise exception 'Le club doit être vérifié (et non suspendu) pour publier des nouvelles.';
  end if;
  if p_audience is null or p_audience not in ('public', 'contributors') then
    raise exception 'Choisissez les destinataires de la nouvelle.';
  end if;
  if p_campaign_id is not null then
    select * into c from public.campaigns where id = p_campaign_id;
    if c.id is null or c.club_id <> p_club_id then
      raise exception 'Campagne introuvable.';
    end if;
    if c.status not in ('published', 'suspended', 'funded', 'failed') then
      raise exception 'Les nouvelles sont possibles une fois la campagne publiée.';
    end if;
  elsif p_audience = 'contributors' then
    raise exception 'Un message aux contributeurs concerne une campagne : choisissez-la.';
  end if;
  if char_length(v_title) not between 3 and 140 or char_length(v_body) not between 10 and 4000 then
    raise exception 'Donnez un titre (3 à 140 caractères) et un texte (10 à 4 000 caractères).';
  end if;
  if (select count(*) from public.campaign_updates
       where club_id = p_club_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Dix nouvelles ont déjà été publiées en 24 heures. Patientez avant d''en publier d''autres.';
  end if;

  insert into public.campaign_updates (campaign_id, club_id, author_id, audience, title, body, status, published_at)
  values (p_campaign_id, p_club_id, v_uid, p_audience, v_title, v_body, 'published', now())
  returning id into v_id;
  perform public.write_audit(
    case when p_audience = 'contributors' then 'message.envoye' else 'nouvelle.publiee' end,
    case when p_campaign_id is null then 'club' else 'campaign' end,
    coalesce(p_campaign_id, p_club_id)::text,
    jsonb_build_object('titre', v_title, 'nouvelle', v_id, 'par', 'club'));
  return v_id;
end $$;

-- Lien d'une nouvelle (page de la campagne ou du club).
create or replace function public.campaign_update_link(u public.campaign_updates) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when u.campaign_id is not null then '/campagnes/' || (select slug from public.campaigns where id = u.campaign_id) || '#nouvelles'
    else '/clubs/' || (select slug from public.clubs where id = u.club_id) || '#actualites'
  end;
$$;

-- Publication (directe, ou d'une ancienne nouvelle en attente) : destinataires prévenus.
-- Refus ou retrait : l'auteur est prévenu du motif.
create or replace function public.campaign_updates_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_club public.clubs;
  v_link text := public.campaign_update_link(new);
  v_withdrawn boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_withdrawn := old.status = 'published';
  end if;
  select * into v_club from public.clubs where id = new.club_id;

  if new.status = 'published' then
    if new.audience = 'contributors' then
      perform public.notify(public.campaign_backer_ids(new.campaign_id), 'message_club',
        'Message de ' || v_club.name || ' aux contributeurs', new.title, v_link, new.campaign_id, new.club_id);
    elsif new.campaign_id is not null then
      perform public.notify(public.campaign_backer_ids(new.campaign_id), 'nouvelle',
        v_club.name || ' : ' || new.title, left(new.body, 200), v_link, new.campaign_id, new.club_id);
    else
      perform public.notify(public.club_audience_ids(new.club_id), 'actualite',
        v_club.name || ' : ' || new.title, left(new.body, 200), v_link, null, new.club_id);
    end if;
    -- Ancienne nouvelle relue par l'équipe : l'auteur apprend qu'elle est en ligne.
    if tg_op = 'UPDATE' then
      perform public.notify(array[new.author_id], 'nouvelle_publiee', 'Votre nouvelle est publiée', new.title,
        v_link, new.campaign_id, new.club_id);
    end if;
  elsif new.status = 'rejected' then
    perform public.notify(array[new.author_id], 'nouvelle_refusee',
      case when v_withdrawn then 'Publication retirée par l''équipe Tribune : ' else 'Nouvelle non publiée : ' end || new.title,
      coalesce(new.review_note, ''),
      case when new.campaign_id is null then '/club' else '/club/campagnes/' || new.campaign_id end,
      new.campaign_id, new.club_id);
  end if;
  return null;
end $$;

drop trigger if exists campaign_updates_notify on public.campaign_updates;
create trigger campaign_updates_notify
  after update of status on public.campaign_updates
  for each row when (old.status is distinct from new.status and old.status in ('pending', 'published'))
  execute function public.campaign_updates_notify();

drop trigger if exists campaign_updates_notify_insert on public.campaign_updates;
create trigger campaign_updates_notify_insert
  after insert on public.campaign_updates
  for each row when (new.status = 'published')
  execute function public.campaign_updates_notify();

-- Retrait d'une publication par l'équipe Tribune, avec un motif communiqué au club.
create function public.withdraw_campaign_update(p_update_id uuid, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.require_staff();
  u public.campaign_updates;
begin
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Indiquez au club pourquoi la publication est retirée.';
  end if;
  update public.campaign_updates
     set status = 'rejected', reviewed_by = v_staff, review_note = left(trim(p_note), 500)
   where id = p_update_id and status = 'published'
  returning * into u;
  if u.id is null then
    raise exception 'Publication introuvable ou déjà retirée.';
  end if;
  -- Les supporters prévenus ne gardent pas de notification vers une nouvelle qui n'existe plus.
  -- (Notifications créées dans la même transaction que la publication : même horodatage.)
  delete from public.notifications n
   where n.club_id = u.club_id
     and n.kind in ('nouvelle', 'actualite', 'message_club')
     and n.link = public.campaign_update_link(u)
     and n.created_at = u.published_at;
  perform public.write_audit('nouvelle.retiree',
    case when u.campaign_id is null then 'club' else 'campaign' end, coalesce(u.campaign_id, u.club_id)::text,
    jsonb_build_object('nouvelle', u.id, 'titre', u.title, 'destinataires', u.audience, 'note', trim(p_note)));
end $$;

-- ---------------------------------------------------------------------
-- 2. Dossier « en préparation » traité par l'équipe
-- ---------------------------------------------------------------------
-- Le dossier remplit-il les conditions d'envoi (document d'existence, siège,
-- représentant légal, compte de versement) ?
create or replace function public.club_dossier_complete(p_club_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
           select 1 from public.club_documents
            where club_id = p_club_id and kind in ('statuts', 'enregistrement', 'affiliation'))
     and exists (
           select 1 from public.club_private
            where club_id = p_club_id and payout_holder <> '' and rep_phone is not null and address <> '');
$$;

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
    when 'verify' then case when v_status in ('pending', 'draft') then 'verified' end
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
  -- Un dossier jamais envoyé n'est vérifié que s'il est complet, comme s'il avait été envoyé.
  if p_decision = 'verify' and v_status = 'draft' and not public.club_dossier_complete(p_club_id) then
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

-- Club vérifié depuis un dossier en préparation : ses gestionnaires sont prévenus aussi.
create or replace function public.clubs_status_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_members uuid[] := public.club_member_ids(new.id);
  v_new text := new.status::text;
  v_old text := old.status::text;
begin
  if v_new = 'verified' and v_old in ('pending', 'draft') then
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
-- 3. Rôles : seulement nommer ou retirer un·e chargé·e de conformité
-- ---------------------------------------------------------------------
create or replace function public.admin_set_role(p_user_id uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.require_admin();
  v_old public.app_role;
begin
  if p_user_id = v_admin then
    raise exception 'Vous ne pouvez pas changer votre propre rôle.';
  end if;
  select role into v_old from public.profiles where id = p_user_id for update;
  if v_old is null then
    raise exception 'Utilisateur introuvable.';
  end if;
  -- Gestionnaire de club : donné à la vérification du club. Administrateur : script promote.
  if not ((v_old = 'supporter' and p_role = 'compliance') or (v_old = 'compliance' and p_role = 'supporter')) then
    raise exception 'Ce changement de rôle n''est pas possible depuis le back-office : seul un compte supporter peut rejoindre l''équipe conformité (et la quitter).';
  end if;
  if p_role = 'compliance' and exists (select 1 from public.club_members where user_id = p_user_id) then
    raise exception 'Ce compte gère ou inscrit un club : il ne peut pas rejoindre l''équipe conformité.';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  perform public.write_audit('role.modifie', 'profile', p_user_id::text,
    jsonb_build_object('ancien', v_old, 'nouveau', p_role));
end $$;

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
revoke execute on function
  public.campaign_update_link(public.campaign_updates),
  public.withdraw_campaign_update(uuid, text),
  public.club_dossier_complete(uuid)
from public, anon, authenticated;

grant execute on function public.withdraw_campaign_update(uuid, text) to authenticated;
