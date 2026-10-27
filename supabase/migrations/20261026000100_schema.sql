-- =====================================================================
-- Tribune Supporters — schéma initial
--
-- Principe : les lectures passent par les règles RLS (chaque rôle ne voit
-- que ce qui le concerne) ; toutes les écritures sensibles passent par des
-- fonctions qui vérifient le rôle de l'appelant et écrivent dans le journal
-- d'audit. Les paiements (contributions, remboursements) ne sont écrits que
-- par le serveur de l'application, avec la clé « service_role ».
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.app_role as enum ('supporter', 'club_manager', 'compliance', 'admin');
create type public.club_status as enum ('pending', 'verified', 'rejected', 'suspended');
create type public.club_member_role as enum ('owner', 'manager');
create type public.campaign_status as enum (
  'draft', 'in_review', 'changes_requested', 'rejected',
  'published', 'suspended', 'funded', 'failed'
);
create type public.contribution_status as enum (
  'initiated', 'pending', 'completed', 'failed', 'refund_pending', 'refunded'
);
create type public.refund_status as enum ('pending', 'completed', 'failed');
create type public.kyc_status as enum ('none', 'pending', 'verified', 'rejected');
create type public.update_status as enum ('pending', 'published', 'rejected');
create type public.payment_provider as enum ('pawapay', 'simulation');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  name text not null check (char_length(name) between 3 and 120),
  short_name text not null check (short_name ~ '^[A-Z0-9]{2,4}$'),
  color_primary text not null default '#1d5237' check (color_primary ~ '^#[0-9a-fA-F]{6}$'),
  color_secondary text not null default '#ecd083' check (color_secondary ~ '^#[0-9a-fA-F]{6}$'),
  city text not null default 'Kinshasa' check (char_length(city) <= 80),
  commune text check (char_length(commune) <= 80),
  founded_year int check (founded_year between 1850 and 2100),
  description text not null default '' check (char_length(description) <= 4000),
  president_name text not null check (char_length(president_name) between 3 and 120),
  contact_phone text not null check (contact_phone ~ '^[0-9]{8,15}$'),
  -- Compte Mobile Money qui recevra les versements. Modifiable seulement par l'administration.
  payout_phone text check (payout_phone ~ '^243[0-9]{9}$'),
  payout_provider text check (char_length(payout_provider) <= 40),
  status public.club_status not null default 'pending',
  review_note text check (char_length(review_note) <= 2000),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  -- Numéro international sans « + » (ex. 243812345678).
  phone text unique check (phone ~ '^[0-9]{8,15}$'),
  role public.app_role not null default 'supporter',
  residence text not null default 'rdc' check (residence in ('rdc', 'diaspora')),
  country text check (char_length(country) <= 80),
  city text check (char_length(city) <= 80),
  followed_club_id uuid references public.clubs (id) on delete set null,
  newsletter boolean not null default true,
  consent_at timestamptz not null default now(),
  kyc_status public.kyc_status not null default 'none',
  kyc_doc_type text check (kyc_doc_type in ('carte_electeur', 'passeport', 'permis')),
  kyc_doc_last4 text check (kyc_doc_last4 ~ '^[0-9A-Za-z]{4}$'),
  kyc_declared_at timestamptz,
  kyc_reviewed_by uuid references public.profiles (id) on delete set null,
  kyc_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clubs
  add constraint clubs_reviewed_by_fkey foreign key (reviewed_by) references public.profiles (id) on delete set null,
  add constraint clubs_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;

create table public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_role public.club_member_role not null default 'manager',
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) between 5 and 120),
  category text not null check (category in (
    'Infrastructure', 'Formation des jeunes', 'Déplacement', 'Transport', 'Santé', 'Équipement'
  )),
  summary text not null default '' check (char_length(summary) <= 300),
  description text not null default '' check (char_length(description) <= 8000),
  goal_amount numeric(12, 2) not null check (goal_amount >= 100 and goal_amount <= 1000000),
  currency text not null default 'USD' check (currency in ('USD', 'CDF')),
  end_date date not null,
  status public.campaign_status not null default 'draft',
  raised_amount numeric(12, 2) not null default 0,
  backers_count int not null default 0,
  review_note text check (char_length(review_note) <= 2000),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.campaign_budget_lines (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  position int not null,
  label text not null check (char_length(label) between 2 and 160),
  amount numeric(12, 2) not null check (amount > 0)
);

create table public.campaign_milestones (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  position int not null,
  label text not null check (char_length(label) between 2 and 160),
  target_label text not null default '' check (char_length(target_label) <= 40),
  done_at timestamptz,
  proof_note text check (char_length(proof_note) <= 1000)
);

create table public.campaign_updates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 3 and 140),
  body text not null check (char_length(body) between 10 and 4000),
  status public.update_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

-- L'identifiant d'une contribution est aussi le « depositId » envoyé à pawaPay.
create table public.contributions (
  id uuid primary key,
  campaign_id uuid not null references public.campaigns (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency in ('USD', 'CDF')),
  commission numeric(12, 2) not null check (commission >= 0),
  net_amount numeric(12, 2) not null check (net_amount >= 0),
  status public.contribution_status not null default 'initiated',
  payment_provider public.payment_provider not null,
  mmo_provider text not null check (char_length(mmo_provider) <= 40),
  payer_phone text not null check (payer_phone ~ '^243[0-9]{9}$'),
  anonymous boolean not null default false,
  provider_transaction_id text,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  refunded_at timestamptz
);

-- L'identifiant d'un remboursement est aussi le « refundId » envoyé à pawaPay.
create table public.refunds (
  id uuid primary key,
  contribution_id uuid not null references public.contributions (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null,
  status public.refund_status not null default 'pending',
  reason text not null check (char_length(reason) between 3 and 300),
  requested_by uuid references public.profiles (id) on delete set null,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index refunds_one_active_per_contribution
  on public.refunds (contribution_id) where status in ('pending', 'completed');

-- Trace brute de chaque notification reçue d'un prestataire de paiement.
create table public.payment_events (
  id bigint generated always as identity primary key,
  provider public.payment_provider not null,
  kind text not null,
  external_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index campaigns_status_idx on public.campaigns (status);
create index campaigns_club_idx on public.campaigns (club_id);
create index contributions_campaign_status_idx on public.contributions (campaign_id, status);
create index contributions_user_idx on public.contributions (user_id, created_at desc);
create index contributions_status_created_idx on public.contributions (status, created_at desc);
create index budget_lines_campaign_idx on public.campaign_budget_lines (campaign_id, position);
create index milestones_campaign_idx on public.campaign_milestones (campaign_id, position);
create index updates_campaign_idx on public.campaign_updates (campaign_id, created_at desc);
create index refunds_contribution_idx on public.refunds (contribution_id);
create index payment_events_external_idx on public.payment_events (external_id);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
create index club_members_user_idx on public.club_members (user_id);

-- ---------------------------------------------------------------------
-- Fonctions utilitaires internes
-- ---------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger clubs_touch before update on public.clubs for each row execute function public.touch_updated_at();
create trigger campaigns_touch before update on public.campaigns for each row execute function public.touch_updated_at();
create trigger contributions_touch before update on public.contributions for each row execute function public.touch_updated_at();

create function public.write_audit(p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- Rôle de l'utilisateur connecté (null pour un visiteur).
create function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() in ('compliance', 'admin'), false);
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create function public.is_club_member(p_club_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.club_members m where m.club_id = p_club_id and m.user_id = auth.uid()
  );
$$;

create function public.require_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'Vous devez être connecté.' using errcode = '42501';
  end if;
  return auth.uid();
end $$;

create function public.require_staff() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  if not public.is_staff() then
    raise exception 'Action réservée à l''équipe Tribune.' using errcode = '42501';
  end if;
  return auth.uid();
end $$;

create function public.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_user();
  if not public.is_admin() then
    raise exception 'Action réservée aux administrateurs.' using errcode = '42501';
  end if;
  return auth.uid();
end $$;

-- ---------------------------------------------------------------------
-- Création du profil à l'inscription
-- ---------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_club uuid;
begin
  if coalesce(meta ->> 'followed_club_id', '') ~ '^[0-9a-f-]{36}$' then
    select id into v_club from public.clubs where id = (meta ->> 'followed_club_id')::uuid and status = 'verified';
  end if;

  insert into public.profiles (id, email, first_name, last_name, phone, residence, country, city, followed_club_id, newsletter, consent_at)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(meta ->> 'first_name'), ''), 'Supporter'),
    coalesce(nullif(trim(meta ->> 'last_name'), ''), 'Tribune'),
    nullif(meta ->> 'phone', ''),
    case when meta ->> 'residence' = 'diaspora' then 'diaspora' else 'rdc' end,
    nullif(trim(meta ->> 'country'), ''),
    nullif(trim(meta ->> 'city'), ''),
    v_club,
    coalesce((meta ->> 'newsletter')::boolean, true),
    now()
  );

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (new.id, 'profil.inscription', 'profile', new.id::text, jsonb_build_object('consentement', true));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Garde l'e-mail du profil à jour si l'utilisateur le change.
create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------
-- Totaux des campagnes (recalculés à chaque changement de contribution)
-- ---------------------------------------------------------------------
create function public.refresh_campaign_totals() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_campaign uuid := coalesce(new.campaign_id, old.campaign_id);
begin
  update public.campaigns c set
    raised_amount = coalesce((
      select sum(x.amount) from public.contributions x where x.campaign_id = v_campaign and x.status = 'completed'
    ), 0),
    backers_count = (
      select count(distinct x.user_id) from public.contributions x where x.campaign_id = v_campaign and x.status = 'completed'
    )
  where c.id = v_campaign;
  return null;
end $$;

create trigger contributions_refresh_totals
  after insert or delete or update of status on public.contributions
  for each row execute function public.refresh_campaign_totals();

-- ---------------------------------------------------------------------
-- Profils et identité
-- ---------------------------------------------------------------------
create function public.declare_identity(p_doc_type text, p_doc_last4 text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_status public.kyc_status;
begin
  select kyc_status into v_status from public.profiles where id = v_uid;
  if v_status = 'verified' then
    return;
  end if;
  update public.profiles
     set kyc_status = 'pending', kyc_doc_type = p_doc_type, kyc_doc_last4 = p_doc_last4, kyc_declared_at = now(),
         kyc_reviewed_by = null, kyc_reviewed_at = null
   where id = v_uid;
  perform public.write_audit('identite.declaree', 'profile', v_uid::text, jsonb_build_object('piece', p_doc_type));
end $$;

create function public.review_identity(p_user_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.require_staff();
begin
  update public.profiles
     set kyc_status = case when p_approve then 'verified'::public.kyc_status else 'rejected'::public.kyc_status end,
         kyc_reviewed_by = v_staff, kyc_reviewed_at = now()
   where id = p_user_id and kyc_status = 'pending';
  if not found then
    raise exception 'Aucune vérification d''identité en attente pour ce supporter.';
  end if;
  perform public.write_audit(case when p_approve then 'identite.verifiee' else 'identite.refusee' end, 'profile', p_user_id::text);
end $$;

create function public.admin_set_role(p_user_id uuid, p_role public.app_role) returns void
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
  update public.profiles set role = p_role where id = p_user_id;
  perform public.write_audit('role.modifie', 'profile', p_user_id::text,
    jsonb_build_object('ancien', v_old, 'nouveau', p_role));
end $$;

-- ---------------------------------------------------------------------
-- Clubs
-- ---------------------------------------------------------------------
create function public.register_club(
  p_name text, p_short_name text, p_slug text, p_city text, p_commune text, p_founded_year int,
  p_description text, p_president_name text, p_contact_phone text,
  p_payout_phone text, p_payout_provider text, p_color_primary text, p_color_secondary text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_id uuid;
  v_slug text := p_slug;
begin
  if exists (
    select 1 from public.club_members m join public.clubs c on c.id = m.club_id
    where m.user_id = v_uid and c.status in ('pending', 'verified', 'suspended')
  ) then
    raise exception 'Vous gérez déjà un club ou une demande est en cours.';
  end if;
  if exists (select 1 from public.clubs where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.clubs (
    slug, name, short_name, city, commune, founded_year, description, president_name, contact_phone,
    payout_phone, payout_provider, color_primary, color_secondary, created_by
  ) values (
    v_slug, trim(p_name), upper(trim(p_short_name)), coalesce(nullif(trim(p_city), ''), 'Kinshasa'), nullif(trim(p_commune), ''),
    p_founded_year, coalesce(p_description, ''), trim(p_president_name), p_contact_phone,
    nullif(p_payout_phone, ''), nullif(p_payout_provider, ''), coalesce(p_color_primary, '#1d5237'), coalesce(p_color_secondary, '#ecd083'), v_uid
  ) returning id into v_id;

  insert into public.club_members (club_id, user_id, member_role) values (v_id, v_uid, 'owner');
  perform public.write_audit('club.demande', 'club', v_id::text, jsonb_build_object('nom', p_name));
  return v_id;
end $$;

create function public.review_club(p_club_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid;
  v_status public.club_status;
  v_new public.club_status;
begin
  if p_decision in ('verify', 'reject') then
    v_actor := public.require_staff();
  elsif p_decision in ('suspend', 'reactivate') then
    v_actor := public.require_admin();
  else
    raise exception 'Décision inconnue.';
  end if;

  select status into v_status from public.clubs where id = p_club_id for update;
  if v_status is null then
    raise exception 'Club introuvable.';
  end if;

  v_new := case p_decision
    when 'verify' then case when v_status = 'pending' then 'verified' end
    when 'reject' then case when v_status = 'pending' then 'rejected' end
    when 'suspend' then case when v_status = 'verified' then 'suspended' end
    when 'reactivate' then case when v_status = 'suspended' then 'verified' end
  end::public.club_status;
  if v_new is null then
    raise exception 'Cette décision n''est pas possible pour un club au statut « % ».', v_status;
  end if;
  if p_decision in ('reject', 'suspend') and coalesce(trim(p_note), '') = '' then
    raise exception 'Indiquez le motif de la décision.';
  end if;

  update public.clubs set status = v_new, review_note = nullif(trim(p_note), ''), reviewed_by = v_actor, reviewed_at = now()
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

  perform public.write_audit('club.' || p_decision, 'club', p_club_id::text, jsonb_build_object('note', p_note));
end $$;

create function public.admin_add_club_member(p_club_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if not exists (select 1 from public.clubs where id = p_club_id and status = 'verified') then
    raise exception 'Le club doit être vérifié.';
  end if;
  insert into public.club_members (club_id, user_id, member_role) values (p_club_id, p_user_id, 'manager')
  on conflict do nothing;
  update public.profiles set role = 'club_manager' where id = p_user_id and role = 'supporter';
  perform public.write_audit('club.membre_ajoute', 'club', p_club_id::text, jsonb_build_object('utilisateur', p_user_id));
end $$;

create function public.admin_set_club_payout(p_club_id uuid, p_payout_phone text, p_payout_provider text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.clubs set payout_phone = nullif(p_payout_phone, ''), payout_provider = nullif(p_payout_provider, '')
   where id = p_club_id;
  perform public.write_audit('club.compte_versement', 'club', p_club_id::text,
    jsonb_build_object('operateur', p_payout_provider));
end $$;

-- ---------------------------------------------------------------------
-- Campagnes
-- ---------------------------------------------------------------------

-- Crée (p_campaign_id null) ou met à jour un brouillon, avec son budget et ses jalons.
-- p_budget   : [{"label": "...", "amount": 1200}, ...]
-- p_milestones : [{"label": "...", "target": "nov. 2026"}, ...]
create function public.save_campaign_draft(
  p_campaign_id uuid, p_club_id uuid, p_slug text, p_title text, p_category text, p_summary text,
  p_description text, p_goal numeric, p_end_date date, p_budget jsonb, p_milestones jsonb
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_id uuid := p_campaign_id;
  v_status public.campaign_status;
  v_club uuid;
  v_slug text := p_slug;
begin
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
    insert into public.campaigns (club_id, slug, title, category, summary, description, goal_amount, end_date, created_by)
    values (p_club_id, v_slug, trim(p_title), p_category, coalesce(trim(p_summary), ''), coalesce(p_description, ''), p_goal, p_end_date, v_uid)
    returning id into v_id;
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
           description = coalesce(p_description, ''), goal_amount = p_goal, end_date = p_end_date
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

create function public.submit_campaign(p_campaign_id uuid) returns void
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
  if c.end_date < current_date + 14 or c.end_date > current_date + 70 then
    raise exception 'La date de clôture doit être entre 2 et 10 semaines à partir d''aujourd''hui.';
  end if;

  update public.campaigns set status = 'in_review', submitted_at = now() where id = c.id;
  perform public.write_audit('campagne.soumise', 'campaign', c.id::text);
end $$;

create function public.review_campaign(p_campaign_id uuid, p_decision text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.require_staff();
  c public.campaigns;
  v_new public.campaign_status;
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
  if p_decision = 'approve' and c.goal_amount > 20000 and not public.is_admin() then
    raise exception 'Au-delà de 20 000, la publication doit être validée par un administrateur.';
  end if;
  if p_decision = 'approve' and not exists (select 1 from public.clubs where id = c.club_id and status = 'verified') then
    raise exception 'Le club n''est pas vérifié.';
  end if;

  update public.campaigns
     set status = v_new, review_note = nullif(trim(p_note), ''), reviewed_by = v_staff, reviewed_at = now(),
         published_at = case when v_new = 'published' then now() else published_at end
   where id = c.id;
  perform public.write_audit('campagne.' || p_decision, 'campaign', c.id::text, jsonb_build_object('note', p_note));
end $$;

create function public.set_campaign_suspension(p_campaign_id uuid, p_suspend boolean, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_status public.campaign_status;
begin
  perform public.require_admin();
  select status into v_status from public.campaigns where id = p_campaign_id for update;
  if p_suspend and v_status <> 'published' then
    raise exception 'Seule une campagne en cours peut être suspendue.';
  end if;
  if not p_suspend and v_status <> 'suspended' then
    raise exception 'Cette campagne n''est pas suspendue.';
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

-- Clôture « tout ou rien » : financée si l'objectif est atteint, sinon échouée (les supporters sont remboursés).
create function public.close_campaign(p_campaign_id uuid) returns public.campaign_status
language plpgsql security definer set search_path = '' as $$
declare
  c public.campaigns;
  v_new public.campaign_status;
begin
  perform public.require_admin();
  select * into c from public.campaigns where id = p_campaign_id for update;
  if c.id is null or c.status not in ('published', 'suspended') then
    raise exception 'Seule une campagne en cours ou suspendue peut être clôturée.';
  end if;
  if exists (select 1 from public.contributions where campaign_id = c.id and status in ('initiated', 'pending')) then
    raise exception 'Des paiements sont encore en attente de confirmation. Réessayez dans quelques minutes.';
  end if;
  v_new := case when c.raised_amount >= c.goal_amount then 'funded' else 'failed' end;
  update public.campaigns set status = v_new, closed_at = now() where id = c.id;
  perform public.write_audit('campagne.cloturee', 'campaign', c.id::text,
    jsonb_build_object('resultat', v_new, 'collecte', c.raised_amount, 'objectif', c.goal_amount));
  return v_new;
end $$;

create function public.post_campaign_update(p_campaign_id uuid, p_title text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  c public.campaigns;
  v_id uuid;
begin
  select * into c from public.campaigns where id = p_campaign_id;
  if c.id is null or not public.is_club_member(c.club_id) then
    raise exception 'Vous ne gérez pas cette campagne.' using errcode = '42501';
  end if;
  if c.status not in ('published', 'suspended', 'funded', 'failed') then
    raise exception 'Les nouvelles sont possibles une fois la campagne publiée.';
  end if;
  insert into public.campaign_updates (campaign_id, author_id, title, body)
  values (c.id, v_uid, trim(p_title), trim(p_body)) returning id into v_id;
  perform public.write_audit('nouvelle.envoyee', 'campaign', c.id::text, jsonb_build_object('titre', p_title));
  return v_id;
end $$;

create function public.review_campaign_update(p_update_id uuid, p_publish boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.require_staff();
  v_campaign uuid;
begin
  update public.campaign_updates
     set status = case when p_publish then 'published'::public.update_status else 'rejected'::public.update_status end,
         reviewed_by = v_staff, published_at = case when p_publish then now() end
   where id = p_update_id and status = 'pending'
  returning campaign_id into v_campaign;
  if v_campaign is null then
    raise exception 'Nouvelle introuvable ou déjà traitée.';
  end if;
  perform public.write_audit(case when p_publish then 'nouvelle.publiee' else 'nouvelle.refusee' end,
    'campaign', v_campaign::text, jsonb_build_object('nouvelle', p_update_id));
end $$;

create function public.complete_milestone(p_milestone_id uuid, p_proof text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_campaign uuid;
  v_club uuid;
  v_status public.campaign_status;
begin
  perform public.require_user();
  select m.campaign_id, c.club_id, c.status into v_campaign, v_club, v_status
    from public.campaign_milestones m join public.campaigns c on c.id = m.campaign_id
   where m.id = p_milestone_id;
  if v_club is null or not public.is_club_member(v_club) then
    raise exception 'Vous ne gérez pas cette campagne.' using errcode = '42501';
  end if;
  if v_status not in ('published', 'funded') then
    raise exception 'Les jalons se valident sur une campagne en cours ou financée.';
  end if;
  if coalesce(char_length(trim(p_proof)), 0) < 10 then
    raise exception 'Décrivez la preuve (facture, photo, document) en quelques mots.';
  end if;
  update public.campaign_milestones set done_at = now(), proof_note = trim(p_proof)
   where id = p_milestone_id and done_at is null;
  perform public.write_audit('jalon.atteint', 'campaign', v_campaign::text, jsonb_build_object('jalon', p_milestone_id));
end $$;

-- ---------------------------------------------------------------------
-- Données publiques agrégées
-- ---------------------------------------------------------------------

-- Registre public d'une campagne : noms abrégés, jamais de téléphone.
create function public.campaign_public_contributions(p_campaign_id uuid, p_limit int default 20)
returns table (completed_at timestamptz, supporter text, amount numeric, currency text)
language sql stable security definer set search_path = '' as $$
  select x.completed_at,
         case when x.anonymous then 'Supporter anonyme'
              else p.first_name || ' ' || left(p.last_name, 1) || '.' end,
         x.amount, x.currency
    from public.contributions x
    join public.profiles p on p.id = x.user_id
    join public.campaigns c on c.id = x.campaign_id
   where x.campaign_id = p_campaign_id
     and x.status = 'completed'
     and (c.status in ('published', 'funded', 'failed') or public.is_club_member(c.club_id) or public.is_staff())
   order by x.completed_at desc
   limit least(greatest(p_limit, 1), 100);
$$;

create function public.platform_stats()
returns table (total_raised numeric, supporters bigint, funded_campaigns bigint, active_campaigns bigint)
language sql stable security definer set search_path = '' as $$
  select
    coalesce((select sum(amount) from public.contributions where status = 'completed' and currency = 'USD'), 0),
    (select count(distinct user_id) from public.contributions where status = 'completed'),
    (select count(*) from public.campaigns where status = 'funded'),
    (select count(*) from public.campaigns where status = 'published');
$$;

-- ---------------------------------------------------------------------
-- Droits sur les tables
-- Par défaut, Supabase donne tous les droits aux rôles « anon » et
-- « authenticated ». On les retire, puis on ne rend que la lecture : les
-- écritures passent par les fonctions ci-dessus ou par le serveur.
-- ---------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;

grant select on public.clubs, public.campaigns, public.campaign_budget_lines,
  public.campaign_milestones, public.campaign_updates to anon, authenticated;
grant select on public.profiles, public.club_members, public.contributions, public.refunds,
  public.payment_events, public.audit_log to authenticated;

-- Seules quelques colonnes de son propre profil sont modifiables directement.
grant update (first_name, last_name, phone, residence, country, city, followed_club_id, newsletter)
  on public.profiles to authenticated;
-- Les gestionnaires peuvent modifier la présentation de leur club (pas le compte de versement).
grant update (description, city, commune, color_primary, color_secondary, contact_phone)
  on public.clubs to authenticated;

-- ---------------------------------------------------------------------
-- Règles RLS (lecture)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_budget_lines enable row level security;
alter table public.campaign_milestones enable row level security;
alter table public.campaign_updates enable row level security;
alter table public.contributions enable row level security;
alter table public.refunds enable row level security;
alter table public.payment_events enable row level security;
alter table public.audit_log enable row level security;

create policy "profil : soi-même ou équipe" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or public.is_staff());
create policy "profil : modifier le sien" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "club : public si vérifié, sinon membres et équipe" on public.clubs
  for select to anon, authenticated using (status = 'verified' or public.is_club_member(id) or public.is_staff());
create policy "club : les membres modifient la présentation" on public.clubs
  for update to authenticated using (public.is_club_member(id)) with check (public.is_club_member(id));

create policy "membres : soi-même, son club ou équipe" on public.club_members
  for select to authenticated using (user_id = (select auth.uid()) or public.is_club_member(club_id) or public.is_staff());

create policy "campagne : publique, ou membres du club et équipe" on public.campaigns
  for select to anon, authenticated using (
    status in ('published', 'funded', 'failed') or public.is_club_member(club_id) or public.is_staff()
  );

create policy "budget : comme la campagne" on public.campaign_budget_lines
  for select to anon, authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id));
create policy "jalons : comme la campagne" on public.campaign_milestones
  for select to anon, authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id));

create policy "nouvelles : publiées, ou membres du club et équipe" on public.campaign_updates
  for select to anon, authenticated using (
    (campaign_updates.status = 'published' and exists (select 1 from public.campaigns c where c.id = campaign_id))
    or exists (
      select 1 from public.campaigns c
       where c.id = campaign_id and (public.is_club_member(c.club_id) or public.is_staff())
    )
  );

create policy "contributions : les siennes ou équipe" on public.contributions
  for select to authenticated using (user_id = (select auth.uid()) or public.is_staff());

create policy "remboursements : les siens ou équipe" on public.refunds
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.contributions x where x.id = contribution_id and x.user_id = (select auth.uid())
    )
  );

create policy "événements de paiement : équipe" on public.payment_events
  for select to authenticated using (public.is_staff());

create policy "journal d'audit : équipe" on public.audit_log
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------
-- Droits d'exécution des fonctions
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Utilisées par les règles RLS (ne révèlent que des informations sur l'appelant).
grant execute on function public.current_app_role(), public.is_staff(), public.is_admin(),
  public.is_club_member(uuid) to anon, authenticated;

-- Lecture publique.
grant execute on function public.campaign_public_contributions(uuid, int), public.platform_stats()
  to anon, authenticated;

-- Actions des utilisateurs connectés (chaque fonction vérifie elle-même le rôle).
grant execute on function
  public.declare_identity(text, text),
  public.review_identity(uuid, boolean),
  public.admin_set_role(uuid, public.app_role),
  public.register_club(text, text, text, text, text, int, text, text, text, text, text, text, text),
  public.review_club(uuid, text, text),
  public.admin_add_club_member(uuid, uuid),
  public.admin_set_club_payout(uuid, text, text),
  public.save_campaign_draft(uuid, uuid, text, text, text, text, text, numeric, date, jsonb, jsonb),
  public.submit_campaign(uuid),
  public.review_campaign(uuid, text, text),
  public.set_campaign_suspension(uuid, boolean, text),
  public.close_campaign(uuid),
  public.post_campaign_update(uuid, text, text),
  public.review_campaign_update(uuid, boolean),
  public.complete_milestone(uuid, text)
to authenticated;
