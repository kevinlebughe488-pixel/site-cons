-- =====================================================================
-- Inscription des clubs : dossier complet et procédure de vérification.
--
-- 1. À l'inscription, la personne choisit « Je représente un club » ou
--    « Je suis supporter » (profiles.signup_intent).
-- 2. Le dossier d'un club comprend : nom officiel, sigle, discipline,
--    ville et adresse du siège, date de création, identifiant juridique ou
--    administratif (facultatif), représentant légal et ses coordonnées,
--    documents attestant l'existence du club, compte de versement au nom
--    du club (Mobile Money ou banque).
-- 3. Les données sensibles (adresse, coordonnées du représentant, compte
--    de versement) quittent la table publique « clubs » pour
--    « club_private », lisible seulement par les membres du club et
--    l'équipe Tribune. Avant, le numéro de versement d'un club vérifié
--    était lisible par n'importe quel visiteur via l'API.
-- 4. L'inscription n'ouvre aucun droit : brouillon → envoi → vérification
--    sur trois points de contrôle → compléments demandés, vérifié ou refusé.
--    Seul un club vérifié peut déposer une campagne (inchangé).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Type de compte choisi à l'inscription
-- ---------------------------------------------------------------------
alter table public.profiles
  add column signup_intent text not null default 'supporter' check (signup_intent in ('supporter', 'club'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_club uuid;
begin
  if coalesce(meta ->> 'followed_club_id', '') ~ '^[0-9a-f-]{36}$' then
    select id into v_club from public.clubs where id = (meta ->> 'followed_club_id')::uuid and status = 'verified';
  end if;

  insert into public.profiles (id, email, first_name, last_name, phone, residence, country, city, followed_club_id, newsletter, consent_at, signup_intent)
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
    now(),
    case when meta ->> 'signup_intent' = 'club' then 'club' else 'supporter' end
  );

  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (new.id, 'profil.inscription', 'profile', new.id::text,
    jsonb_build_object('consentement', true, 'type_de_compte', case when meta ->> 'signup_intent' = 'club' then 'club' else 'supporter' end));
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Informations publiques du club
-- ---------------------------------------------------------------------
alter table public.clubs
  add column sport text not null default 'Football' check (char_length(sport) between 2 and 60),
  add column founded_on date check (founded_on between date '1850-01-01' and date '2100-12-31'),
  add column submitted_at timestamptz;

-- Les demandes existantes ont déjà été envoyées.
update public.clubs set submitted_at = created_at where submitted_at is null;

-- ---------------------------------------------------------------------
-- Informations privées du club (membres du club et équipe Tribune)
-- ---------------------------------------------------------------------
create table public.club_private (
  club_id uuid primary key references public.clubs (id) on delete cascade,
  -- Adresse du siège (avenue, numéro, quartier).
  address text not null default '' check (char_length(address) <= 200),
  -- Identifiant juridique ou administratif : enregistrement ASBL, arrêté, affiliation, RCCM… (facultatif).
  legal_id text check (char_length(legal_id) <= 80),
  -- Représentant légal : son nom est clubs.president_name (public) ; sa fonction et ses coordonnées sont ici.
  rep_title text not null default '' check (char_length(rep_title) <= 60),
  rep_phone text check (rep_phone ~ '^[0-9]{8,15}$'),
  rep_email text check (char_length(rep_email) <= 160),
  -- Compte qui recevra les versements : au nom du club.
  payout_method text not null default 'mobile_money' check (payout_method in ('mobile_money', 'bank')),
  payout_holder text not null default '' check (char_length(payout_holder) <= 120),
  payout_phone text check (payout_phone ~ '^243[0-9]{9}$'),
  payout_provider text check (char_length(payout_provider) <= 40),
  bank_name text check (char_length(bank_name) <= 80),
  bank_account text check (char_length(bank_account) <= 60),
  updated_at timestamptz not null default now()
);

create trigger club_private_touch before update on public.club_private
  for each row execute function public.touch_updated_at();

insert into public.club_private (club_id, payout_phone, payout_provider)
select id, payout_phone, payout_provider from public.clubs
on conflict (club_id) do nothing;

-- Le compte de versement n'est plus dans la table publique.
alter table public.clubs drop column payout_phone, drop column payout_provider;

-- ---------------------------------------------------------------------
-- Documents du dossier (fichiers dans un bucket privé)
-- ---------------------------------------------------------------------
create table public.club_documents (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  kind text not null check (kind in (
    'statuts', 'enregistrement', 'affiliation', 'pv_dirigeants',
    'identite_representant', 'mandat', 'compte_versement', 'autre'
  )),
  file_path text not null unique check (char_length(file_path) <= 300),
  file_name text not null check (char_length(file_name) between 1 and 160),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index club_documents_club_idx on public.club_documents (club_id, created_at);

-- Bucket privé : aucun accès direct, le serveur génère des liens temporaires
-- pour les membres du club et l'équipe Tribune.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('club-documents', 'club-documents', false, 4194304, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Validation des données du dossier
-- ---------------------------------------------------------------------

-- Compte de versement : Mobile Money (numéro congolais et opérateur) ou banque.
create function public.normalize_payout(p_data jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_method text := coalesce(nullif(p_data ->> 'payout_method', ''), 'mobile_money');
  v_holder text := trim(coalesce(p_data ->> 'payout_holder', ''));
  v_phone text := public.normalize_phone(p_data ->> 'payout_phone');
  v_provider text := nullif(trim(coalesce(p_data ->> 'payout_provider', '')), '');
  v_bank text := nullif(trim(coalesce(p_data ->> 'bank_name', '')), '');
  v_account text := nullif(upper(regexp_replace(trim(coalesce(p_data ->> 'bank_account', '')), '\s+', ' ', 'g')), '');
begin
  if v_method not in ('mobile_money', 'bank') then
    raise exception 'Choisissez le type de compte de versement : Mobile Money ou banque.';
  end if;
  if char_length(v_holder) not between 3 and 120 then
    raise exception 'Indiquez le titulaire du compte de versement : le compte doit être au nom du club.';
  end if;
  if v_method = 'mobile_money' then
    if coalesce(v_phone, '') !~ '^243[89][0-9]{8}$' then
      raise exception 'Le numéro Mobile Money de versement doit être un numéro congolais valide.';
    end if;
    if v_provider is null or char_length(v_provider) > 40 then
      raise exception 'Choisissez l''opérateur du compte Mobile Money.';
    end if;
    v_bank := null;
    v_account := null;
  else
    if v_bank is null or char_length(v_bank) not between 2 and 80 then
      raise exception 'Indiquez le nom de la banque.';
    end if;
    if v_account is null or v_account !~ '^[A-Z0-9 .-]{5,60}$' then
      raise exception 'Le numéro de compte bancaire n''est pas valide (chiffres et lettres, 5 à 60 caractères).';
    end if;
    v_phone := null;
    v_provider := null;
  end if;
  return jsonb_build_object(
    'payout_method', v_method, 'payout_holder', v_holder, 'payout_phone', v_phone,
    'payout_provider', v_provider, 'bank_name', v_bank, 'bank_account', v_account
  );
end $$;

-- Toutes les informations du dossier ; lève une erreur lisible au premier problème.
create function public.normalize_club_dossier(p_data jsonb) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  v_name text := regexp_replace(trim(coalesce(p_data ->> 'name', '')), '\s+', ' ', 'g');
  v_short text := upper(trim(coalesce(p_data ->> 'short_name', '')));
  v_sport text := trim(coalesce(nullif(p_data ->> 'sport', ''), 'Football'));
  v_city text := trim(coalesce(p_data ->> 'city', ''));
  v_commune text := nullif(trim(coalesce(p_data ->> 'commune', '')), '');
  v_address text := trim(coalesce(p_data ->> 'address', ''));
  v_founded date;
  v_legal text := nullif(trim(coalesce(p_data ->> 'legal_id', '')), '');
  v_rep_name text := regexp_replace(trim(coalesce(p_data ->> 'rep_name', '')), '\s+', ' ', 'g');
  v_rep_title text := trim(coalesce(p_data ->> 'rep_title', ''));
  v_rep_phone text := public.normalize_phone(p_data ->> 'rep_phone');
  v_rep_email text := nullif(lower(trim(coalesce(p_data ->> 'rep_email', ''))), '');
  v_contact text := coalesce(public.normalize_phone(nullif(p_data ->> 'contact_phone', '')), public.normalize_phone(p_data ->> 'rep_phone'));
  v_description text := coalesce(p_data ->> 'description', '');
  v_c1 text := coalesce(nullif(p_data ->> 'color_primary', ''), '#1d5237');
  v_c2 text := coalesce(nullif(p_data ->> 'color_secondary', ''), '#ecd083');
  v_payout jsonb;
begin
  if char_length(v_name) not between 3 and 120 then
    raise exception 'Indiquez le nom officiel du club (3 à 120 caractères).';
  end if;
  if v_short !~ '^[A-Z0-9]{2,4}$' then
    raise exception 'Le sigle doit faire 2 à 4 lettres ou chiffres (ex. TPM).';
  end if;
  if char_length(v_sport) not between 2 and 60 then
    raise exception 'Indiquez la discipline sportive du club.';
  end if;
  if char_length(v_city) not between 2 and 80 then
    raise exception 'Indiquez la ville du siège du club.';
  end if;
  if char_length(coalesce(v_commune, '')) > 80 then
    raise exception 'Le nom de la commune est trop long.';
  end if;
  if char_length(v_address) not between 5 and 200 then
    raise exception 'Indiquez l''adresse du siège (avenue, numéro, quartier).';
  end if;
  begin
    v_founded := nullif(trim(coalesce(p_data ->> 'founded_on', '')), '')::date;
  exception when others then
    raise exception 'La date de création n''est pas valide.';
  end;
  if v_founded is null or v_founded < date '1850-01-01' or v_founded > (now() at time zone 'Africa/Kinshasa')::date then
    raise exception 'Indiquez la date de création du club (celle des statuts ou de la fondation).';
  end if;
  if char_length(coalesce(v_legal, '')) > 80 then
    raise exception 'L''identifiant juridique est trop long (80 caractères au plus).';
  end if;
  if char_length(v_rep_name) not between 3 and 120 then
    raise exception 'Indiquez le nom du représentant légal du club.';
  end if;
  if char_length(v_rep_title) not between 2 and 60 then
    raise exception 'Indiquez la fonction du représentant légal (président, secrétaire général…).';
  end if;
  if coalesce(v_rep_phone, '') !~ '^[1-9][0-9]{7,14}$' then
    raise exception 'Le téléphone du représentant légal n''est pas valide.';
  end if;
  if v_rep_email is not null and (char_length(v_rep_email) > 160 or v_rep_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'L''e-mail du représentant légal n''est pas valide.';
  end if;
  if coalesce(v_contact, '') !~ '^[1-9][0-9]{7,14}$' then
    raise exception 'Le téléphone de contact du club n''est pas valide.';
  end if;
  if char_length(v_description) > 4000 then
    raise exception 'La présentation du club est trop longue (4 000 caractères au plus).';
  end if;
  if v_c1 !~ '^#[0-9a-fA-F]{6}$' then v_c1 := '#1d5237'; end if;
  if v_c2 !~ '^#[0-9a-fA-F]{6}$' then v_c2 := '#ecd083'; end if;
  v_payout := public.normalize_payout(p_data);

  return jsonb_build_object(
    'name', v_name, 'short_name', v_short, 'sport', v_sport, 'city', v_city, 'commune', v_commune,
    'address', v_address, 'founded_on', v_founded, 'legal_id', v_legal, 'rep_name', v_rep_name,
    'rep_title', v_rep_title, 'rep_phone', v_rep_phone, 'rep_email', v_rep_email, 'contact_phone', v_contact,
    'description', v_description, 'color_primary', v_c1, 'color_secondary', v_c2
  ) || v_payout;
end $$;

-- Enregistre la partie privée du dossier (création ou mise à jour).
create function public.save_club_private(p_club_id uuid, v jsonb) returns void
language sql security definer set search_path = '' as $$
  insert into public.club_private (
    club_id, address, legal_id, rep_title, rep_phone, rep_email,
    payout_method, payout_holder, payout_phone, payout_provider, bank_name, bank_account
  ) values (
    p_club_id, v ->> 'address', v ->> 'legal_id', v ->> 'rep_title', v ->> 'rep_phone', v ->> 'rep_email',
    v ->> 'payout_method', v ->> 'payout_holder', v ->> 'payout_phone', v ->> 'payout_provider', v ->> 'bank_name', v ->> 'bank_account'
  )
  on conflict (club_id) do update set
    address = excluded.address, legal_id = excluded.legal_id, rep_title = excluded.rep_title,
    rep_phone = excluded.rep_phone, rep_email = excluded.rep_email, payout_method = excluded.payout_method,
    payout_holder = excluded.payout_holder, payout_phone = excluded.payout_phone,
    payout_provider = excluded.payout_provider, bank_name = excluded.bank_name, bank_account = excluded.bank_account;
$$;

-- ---------------------------------------------------------------------
-- Dossier : création, modification, envoi
-- ---------------------------------------------------------------------
drop function public.register_club(text, text, text, text, text, int, text, text, text, text, text, text, text);

-- Ouvre le dossier d'un club (statut « brouillon ») : aucun droit tant qu'il n'est pas vérifié.
create function public.register_club(p_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v jsonb := public.normalize_club_dossier(p_data);
  v_slug text := coalesce(p_data ->> 'slug', '');
  v_id uuid;
begin
  if public.current_app_role() <> 'supporter' then
    raise exception 'Seul un compte personnel (supporter ou représentant de club) peut inscrire un club.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.club_members m join public.clubs c on c.id = m.club_id
     where m.user_id = v_uid and c.status::text <> 'rejected'
  ) then
    raise exception 'Vous gérez déjà un club ou une demande est en cours.';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 70 then
    v_slug := 'club';
  end if;
  if exists (select 1 from public.clubs where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;

  insert into public.clubs (
    slug, name, short_name, sport, city, commune, founded_on, founded_year, description,
    president_name, contact_phone, color_primary, color_secondary, status, created_by
  ) values (
    v_slug, v ->> 'name', v ->> 'short_name', v ->> 'sport', v ->> 'city', v ->> 'commune',
    (v ->> 'founded_on')::date, extract(year from (v ->> 'founded_on')::date)::int, v ->> 'description',
    v ->> 'rep_name', v ->> 'contact_phone', v ->> 'color_primary', v ->> 'color_secondary', 'draft', v_uid
  ) returning id into v_id;

  perform public.save_club_private(v_id, v);
  insert into public.club_members (club_id, user_id, member_role) values (v_id, v_uid, 'owner');
  perform public.write_audit('club.dossier_ouvert', 'club', v_id::text, jsonb_build_object('nom', v ->> 'name'));
  return v_id;
end $$;

-- Modifie le dossier tant qu'il n'est pas envoyé (ou quand des compléments sont demandés).
create function public.update_club_registration(p_club_id uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v jsonb := public.normalize_club_dossier(p_data);
  v_slug text := coalesce(p_data ->> 'slug', '');
  v_status text;
  v_old_slug text;
begin
  if not public.is_club_member(p_club_id) then
    raise exception 'Vous ne gérez pas ce club.' using errcode = '42501';
  end if;
  select status::text, slug into v_status, v_old_slug from public.clubs where id = p_club_id for update;
  if v_status not in ('draft', 'changes_requested') then
    raise exception 'Le dossier ne peut plus être modifié : il est en cours de vérification ou déjà vérifié.';
  end if;

  -- Le club n'est pas encore public : son adresse suit le nom, sans changer à chaque enregistrement.
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 70 then
    v_slug := v_old_slug;
  elsif v_old_slug = v_slug or v_old_slug ~ ('^' || v_slug || '-[0-9a-f]{4}$') then
    v_slug := v_old_slug;
  elsif exists (select 1 from public.clubs where slug = v_slug and id <> p_club_id) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 4);
  end if;

  update public.clubs set
    slug = v_slug, name = v ->> 'name', short_name = v ->> 'short_name', sport = v ->> 'sport',
    city = v ->> 'city', commune = v ->> 'commune', founded_on = (v ->> 'founded_on')::date,
    founded_year = extract(year from (v ->> 'founded_on')::date)::int, description = v ->> 'description',
    president_name = v ->> 'rep_name', contact_phone = v ->> 'contact_phone',
    color_primary = v ->> 'color_primary', color_secondary = v ->> 'color_secondary'
  where id = p_club_id;
  perform public.save_club_private(p_club_id, v);
  perform public.write_audit('club.dossier_modifie', 'club', p_club_id::text, jsonb_build_object('par', v_uid));
end $$;

-- Envoie le dossier à l'équipe Tribune.
create function public.submit_club_registration(p_club_id uuid) returns void
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
    select 1 from public.club_private where club_id = p_club_id and payout_holder <> '' and rep_phone is not null and address <> ''
  ) then
    raise exception 'Complétez l''adresse du siège, le représentant légal et le compte de versement avant d''envoyer le dossier.';
  end if;

  update public.clubs set status = 'pending', submitted_at = now() where id = p_club_id;
  perform public.write_audit('club.dossier_envoye', 'club', p_club_id::text,
    jsonb_build_object('documents', (select count(*) from public.club_documents where club_id = p_club_id)));
end $$;

-- ---------------------------------------------------------------------
-- Vérification par l'équipe Tribune
-- ---------------------------------------------------------------------
drop function public.review_club(uuid, text, text);

-- Décisions : verify | request_changes | reject (équipe), suspend | reactivate (administrateur).
-- Pour vérifier, l'équipe confirme trois points de contrôle, inscrits au journal d'audit.
create function public.review_club(p_club_id uuid, p_decision text, p_note text default null, p_criteria text[] default null)
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
    when 'verify' then case when v_status = 'pending' then 'verified' end
    when 'request_changes' then case when v_status = 'pending' then 'changes_requested' end
    when 'reject' then case when v_status in ('pending', 'changes_requested') then 'rejected' end
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

  update public.clubs
     set status = v_new::public.club_status, review_note = nullif(trim(p_note), ''), reviewed_by = v_actor, reviewed_at = now()
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
    jsonb_build_object('note', p_note) || case when p_decision = 'verify'
      then jsonb_build_object('controles', to_jsonb(p_criteria)) else '{}'::jsonb end);
end $$;

-- Changement du compte de versement : administrateur seulement, tracé au journal.
drop function public.admin_set_club_payout(uuid, text, text);

create function public.admin_set_club_payout(p_club_id uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v jsonb;
  v_old public.club_private;
begin
  perform public.require_admin();
  v := public.normalize_payout(p_data);
  select * into v_old from public.club_private where club_id = p_club_id for update;
  if not exists (select 1 from public.clubs where id = p_club_id) then
    raise exception 'Club introuvable.';
  end if;
  insert into public.club_private (club_id, payout_method, payout_holder, payout_phone, payout_provider, bank_name, bank_account)
  values (p_club_id, v ->> 'payout_method', v ->> 'payout_holder', v ->> 'payout_phone', v ->> 'payout_provider', v ->> 'bank_name', v ->> 'bank_account')
  on conflict (club_id) do update set
    payout_method = excluded.payout_method, payout_holder = excluded.payout_holder, payout_phone = excluded.payout_phone,
    payout_provider = excluded.payout_provider, bank_name = excluded.bank_name, bank_account = excluded.bank_account;
  -- Au journal : le type de compte, l'opérateur ou la banque et les 3 derniers chiffres, jamais le numéro complet.
  perform public.write_audit('club.compte_versement', 'club', p_club_id::text, jsonb_build_object(
    'ancien', jsonb_build_object('type', v_old.payout_method, 'operateur', coalesce(v_old.payout_provider, v_old.bank_name),
      'fin', right(coalesce(v_old.payout_phone, v_old.bank_account, ''), 3)),
    'nouveau', jsonb_build_object('type', v ->> 'payout_method', 'operateur', coalesce(v ->> 'payout_provider', v ->> 'bank_name'),
      'fin', right(coalesce(v ->> 'payout_phone', v ->> 'bank_account', ''), 3))));
end $$;

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
alter table public.club_private enable row level security;
alter table public.club_documents enable row level security;
revoke all on public.club_private, public.club_documents from anon, authenticated;
grant select on public.club_private, public.club_documents to authenticated;

create policy "dossier privé : membres du club et équipe" on public.club_private
  for select to authenticated using (public.is_club_member(club_id) or public.is_staff());
create policy "documents du club : membres du club et équipe" on public.club_documents
  for select to authenticated using (public.is_club_member(club_id) or public.is_staff());

revoke execute on function
  public.normalize_payout(jsonb),
  public.normalize_club_dossier(jsonb),
  public.save_club_private(uuid, jsonb),
  public.register_club(jsonb),
  public.update_club_registration(uuid, jsonb),
  public.submit_club_registration(uuid),
  public.review_club(uuid, text, text, text[]),
  public.admin_set_club_payout(uuid, jsonb)
from public, anon, authenticated;

grant execute on function
  public.register_club(jsonb),
  public.update_club_registration(uuid, jsonb),
  public.submit_club_registration(uuid),
  public.review_club(uuid, text, text, text[]),
  public.admin_set_club_payout(uuid, jsonb)
to authenticated;
