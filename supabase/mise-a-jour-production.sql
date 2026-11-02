-- =====================================================================
-- MISE À JOUR DE LA BASE EN PRODUCTION : à exécuter UNE SEULE FOIS dans
-- Supabase > SQL Editor (projet « tribune-supporters »), AVANT de fusionner
-- la pull request #10. Regroupe les migrations 20261101000200, 0300 et 0400
-- (la 20261101000100 est déjà appliquée). Tout passe ou rien ne passe.
-- Résultat attendu : « Success. No rows returned ».
-- =====================================================================

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
