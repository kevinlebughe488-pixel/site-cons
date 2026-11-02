-- =====================================================================
-- Paramètres d'une campagne, fixés par le club et vérifiés à l'instruction :
--
--   - une durée de collecte (14 à 70 jours) qui commence le jour de la
--     publication : la date de fin est calculée à ce moment-là, au lieu
--     d'être choisie au brouillon (le temps d'instruction ne raccourcit
--     plus la collecte) ;
--   - un montant minimum par supporter ;
--   - un montant maximum par supporter, si nécessaire : plafond du cumul
--     de ses contributions à la campagne ;
--   - une photo de couverture (bucket public « campaign-images »), envoyée
--     par le serveur après vérification des droits.
-- =====================================================================

-- Date du jour à Kinshasa (la base tourne en UTC).
create function public.kinshasa_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Africa/Kinshasa')::date;
$$;

alter table public.campaigns
  add column duration_days int not null default 42 check (duration_days between 14 and 70),
  add column min_contribution numeric(12, 2) not null default 1 check (min_contribution between 1 and 1000),
  add column max_contribution numeric(12, 2) check (max_contribution is null or max_contribution >= min_contribution),
  add column cover_path text check (char_length(cover_path) <= 200);

-- Campagnes existantes : la durée se déduit des dates déjà fixées.
update public.campaigns
   set duration_days = least(70, greatest(14, end_date - coalesce(published_at, submitted_at, created_at)::date + 1));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-images', 'campaign-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Brouillon : durée, minimum et maximum par supporter
-- ---------------------------------------------------------------------
drop function public.save_campaign_draft(uuid, uuid, text, text, text, text, text, numeric, date, jsonb, jsonb);

create function public.save_campaign_draft(
  p_campaign_id uuid, p_club_id uuid, p_slug text, p_title text, p_category text, p_summary text,
  p_description text, p_goal numeric, p_duration_days int, p_min_contribution numeric, p_max_contribution numeric,
  p_budget jsonb, p_milestones jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_id uuid := p_campaign_id;
  v_status public.campaign_status;
  v_club uuid;
  v_slug text := p_slug;
  v_end date;
begin
  if p_duration_days is null or p_duration_days not between 14 and 70 then
    raise exception 'La durée de la collecte doit être comprise entre 14 et 70 jours.';
  end if;
  if p_min_contribution is null or p_min_contribution < 1 or p_min_contribution > 1000 or p_min_contribution <> trunc(p_min_contribution) then
    raise exception 'La contribution minimum doit être un montant entier entre 1 $ et 1 000 $.';
  end if;
  if p_goal is not null and p_min_contribution > p_goal then
    raise exception 'La contribution minimum ne peut pas dépasser l''objectif.';
  end if;
  if p_max_contribution is not null and (
    p_max_contribution < p_min_contribution or p_max_contribution <> trunc(p_max_contribution)
    or (p_goal is not null and p_max_contribution > p_goal)
  ) then
    raise exception 'Le maximum par supporter doit être un montant entier, au moins égal au minimum et au plus égal à l''objectif.';
  end if;
  -- Date de fin provisoire : elle est recalculée à la publication.
  v_end := public.kinshasa_today() + p_duration_days - 1;

  if v_id is null then
    if not public.is_club_member(p_club_id) then
      raise exception 'Vous ne gérez pas ce club.' using errcode = '42501';
    end if;
    if not exists (select 1 from public.clubs where id = p_club_id and status = 'verified') then
      raise exception 'Le club doit être vérifié par Tribune avant de créer une campagne.';
    end if;
    if exists (select 1 from public.campaigns where slug = v_slug) then
      v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
    end if;
    insert into public.campaigns (
      club_id, slug, title, category, summary, description, goal_amount, end_date,
      duration_days, min_contribution, max_contribution, created_by
    ) values (
      p_club_id, v_slug, trim(p_title), p_category, coalesce(trim(p_summary), ''), coalesce(p_description, ''), p_goal, v_end,
      p_duration_days, p_min_contribution, p_max_contribution, v_uid
    ) returning id into v_id;
    perform public.write_audit('campagne.creee', 'campaign', v_id::text, jsonb_build_object('titre', p_title));
  else
    select status, club_id into v_status, v_club from public.campaigns where id = v_id for update;
    if v_club is null or not public.is_club_member(v_club) then
      raise exception 'Vous ne gérez pas cette campagne.' using errcode = '42501';
    end if;
    if v_status not in ('draft', 'changes_requested') then
      raise exception 'Une campagne envoyée en revue ou publiée ne peut plus être modifiée.';
    end if;
    update public.campaigns
       set title = trim(p_title), category = p_category, summary = coalesce(trim(p_summary), ''),
           description = coalesce(p_description, ''), goal_amount = p_goal, end_date = v_end,
           duration_days = p_duration_days, min_contribution = p_min_contribution, max_contribution = p_max_contribution
     where id = v_id;
  end if;

  delete from public.campaign_budget_lines where campaign_id = v_id;
  insert into public.campaign_budget_lines (campaign_id, position, label, amount)
  select v_id, (t.ord - 1)::int, trim(t.item ->> 'label'), (t.item ->> 'amount')::numeric
    from jsonb_array_elements(coalesce(p_budget, '[]'::jsonb)) with ordinality as t(item, ord)
   where coalesce(trim(t.item ->> 'label'), '') <> '';

  delete from public.campaign_milestones where campaign_id = v_id;
  insert into public.campaign_milestones (campaign_id, position, label, target_label)
  select v_id, (t.ord - 1)::int, trim(t.item ->> 'label'), coalesce(trim(t.item ->> 'target'), '')
    from jsonb_array_elements(coalesce(p_milestones, '[]'::jsonb)) with ordinality as t(item, ord)
   where coalesce(trim(t.item ->> 'label'), '') <> '';

  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Envoi en revue : plus de fenêtre de dates, mais une durée cohérente
-- ---------------------------------------------------------------------
create or replace function public.submit_campaign(p_campaign_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.campaigns;
  v_budget numeric;
begin
  perform public.require_user();
  select * into c from public.campaigns where id = p_campaign_id for update;
  if c.id is null or not public.is_club_member(c.club_id) then
    raise exception 'Vous ne gérez pas cette campagne.' using errcode = '42501';
  end if;
  if c.status not in ('draft', 'changes_requested') then
    raise exception 'Cette campagne a déjà été envoyée.';
  end if;
  if not exists (select 1 from public.clubs where id = c.club_id and status = 'verified') then
    raise exception 'Le club doit être vérifié par Tribune avant d''envoyer une campagne.';
  end if;
  if char_length(c.description) < 80 then
    raise exception 'La description doit faire au moins 80 caractères.';
  end if;
  select coalesce(sum(amount), 0) into v_budget from public.campaign_budget_lines where campaign_id = c.id;
  if v_budget <> c.goal_amount then
    raise exception 'Le total du budget (% %) doit être égal à l''objectif (% %).',
      trim_scale(v_budget), c.currency, trim_scale(c.goal_amount), c.currency;
  end if;
  if not exists (select 1 from public.campaign_milestones where campaign_id = c.id) then
    raise exception 'Ajoutez au moins un jalon.';
  end if;
  if c.min_contribution > c.goal_amount or coalesce(c.max_contribution, 0) > c.goal_amount then
    raise exception 'Le minimum et le maximum par supporter ne peuvent pas dépasser l''objectif.';
  end if;

  update public.campaigns
     set status = 'in_review', submitted_at = now(), end_date = public.kinshasa_today() + c.duration_days - 1
   where id = c.id;
  perform public.write_audit('campagne.soumise', 'campaign', c.id::text);
end $$;

-- ---------------------------------------------------------------------
-- Publication : la collecte dure le nombre de jours choisi, à partir d'aujourd'hui
-- (même règles que la version du plan d'affaires, plus le calcul de la date de fin)
-- ---------------------------------------------------------------------
create or replace function public.review_campaign(
  p_campaign_id uuid, p_decision text, p_note text default null, p_criteria text[] default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.require_staff();
  c public.campaigns;
  v_new public.campaign_status;
  v_fee numeric;
begin
  select * into c from public.campaigns where id = p_campaign_id for update;
  if c.id is null then
    raise exception 'Campagne introuvable.';
  end if;
  if c.status <> 'in_review' then
    raise exception 'Cette campagne n''est pas en revue.';
  end if;
  v_new := case p_decision
    when 'approve' then 'published'
    when 'request_changes' then 'changes_requested'
    when 'reject' then 'rejected'
  end::public.campaign_status;
  if v_new is null then
    raise exception 'Décision inconnue.';
  end if;
  if p_decision <> 'approve' and coalesce(trim(p_note), '') = '' then
    raise exception 'Expliquez au club ce qu''il doit corriger ou pourquoi le dossier est refusé.';
  end if;
  if p_decision = 'approve' and not coalesce(p_criteria, '{}') @> array['clarte', 'faisabilite', 'coherence'] then
    raise exception 'Pour publier, confirmez les trois critères d''instruction : clarté, faisabilité et cohérence.';
  end if;
  if p_decision = 'approve' and c.goal_amount > 20000 and not public.is_admin() then
    raise exception 'Au-delà de 20 000, la publication doit être validée par un administrateur.';
  end if;
  if p_decision = 'approve' and not exists (select 1 from public.clubs where id = c.club_id and status = 'verified') then
    raise exception 'Le club n''est pas vérifié.';
  end if;

  update public.campaigns
     set status = v_new, review_note = nullif(trim(p_note), ''), reviewed_by = v_staff, reviewed_at = now(),
         published_at = case when v_new = 'published' then now() else published_at end,
         end_date = case when v_new = 'published' then public.kinshasa_today() + c.duration_days - 1 else end_date end
   where id = c.id;

  if v_new = 'published' then
    select publication_fee into v_fee from public.platform_settings;
    if v_fee > 0 then
      insert into public.publication_fees (campaign_id, amount) values (c.id, v_fee)
      on conflict (campaign_id) do nothing;
    end if;
  end if;

  perform public.write_audit('campagne.' || p_decision, 'campaign', c.id::text,
    jsonb_build_object('note', p_note) || case when v_new = 'published'
      then jsonb_build_object('criteres', to_jsonb(p_criteria), 'frais_publication', coalesce(v_fee, 0),
        'duree_jours', c.duration_days, 'fin', public.kinshasa_today() + c.duration_days - 1)
      else '{}'::jsonb end);
end $$;

-- ---------------------------------------------------------------------
-- Contributions : minimum et maximum par supporter, vérifiés par la base
-- (en plus de l'application), même pour une écriture du serveur.
-- ---------------------------------------------------------------------
create function public.check_contribution_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.campaigns;
  v_total numeric;
begin
  select * into c from public.campaigns where id = new.campaign_id;
  if new.amount < c.min_contribution then
    raise exception 'La contribution minimum pour cette campagne est de % %.', trim_scale(c.min_contribution), c.currency;
  end if;
  if c.max_contribution is not null then
    -- Deux paiements simultanés du même supporter ne peuvent pas dépasser ensemble le plafond.
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text || ':' || new.campaign_id::text, 0));
    select coalesce(sum(amount), 0) into v_total
      from public.contributions
     where campaign_id = new.campaign_id and user_id = new.user_id
       and status in ('initiated', 'pending', 'completed', 'refund_pending');
    if v_total + new.amount > c.max_contribution then
      raise exception 'Le maximum par supporter pour cette campagne est de % % (déjà contribué : % %).',
        trim_scale(c.max_contribution), c.currency, trim_scale(v_total), c.currency;
    end if;
  end if;
  return new;
end $$;

create trigger contributions_check_limits
  before insert on public.contributions
  for each row execute function public.check_contribution_limits();

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
revoke execute on function
  public.kinshasa_today(),
  public.save_campaign_draft(uuid, uuid, text, text, text, text, text, numeric, int, numeric, numeric, jsonb, jsonb),
  public.check_contribution_limits()
from public, anon, authenticated;

grant execute on function
  public.save_campaign_draft(uuid, uuid, text, text, text, text, text, numeric, int, numeric, numeric, jsonb, jsonb)
to authenticated;
