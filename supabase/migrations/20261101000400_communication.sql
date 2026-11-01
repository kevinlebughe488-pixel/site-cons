-- =====================================================================
-- Communication autour des campagnes.
--
-- 1. Notifications dans le site : lancement d'un projet par un club suivi,
--    objectif atteint, nouvelles et messages du club, suspension, clôture,
--    décisions de l'équipe Tribune. Créées par la base elle-même
--    (déclencheurs), jamais par le navigateur.
-- 2. Commentaires sur les campagnes publiques : supporters et réponses du
--    club, signalements, modération par l'équipe Tribune.
-- 3. Actualités des clubs (liées ou non à une campagne) et messages
--    réservés aux contributeurs d'une campagne. Comme les nouvelles, ils
--    sont relus par l'équipe avant publication.
-- 4. Ambassadeurs : chaque compte a un code de partage ; une contribution
--    faite après avoir suivi ce lien lui est attribuée.
-- 5. Classements publics (clubs les plus soutenus, ambassadeurs),
--    calculés par la base sans exposer de donnée personnelle.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Notifications
-- ---------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (char_length(kind) between 2 and 40),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 600),
  -- Lien interne uniquement (jamais vers un autre site).
  link text check (link ~ '^/[^/\\]' and char_length(link) <= 300),
  campaign_id uuid references public.campaigns (id) on delete cascade,
  club_id uuid references public.clubs (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- Envoi groupé : une notification par destinataire, sans doublon.
create function public.notify(
  p_users uuid[], p_kind text, p_title text, p_body text, p_link text,
  p_campaign_id uuid default null, p_club_id uuid default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, link, campaign_id, club_id)
  select t.u, p_kind, left(p_title, 160), left(coalesce(p_body, ''), 600), p_link, p_campaign_id, p_club_id
    from (select distinct unnest(p_users) as u) t
   where t.u is not null;
$$;

-- Gestionnaires (ou demandeurs) d'un club.
create function public.club_member_ids(p_club_id uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(m.user_id), '{}')
    from public.club_members m join public.profiles p on p.id = m.user_id
   where m.club_id = p_club_id and p.role in ('supporter', 'club_manager');
$$;

-- Contributeurs d'une campagne (y compris remboursés : ils restent informés).
create function public.campaign_backer_ids(p_campaign_id uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct x.user_id), '{}')
    from public.contributions x
   where x.campaign_id = p_campaign_id and x.status in ('completed', 'refund_pending', 'refunded');
$$;

-- Communauté d'un club : supporters qui le suivent et anciens contributeurs de ses campagnes.
create function public.club_audience_ids(p_club_id uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct t.u), '{}') from (
    select p.id as u from public.profiles p where p.followed_club_id = p_club_id and p.role = 'supporter'
    union
    select x.user_id from public.contributions x join public.campaigns c on c.id = x.campaign_id
     where c.club_id = p_club_id and x.status in ('completed', 'refund_pending', 'refunded')
  ) t
  where not exists (select 1 from public.club_members m where m.club_id = p_club_id and m.user_id = t.u);
$$;

-- Montant lisible dans un message (15 000 $).
create function public.fmt_money(p_amount numeric, p_currency text) returns text
language sql immutable set search_path = '' as $$
  select replace(to_char(round(coalesce(p_amount, 0)), 'FM999,999,999,990'), ',', U&'\202F')
         || case when p_currency = 'CDF' then ' FC' else ' $' end;
$$;

create function public.mark_notifications_read(p_ids bigint[] default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_count int;
begin
  update public.notifications set read_at = now()
   where user_id = v_uid and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- Objectif atteint : la date est notée une seule fois (une baisse puis une
-- remontée du montant ne renvoie pas la notification).
alter table public.campaigns add column goal_reached_at timestamptz;
update public.campaigns set goal_reached_at = coalesce(closed_at, published_at, now())
 where goal_amount > 0 and raised_amount >= goal_amount;

create function public.campaigns_mark_goal() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.goal_reached_at := now();
  return new;
end $$;

create trigger campaigns_goal_reached
  before update of raised_amount on public.campaigns
  for each row when (new.goal_reached_at is null and new.goal_amount > 0 and new.raised_amount >= new.goal_amount)
  execute function public.campaigns_mark_goal();

create function public.campaigns_goal_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_club text;
begin
  select name into v_club from public.clubs where id = new.club_id;
  perform public.notify(public.campaign_backer_ids(new.id), 'objectif_atteint',
    'Objectif atteint : ' || new.title,
    'Grâce à ' || new.backers_count || ' supporters, ' || v_club || ' a réuni ' || public.fmt_money(new.raised_amount, new.currency)
      || ' sur ' || public.fmt_money(new.goal_amount, new.currency) || '. Merci ! La collecte reste ouverte jusqu''à sa date de fin.',
    '/campagnes/' || new.slug, new.id, new.club_id);
  perform public.notify(public.club_member_ids(new.club_id), 'objectif_atteint',
    'Votre campagne a atteint son objectif',
    '« ' || new.title || ' » : ' || public.fmt_money(new.raised_amount, new.currency) || ' réunis grâce à '
      || new.backers_count || ' supporters. Remerciez-les dans une nouvelle.',
    '/club/campagnes/' || new.id, new.id, new.club_id);
  return null;
end $$;

-- Sans liste de colonnes : la date est posée par le déclencheur précédent, pas par la requête.
create trigger campaigns_goal_notify
  after update on public.campaigns
  for each row when (old.goal_reached_at is null and new.goal_reached_at is not null and new.status = 'published')
  execute function public.campaigns_goal_notify();

-- Changements de statut d'une campagne.
create function public.campaigns_status_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_club public.clubs;
  v_public text := '/campagnes/' || new.slug;
  v_manage text := '/club/campagnes/' || new.id;
  v_members uuid[] := public.club_member_ids(new.club_id);
begin
  select * into v_club from public.clubs where id = new.club_id;

  if new.status = 'published' and old.status = 'in_review' then
    perform public.notify(public.club_audience_ids(new.club_id), 'campagne_lancee',
      v_club.name || ' lance un projet : ' || new.title,
      coalesce(nullif(new.summary, '') || ' ', '') || 'Objectif : ' || public.fmt_money(new.goal_amount, new.currency)
        || ', collecte jusqu''au ' || to_char(new.end_date, 'DD/MM/YYYY') || '.',
      v_public, new.id, new.club_id);
    perform public.notify(v_members, 'campagne_publiee', 'Votre campagne est en ligne',
      '« ' || new.title || ' » est publiée : la collecte est ouverte jusqu''au ' || to_char(new.end_date, 'DD/MM/YYYY')
        || '. Partagez-la avec vos supporters.',
      v_manage, new.id, new.club_id);
  elsif new.status = 'published' and old.status = 'suspended' then
    perform public.notify(public.campaign_backer_ids(new.id) || v_members, 'campagne_reprise',
      'La campagne reprend : ' || new.title, 'Après vérification, l''équipe Tribune a réactivé la campagne.',
      v_public, new.id, new.club_id);
  elsif new.status = 'changes_requested' then
    perform public.notify(v_members, 'campagne_a_corriger', 'Corrections demandées : ' || new.title,
      coalesce(new.review_note, 'L''équipe Tribune demande des corrections.'), v_manage, new.id, new.club_id);
  elsif new.status = 'rejected' then
    perform public.notify(v_members, 'campagne_refusee', 'Dossier refusé : ' || new.title,
      coalesce(new.review_note, ''), v_manage, new.id, new.club_id);
  elsif new.status = 'suspended' then
    perform public.notify(public.campaign_backer_ids(new.id), 'campagne_suspendue', 'Campagne suspendue : ' || new.title,
      'L''équipe Tribune a suspendu la campagne le temps de vérifications. Vous serez informé de la suite ; si elle n''aboutit pas, vous serez remboursé.',
      v_public, new.id, new.club_id);
    perform public.notify(v_members, 'campagne_suspendue', 'Votre campagne est suspendue : ' || new.title,
      coalesce(new.review_note, ''), v_manage, new.id, new.club_id);
  elsif new.status = 'funded' then
    perform public.notify(public.campaign_backer_ids(new.id), 'campagne_financee', 'Campagne financée : ' || new.title,
      public.fmt_money(new.raised_amount, new.currency) || ' réunis par ' || new.backers_count
        || ' supporters. Le club réalise maintenant le projet : suivez la preuve de chaque jalon.',
      v_public, new.id, new.club_id);
    perform public.notify(v_members, 'campagne_financee', 'Campagne financée : ' || new.title,
      'La collecte est clôturée. Publiez la preuve de chaque jalon pour recevoir les versements.', v_manage, new.id, new.club_id);
  elsif new.status = 'failed' then
    perform public.notify(public.campaign_backer_ids(new.id), 'campagne_non_financee', 'Objectif non atteint : ' || new.title,
      'La campagne a réuni ' || public.fmt_money(new.raised_amount, new.currency) || ' sur ' || public.fmt_money(new.goal_amount, new.currency)
        || '. Comme prévu (tout ou rien), votre contribution vous est remboursée sur votre compte Mobile Money.',
      v_public, new.id, new.club_id);
    perform public.notify(v_members, 'campagne_non_financee', 'Objectif non atteint : ' || new.title,
      'Les supporters sont remboursés. Vous pourrez proposer une nouvelle campagne.', v_manage, new.id, new.club_id);
  end if;
  return null;
end $$;

create trigger campaigns_status_notify
  after update of status on public.campaigns
  for each row when (new.status is distinct from old.status)
  execute function public.campaigns_status_notify();

-- Décisions sur l'inscription d'un club.
create function public.clubs_status_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_members uuid[] := public.club_member_ids(new.id);
  v_new text := new.status::text;
  v_old text := old.status::text;
begin
  if v_new = 'verified' and v_old = 'pending' then
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

create trigger clubs_status_notify
  after update of status on public.clubs
  for each row when (new.status is distinct from old.status)
  execute function public.clubs_status_notify();

-- ---------------------------------------------------------------------
-- 3. Actualités des clubs et messages aux contributeurs
-- ---------------------------------------------------------------------
alter table public.campaign_updates
  add column club_id uuid references public.clubs (id) on delete cascade,
  -- public : page de la campagne (ou du club) ; contributors : contributeurs de la campagne seulement.
  add column audience text not null default 'public' check (audience in ('public', 'contributors')),
  -- Motif communiqué au club quand la nouvelle n'est pas publiée.
  add column review_note text check (char_length(review_note) <= 500);

update public.campaign_updates u set club_id = c.club_id from public.campaigns c where c.id = u.campaign_id;

alter table public.campaign_updates
  alter column club_id set not null,
  alter column campaign_id drop not null,
  add constraint campaign_updates_message_has_campaign check (audience = 'public' or campaign_id is not null);

create index updates_club_idx on public.campaign_updates (club_id, created_at desc);
create index updates_published_idx on public.campaign_updates (published_at desc) where status = 'published';

-- Compatibilité : une nouvelle liée à une campagne reçoit le club de la campagne.
create function public.campaign_updates_fill_club() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.club_id is null and new.campaign_id is not null then
    select club_id into new.club_id from public.campaigns where id = new.campaign_id;
  end if;
  return new;
end $$;

create trigger campaign_updates_fill_club
  before insert on public.campaign_updates
  for each row execute function public.campaign_updates_fill_club();

-- L'utilisateur connecté a-t-il contribué à cette campagne ?
create function public.is_campaign_backer(p_campaign_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.contributions x
     where x.campaign_id = p_campaign_id and x.user_id = auth.uid()
       and x.status in ('completed', 'refund_pending', 'refunded')
  );
$$;

drop policy "nouvelles : publiées, ou membres du club et équipe" on public.campaign_updates;
create policy "nouvelles : publiques, contributeurs, club ou équipe" on public.campaign_updates
  for select to anon, authenticated using (
    public.is_club_member(club_id) or public.is_staff()
    or (status = 'published' and audience = 'public' and (
          (campaign_id is null and exists (select 1 from public.clubs k where k.id = club_id))
          or exists (select 1 from public.campaigns c where c.id = campaign_id)))
    or (status = 'published' and audience = 'contributors' and public.is_campaign_backer(campaign_id))
  );

drop function public.post_campaign_update(uuid, text, text);

-- Nouvelle d'une campagne, actualité du club (sans campagne) ou message aux contributeurs.
create function public.post_club_news(p_club_id uuid, p_campaign_id uuid, p_audience text, p_title text, p_body text)
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
  if v_club_status not in ('verified', 'suspended') then
    raise exception 'Le club doit être vérifié pour publier des nouvelles.';
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
  if (select count(*) from public.campaign_updates where club_id = p_club_id and status = 'pending') >= 10 then
    raise exception 'Dix nouvelles attendent déjà leur relecture. Patientez avant d''en envoyer d''autres.';
  end if;

  insert into public.campaign_updates (campaign_id, club_id, author_id, audience, title, body)
  values (p_campaign_id, p_club_id, v_uid, p_audience, v_title, v_body)
  returning id into v_id;
  perform public.write_audit(
    case when p_audience = 'contributors' then 'message.envoye' else 'nouvelle.envoyee' end,
    case when p_campaign_id is null then 'club' else 'campaign' end,
    coalesce(p_campaign_id, p_club_id)::text,
    jsonb_build_object('titre', v_title, 'nouvelle', v_id));
  return v_id;
end $$;

drop function public.review_campaign_update(uuid, boolean);

create function public.review_campaign_update(p_update_id uuid, p_publish boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.require_staff();
  u public.campaign_updates;
begin
  if not p_publish and coalesce(trim(p_note), '') = '' then
    raise exception 'Indiquez au club pourquoi la nouvelle n''est pas publiée.';
  end if;
  update public.campaign_updates
     set status = case when p_publish then 'published'::public.update_status else 'rejected'::public.update_status end,
         reviewed_by = v_staff,
         published_at = case when p_publish then now() end,
         review_note = case when p_publish then null else left(trim(p_note), 500) end
   where id = p_update_id and status = 'pending'
  returning * into u;
  if u.id is null then
    raise exception 'Nouvelle introuvable ou déjà traitée.';
  end if;
  perform public.write_audit(case when p_publish then 'nouvelle.publiee' else 'nouvelle.refusee' end,
    case when u.campaign_id is null then 'club' else 'campaign' end, coalesce(u.campaign_id, u.club_id)::text,
    jsonb_build_object('nouvelle', p_update_id, 'destinataires', u.audience, 'note', nullif(trim(coalesce(p_note, '')), '')));
end $$;

-- Publication d'une nouvelle : contributeurs ou communauté du club prévenus.
create function public.campaign_updates_notify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_club public.clubs;
  v_slug text;
  v_link text;
begin
  select * into v_club from public.clubs where id = new.club_id;
  if new.campaign_id is not null then
    select slug into v_slug from public.campaigns where id = new.campaign_id;
    v_link := '/campagnes/' || v_slug || '#nouvelles';
  else
    v_link := '/clubs/' || v_club.slug || '#actualites';
  end if;

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
    perform public.notify(array[new.author_id], 'nouvelle_publiee', 'Votre nouvelle est publiée', new.title,
      v_link, new.campaign_id, new.club_id);
  elsif new.status = 'rejected' then
    perform public.notify(array[new.author_id], 'nouvelle_refusee', 'Nouvelle non publiée : ' || new.title,
      coalesce(new.review_note, ''),
      case when new.campaign_id is null then '/club' else '/club/campagnes/' || new.campaign_id end,
      new.campaign_id, new.club_id);
  end if;
  return null;
end $$;

create trigger campaign_updates_notify
  after update of status on public.campaign_updates
  for each row when (old.status = 'pending' and new.status <> 'pending')
  execute function public.campaign_updates_notify();

-- ---------------------------------------------------------------------
-- 2. Commentaires sur les campagnes
-- ---------------------------------------------------------------------
create table public.campaign_comments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  -- Un seul niveau de réponses : une réponse pointe vers le commentaire d'origine.
  parent_id uuid references public.campaign_comments (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  author_kind text not null check (author_kind in ('supporter', 'club')),
  -- Nom affiché, figé à la publication : « Prénom N. » ou nom du club. Jamais de téléphone ni d'e-mail.
  author_label text not null check (char_length(author_label) between 1 and 140),
  body text not null check (char_length(body) between 2 and 1000),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'deleted')),
  report_count int not null default 0,
  moderated_by uuid references public.profiles (id) on delete set null,
  moderated_at timestamptz,
  moderation_note text check (char_length(moderation_note) <= 300),
  created_at timestamptz not null default now()
);
create index campaign_comments_campaign_idx on public.campaign_comments (campaign_id, created_at desc);
create index campaign_comments_author_idx on public.campaign_comments (author_id, created_at desc);
create index campaign_comments_reported_idx on public.campaign_comments (report_count desc) where report_count > 0 and status = 'visible';

create table public.comment_reports (
  comment_id uuid not null references public.campaign_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- Fil public d'une campagne : sans identifiant d'utilisateur, avec la mention « contributeur ».
create function public.campaign_comments_feed(p_campaign_id uuid)
returns table (
  id uuid, parent_id uuid, author_label text, author_kind text, body text,
  created_at timestamptz, is_backer boolean, is_mine boolean
)
language sql stable security definer set search_path = '' as $$
  select k.id, k.parent_id, k.author_label, k.author_kind, k.body, k.created_at,
         exists (
           select 1 from public.contributions x
            where x.campaign_id = k.campaign_id and x.user_id = k.author_id
              and x.status in ('completed', 'refund_pending', 'refunded')
         ),
         auth.uid() is not null and k.author_id = auth.uid()
    from public.campaign_comments k
    join public.campaigns c on c.id = k.campaign_id
   where k.campaign_id = p_campaign_id
     and k.status = 'visible'
     and (k.parent_id is null or exists (
           select 1 from public.campaign_comments r where r.id = k.parent_id and r.status = 'visible'))
     and (c.status in ('published', 'funded', 'failed') or public.is_club_member(c.club_id) or public.is_staff())
   order by k.created_at desc
   limit 300;
$$;

create function public.post_comment(p_campaign_id uuid, p_body text, p_parent_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  c public.campaigns;
  v_kind text;
  v_label text;
  v_parent public.campaign_comments;
  v_root uuid;
  v_body text := regexp_replace(trim(coalesce(p_body, '')), E'\\n{3,}', E'\n\n', 'g');
  v_id uuid;
  v_link text;
begin
  select * into c from public.campaigns where id = p_campaign_id;
  if c.id is null or c.status not in ('published', 'funded', 'failed') then
    raise exception 'Les commentaires sont ouverts sur les campagnes publiées.';
  end if;
  if public.is_club_member(c.club_id) then
    v_kind := 'club';
    select name into v_label from public.clubs where id = c.club_id;
  elsif public.current_app_role() = 'supporter' then
    v_kind := 'supporter';
    select first_name || ' ' || left(last_name, 1) || '.' into v_label from public.profiles where id = v_uid;
  else
    raise exception 'Les commentaires sont réservés aux supporters et au club concerné.' using errcode = '42501';
  end if;
  if char_length(v_body) not between 2 and 1000 then
    raise exception 'Votre commentaire doit faire entre 2 et 1 000 caractères.';
  end if;
  if p_parent_id is not null then
    select * into v_parent from public.campaign_comments where id = p_parent_id;
    if v_parent.id is null or v_parent.campaign_id <> c.id or v_parent.status <> 'visible' then
      raise exception 'Ce commentaire n''existe plus.';
    end if;
    v_root := coalesce(v_parent.parent_id, v_parent.id);
  end if;
  if (select count(*) from public.campaign_comments where author_id = v_uid and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Vous avez publié plusieurs commentaires à la suite. Patientez quelques minutes.';
  end if;

  insert into public.campaign_comments (campaign_id, parent_id, author_id, author_kind, author_label, body)
  values (c.id, v_root, v_uid, v_kind, v_label, v_body)
  returning id into v_id;

  v_link := '/campagnes/' || c.slug || '#commentaire-' || v_id;
  if v_parent.id is not null and v_parent.author_id is distinct from v_uid then
    perform public.notify(array[v_parent.author_id], 'commentaire_reponse',
      v_label || ' a répondu à votre commentaire', left(v_body, 200), v_link, c.id, c.club_id);
  end if;
  if v_kind = 'supporter' then
    perform public.notify(public.club_member_ids(c.club_id), 'commentaire',
      'Nouveau commentaire sur « ' || c.title || ' »', v_label || ' : ' || left(v_body, 180), v_link, c.id, c.club_id);
  end if;
  return v_id;
end $$;

-- L'auteur retire son commentaire (il disparaît du fil, l'équipe garde la trace).
create function public.delete_comment(p_comment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
begin
  update public.campaign_comments set status = 'deleted'
   where id = p_comment_id and author_id = v_uid and status <> 'deleted';
  if not found then
    raise exception 'Commentaire introuvable.';
  end if;
end $$;

-- Signalement d'un commentaire (une fois par compte) : il remonte dans le back-office.
create function public.report_comment(p_comment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_author uuid;
begin
  select author_id into v_author from public.campaign_comments where id = p_comment_id and status = 'visible';
  if not found then
    raise exception 'Commentaire introuvable.';
  end if;
  if v_author = v_uid then
    raise exception 'Vous ne pouvez pas signaler votre propre commentaire.';
  end if;
  insert into public.comment_reports (comment_id, user_id) values (p_comment_id, v_uid) on conflict do nothing;
  if found then
    update public.campaign_comments set report_count = report_count + 1 where id = p_comment_id;
  end if;
end $$;

-- Modération : masquer (motif obligatoire) ou conserver un commentaire signalé.
create function public.moderate_comment(p_comment_id uuid, p_hide boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.require_staff();
  v_campaign uuid;
begin
  if p_hide and coalesce(trim(p_note), '') = '' then
    raise exception 'Indiquez le motif du masquage.';
  end if;
  update public.campaign_comments
     set status = case when p_hide then 'hidden' else 'visible' end,
         report_count = case when p_hide then report_count else 0 end,
         moderated_by = v_staff, moderated_at = now(),
         moderation_note = nullif(left(trim(coalesce(p_note, '')), 300), '')
   where id = p_comment_id and status <> 'deleted'
  returning campaign_id into v_campaign;
  if v_campaign is null then
    raise exception 'Commentaire introuvable.';
  end if;
  perform public.write_audit(case when p_hide then 'commentaire.masque' else 'commentaire.conserve' end,
    'campaign', v_campaign::text, jsonb_build_object('commentaire', p_comment_id, 'note', p_note));
end $$;

-- ---------------------------------------------------------------------
-- 4. Ambassadeurs : code de partage et attribution des contributions
-- ---------------------------------------------------------------------
alter table public.profiles
  add column referral_code text unique check (referral_code ~ '^[a-z0-9]{6,12}$'),
  -- Accord pour apparaître sous son prénom dans le classement des ambassadeurs.
  add column ambassador_public boolean not null default false;

create function public.new_referral_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..7 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * char_length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = v_code);
  end loop;
  return v_code;
end $$;

do $$
declare
  r record;
begin
  for r in select id from public.profiles where referral_code is null loop
    update public.profiles set referral_code = public.new_referral_code() where id = r.id;
  end loop;
end $$;

create function public.profiles_set_referral_code() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.referral_code is null then
    new.referral_code := public.new_referral_code();
  end if;
  return new;
end $$;

create trigger profiles_1_referral
  before insert on public.profiles
  for each row execute function public.profiles_set_referral_code();

alter table public.contributions
  add column referred_by uuid references public.profiles (id) on delete set null,
  add constraint contributions_no_self_referral check (referred_by is null or referred_by <> user_id);
create index contributions_referred_idx on public.contributions (referred_by, status) where referred_by is not null;

-- Ce que l'ambassadeur connecté a apporté (contributions confirmées des supporters venus par son lien).
create function public.my_ambassador_stats()
returns table (supporters bigint, contributions bigint, amount numeric)
language sql stable security definer set search_path = '' as $$
  select count(distinct x.user_id), count(*), coalesce(sum(x.amount), 0)
    from public.contributions x
   where x.referred_by = auth.uid() and x.status = 'completed' and x.currency = 'USD';
$$;

-- ---------------------------------------------------------------------
-- 5. Classements publics
-- ---------------------------------------------------------------------
create function public.ambassador_ranking(p_limit int default 10)
returns table (rank bigint, label text, supporters bigint, amount numeric, is_me boolean)
language sql stable security definer set search_path = '' as $$
  select row_number() over (order by count(distinct x.user_id) desc, sum(x.amount) desc),
         case when p.ambassador_public then p.first_name || ' ' || left(p.last_name, 1) || '.' else 'Ambassadeur anonyme' end,
         count(distinct x.user_id),
         sum(x.amount),
         auth.uid() is not null and p.id = auth.uid()
    from public.contributions x
    join public.profiles p on p.id = x.referred_by
   where x.status = 'completed' and x.currency = 'USD'
   group by p.id
   order by 3 desc, 4 desc
   limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

create function public.club_ranking(p_limit int default 10)
returns table (
  id uuid, slug text, name text, short_name text, color_primary text, color_secondary text,
  logo_path text, city text, supporters bigint, raised numeric, funded bigint
)
language sql stable security definer set search_path = '' as $$
  select k.id, k.slug, k.name, k.short_name, k.color_primary, k.color_secondary, k.logo_path, k.city,
         count(distinct x.user_id),
         coalesce(sum(x.amount) filter (where x.currency = 'USD'), 0),
         (select count(*) from public.campaigns f where f.club_id = k.id and f.status = 'funded')
    from public.clubs k
    join public.campaigns c on c.club_id = k.id and c.status in ('published', 'funded', 'failed')
    join public.contributions x on x.campaign_id = c.id and x.status = 'completed'
   where k.status = 'verified'
   group by k.id
   order by 9 desc, 10 desc
   limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

-- Chiffres publics d'un club (club vérifié, ou visible par ses membres et l'équipe).
create function public.club_stats(p_club_id uuid)
returns table (supporters bigint, raised numeric, funded bigint, active bigint)
language sql stable security definer set search_path = '' as $$
  select
    (select count(distinct x.user_id) from public.contributions x join public.campaigns c on c.id = x.campaign_id
      where c.club_id = p_club_id and x.status = 'completed'),
    (select coalesce(sum(x.amount), 0) from public.contributions x join public.campaigns c on c.id = x.campaign_id
      where c.club_id = p_club_id and x.status = 'completed' and x.currency = 'USD'),
    (select count(*) from public.campaigns where club_id = p_club_id and status = 'funded'),
    (select count(*) from public.campaigns where club_id = p_club_id and status = 'published')
   where exists (
     select 1 from public.clubs k
      where k.id = p_club_id and (k.status = 'verified' or public.is_club_member(k.id) or public.is_staff()));
$$;

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.campaign_comments enable row level security;
alter table public.comment_reports enable row level security;
revoke all on public.notifications, public.campaign_comments, public.comment_reports from anon, authenticated;

grant select on public.notifications to authenticated;
create policy "notifications : les siennes" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));

-- Lecture publique par campaign_comments_feed ; la table elle-même ne sert qu'à la modération.
grant select on public.campaign_comments to authenticated;
create policy "commentaires : équipe (modération)" on public.campaign_comments
  for select to authenticated using (public.is_staff());

-- Chacun choisit d'apparaître ou non sous son prénom dans le classement des ambassadeurs.
grant update (ambassador_public) on public.profiles to authenticated;

revoke execute on function
  public.notify(uuid[], text, text, text, text, uuid, uuid),
  public.club_member_ids(uuid),
  public.campaign_backer_ids(uuid),
  public.club_audience_ids(uuid),
  public.fmt_money(numeric, text),
  public.mark_notifications_read(bigint[]),
  public.campaigns_mark_goal(),
  public.campaigns_goal_notify(),
  public.campaigns_status_notify(),
  public.clubs_status_notify(),
  public.campaign_updates_fill_club(),
  public.is_campaign_backer(uuid),
  public.post_club_news(uuid, uuid, text, text, text),
  public.review_campaign_update(uuid, boolean, text),
  public.campaign_updates_notify(),
  public.campaign_comments_feed(uuid),
  public.post_comment(uuid, text, uuid),
  public.delete_comment(uuid),
  public.report_comment(uuid),
  public.moderate_comment(uuid, boolean, text),
  public.new_referral_code(),
  public.profiles_set_referral_code(),
  public.my_ambassador_stats(),
  public.ambassador_ranking(int),
  public.club_ranking(int),
  public.club_stats(uuid)
from public, anon, authenticated;

-- Lecture publique (aucune donnée personnelle) et contrôle utilisé par les règles RLS.
grant execute on function
  public.is_campaign_backer(uuid),
  public.campaign_comments_feed(uuid),
  public.ambassador_ranking(int),
  public.club_ranking(int),
  public.club_stats(uuid)
to anon, authenticated;

-- Actions des utilisateurs connectés (chaque fonction vérifie le rôle).
grant execute on function
  public.mark_notifications_read(bigint[]),
  public.post_club_news(uuid, uuid, text, text, text),
  public.review_campaign_update(uuid, boolean, text),
  public.post_comment(uuid, text, uuid),
  public.delete_comment(uuid),
  public.report_comment(uuid),
  public.moderate_comment(uuid, boolean, text),
  public.my_ambassador_stats()
to authenticated;
