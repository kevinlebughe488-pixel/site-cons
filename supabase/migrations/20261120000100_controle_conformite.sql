-- =====================================================================
-- Contrôle de conformité des campagnes : la campagne est-elle authentique,
-- et son budget est-il au prix du marché ?
--
-- 1. Référentiel des prix (price_references) : le prix normal d'un article
--    ou d'un service (maillot, ballon, m² de gazon, location de bus…), tenu
--    par l'équipe conformité, avec sa source. Les valeurs de départ sont
--    indicatives et « à confirmer » : tant qu'un prix n'est pas confirmé par
--    l'équipe, il signale un écart mais ne bloque rien.
-- 2. Chaque poste du budget indique sa quantité et, si possible, l'article du
--    référentiel. Sans article choisi, le poste est rapproché du référentiel
--    par mots-clés (« Maillots » → maillot), pour qu'on ne puisse pas éviter
--    la comparaison en choisissant « Autre ». Un rapprochement par mots-clés
--    peut se tromper : il signale l'écart à l'équipe, sans bloquer.
-- 3. Devis et factures pro forma des fournisseurs (campaign_documents, bucket
--    privé) : au moins un est exigé.
-- 4. compute_campaign_compliance() calcule le contrôle automatique :
--      - club vérifié ;
--      - photo du projet ;
--      - devis joint ;
--      - prix : un poste à 3 fois le prix de référence (ou plus) bloque
--        (article choisi, prix confirmé), à 1,5 fois il est signalé ;
--      - texte copié d'une campagne antérieure d'un autre club ;
--      - antécédents du club (jalons non prouvés, autre collecte en cours).
--    Un point bloquant empêche l'envoi en revue ET la publication : c'est la
--    base qui refuse, pas seulement l'interface.
-- 5. Pour publier, l'équipe confirme un quatrième critère : authenticité
--    (devis et photos vérifiés, fournisseur contacté).
--
-- Une campagne déjà « en revue » au moment de cette mise à jour devra
-- passer le contrôle pour être publiée (devis, prix) : l'équipe peut
-- demander des corrections au club.
-- =====================================================================

-- Texte comparable : minuscules, sans accents, espaces simples.
create function public.normalize_text(p text) returns text
language sql immutable set search_path = '' as $$
  select trim(regexp_replace(
    translate(lower(coalesce(p, '')), 'àâäáãéèêëíìîïóòôöõúùûüçñœ''’', 'aaaaaeeeeiiiiooooouuuucno  '),
    '\s+', ' ', 'g'));
$$;

-- ---------------------------------------------------------------------
-- Référentiel des prix
-- ---------------------------------------------------------------------
create table public.price_references (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 3 and 120),
  category text not null check (category in (
    'Infrastructure', 'Formation des jeunes', 'Déplacement', 'Transport', 'Santé', 'Équipement'
  )),
  unit text not null check (char_length(unit) between 1 and 30),
  unit_price numeric(12, 2) not null check (unit_price > 0 and unit_price <= 1000000),
  keywords text[] not null default '{}' check (cardinality(keywords) <= 12),
  source text not null default '' check (char_length(source) <= 300),
  active boolean not null default true,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index price_references_label_idx on public.price_references (lower(label));
create trigger price_references_touch before update on public.price_references
  for each row execute function public.touch_updated_at();

-- Valeurs de départ (USD, marché de Kinshasa) : indicatives, à confirmer ou
-- corriger par l'équipe conformité dans Back-office → Référentiel des prix.
insert into public.price_references (label, category, unit, unit_price, keywords, source) values
  ('Maillot de match', 'Équipement', 'pièce', 25, '{maillot,vareuse}', 'Valeur de départ indicative, à confirmer'),
  ('Tenue d''entraînement (maillot, short, chaussettes)', 'Équipement', 'tenue', 20, '{tenue,survetement,short,chaussette}', 'Valeur de départ indicative, à confirmer'),
  ('Ballon de football taille 5', 'Équipement', 'pièce', 30, '{ballon}', 'Valeur de départ indicative, à confirmer'),
  ('Chaussures de football', 'Équipement', 'paire', 45, '{chaussure,crampon}', 'Valeur de départ indicative, à confirmer'),
  ('Protège-tibias', 'Équipement', 'paire', 8, '{protege-tibia,protege tibia,jambiere}', 'Valeur de départ indicative, à confirmer'),
  ('Gants de gardien', 'Équipement', 'paire', 35, '{gant}', 'Valeur de départ indicative, à confirmer'),
  ('Filets de but', 'Infrastructure', 'paire', 120, '{filet}', 'Valeur de départ indicative, à confirmer'),
  ('Buts métalliques de football à 11', 'Infrastructure', 'paire', 1500, '{buts metalliques,cage,poteau}', 'Valeur de départ indicative, à confirmer'),
  ('Gazon synthétique posé', 'Infrastructure', 'm²', 25, '{gazon synthetique,pelouse synthetique,synthetique}', 'Valeur de départ indicative, à confirmer'),
  ('Rénovation de pelouse naturelle (préparation, semis, engrais)', 'Infrastructure', 'm²', 6, '{pelouse,gazon,engazonnement,semis}', 'Valeur de départ indicative, à confirmer'),
  ('Système d''arrosage du terrain', 'Infrastructure', 'm²', 4, '{arrosage,irrigation}', 'Valeur de départ indicative, à confirmer'),
  ('Projecteur LED d''éclairage de terrain', 'Infrastructure', 'pièce', 900, '{projecteur,eclairage}', 'Valeur de départ indicative, à confirmer'),
  ('Siège de tribune', 'Infrastructure', 'pièce', 25, '{siege,gradin}', 'Valeur de départ indicative, à confirmer'),
  ('Ciment (sac de 50 kg)', 'Infrastructure', 'sac', 12, '{ciment}', 'Valeur de départ indicative, à confirmer'),
  ('Peinture (seau de 20 L)', 'Infrastructure', 'seau', 60, '{peinture}', 'Valeur de départ indicative, à confirmer'),
  ('Bus de 30 places d''occasion', 'Transport', 'véhicule', 35000, '{bus,autocar,minibus}', 'Valeur de départ indicative, à confirmer'),
  ('Location de bus de 30 places', 'Déplacement', 'jour', 350, '{location de bus,location bus,location d''autocar}', 'Valeur de départ indicative, à confirmer'),
  ('Billet d''avion aller-retour en RDC', 'Déplacement', 'personne', 450, '{billet d''avion,avion}', 'Valeur de départ indicative, à confirmer'),
  ('Hébergement en déplacement', 'Déplacement', 'nuit par personne', 35, '{hebergement,hotel,nuitee}', 'Valeur de départ indicative, à confirmer'),
  ('Repas en déplacement', 'Déplacement', 'jour par personne', 15, '{repas,restauration,nourriture}', 'Valeur de départ indicative, à confirmer'),
  ('Trousse médicale de terrain', 'Santé', 'pièce', 150, '{trousse,pharmacie,medical}', 'Valeur de départ indicative, à confirmer'),
  ('Visite médicale de joueur', 'Santé', 'joueur', 25, '{visite medicale,examen medical,bilan medical}', 'Valeur de départ indicative, à confirmer'),
  ('Stage de formation d''entraîneur', 'Formation des jeunes', 'personne', 300, '{formation d''entraineur,stage d''entraineur,licence d''entraineur}', 'Valeur de départ indicative, à confirmer');

-- Les mots-clés sont comparés au texte normalisé du poste (sans accents ni apostrophes).
update public.price_references
   set keywords = (select coalesce(array_agg(distinct public.normalize_text(k)), '{}') from unnest(keywords) k);

-- ---------------------------------------------------------------------
-- Budget : quantité et article du référentiel
-- ---------------------------------------------------------------------
alter table public.campaign_budget_lines
  add column quantity numeric(12, 2) not null default 1 check (quantity > 0 and quantity <= 1000000),
  add column reference_id uuid references public.price_references (id) on delete set null;

-- Niveau du dernier contrôle (ok, warn, block), pour la liste du back-office
-- et le badge « prix contrôlés » de la page publique.
alter table public.campaigns
  add column compliance_level text check (compliance_level in ('ok', 'warn', 'block')),
  add column compliance_checked_at timestamptz;

-- ---------------------------------------------------------------------
-- Devis et justificatifs de prix (bucket privé)
-- ---------------------------------------------------------------------
create table public.campaign_documents (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  kind text not null check (kind in ('devis', 'facture', 'autre')),
  supplier text not null default '' check (char_length(supplier) <= 120),
  file_path text not null unique check (char_length(file_path) <= 300),
  file_name text not null check (char_length(file_name) between 1 and 160),
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes int not null check (size_bytes > 0 and size_bytes <= 5242880),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index campaign_documents_campaign_idx on public.campaign_documents (campaign_id, created_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-documents', 'campaign-documents', false, 4194304, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Contrôle automatique
-- ---------------------------------------------------------------------
create function public.format_ratio(p numeric) returns text
language sql immutable set search_path = '' as $$
  select replace(to_char(round(p, 1), 'FM9999990.0'), '.', ',');
$$;

create function public.compute_campaign_compliance(p_campaign_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.campaigns;
  v_club_status public.club_status;
  v_lines jsonb;
  v_checks jsonb := '[]'::jsonb;
  v_block jsonb;
  v_warn int;
  v_unknown int;
  v_high jsonb;
  v_count int;
  v_title text;
begin
  select * into c from public.campaigns where id = p_campaign_id;
  if c.id is null then
    raise exception 'Campagne introuvable.';
  end if;

  -- Postes du budget comparés au référentiel (article choisi, sinon mots-clés).
  with lines as (
    select l.position, l.label, l.amount, l.quantity,
           round(l.amount / l.quantity, 2) as unit_price,
           coalesce(chosen.id, auto.id) as ref_id,
           case when chosen.id is not null then 'choisi' when auto.id is not null then 'mots-cles' end as matched
      from public.campaign_budget_lines l
      left join public.price_references chosen on chosen.id = l.reference_id and chosen.active
      left join lateral (
        select r.id
          from public.price_references r, unnest(r.keywords) k
         where chosen.id is null and r.active and k <> ''
           and position(k in public.normalize_text(l.label)) > 0
         order by char_length(k) desc, r.unit_price
         limit 1
      ) auto on true
     where l.campaign_id = c.id
  ), rated as (
    select x.*, r.label as ref_label, r.unit as ref_unit, r.unit_price as ref_price,
           r.confirmed_at is not null as ref_confirmed,
           case when r.id is null then null else round(x.unit_price / r.unit_price, 2) end as ratio
      from lines x
      left join public.price_references r on r.id = x.ref_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'position', position, 'label', label, 'amount', amount, 'quantity', quantity, 'unit_price', unit_price,
           'reference_id', ref_id, 'reference_label', ref_label, 'reference_unit', ref_unit, 'reference_price', ref_price,
           'reference_confirmed', ref_confirmed, 'matched', matched, 'ratio', ratio,
           'level', case
             when ratio is null then 'unknown'
             when ratio >= 3 and ref_confirmed and matched = 'choisi' then 'block'
             when ratio >= 1.5 then 'warn'
             else 'ok' end
         ) order by position), '[]'::jsonb)
    into v_lines
    from rated;

  -- 1. Club vérifié
  select status into v_club_status from public.clubs where id = c.club_id;
  v_checks := v_checks || jsonb_build_object('id', 'club', 'label', 'Club vérifié par Tribune',
    'level', case when v_club_status = 'verified' then 'ok' else 'block' end,
    'detail', case when v_club_status = 'verified' then 'Existence, représentant légal et compte de versement vérifiés.'
                   else 'Le club n''est pas (ou plus) vérifié.' end);

  -- 2. Photo du projet
  v_checks := v_checks || jsonb_build_object('id', 'photo', 'label', 'Photo de la situation actuelle',
    'level', case when c.cover_path is not null then 'ok' else 'block' end,
    'detail', case when c.cover_path is not null then 'Les supporters voient l''état actuel avant de contribuer.'
                   else 'Ajoutez une photo qui montre la situation actuelle (la pelouse, le vestiaire, le matériel…).' end);

  -- 3. Devis
  select count(*) into v_count from public.campaign_documents where campaign_id = c.id and kind in ('devis', 'facture');
  v_checks := v_checks || jsonb_build_object('id', 'devis', 'label', 'Devis de fournisseur',
    'level', case when v_count > 0 then 'ok' else 'block' end,
    'detail', case when v_count > 0 then v_count || ' devis ou facture(s) joint(s), à recouper avec le budget.'
                   else 'Joignez au moins un devis ou une facture pro forma d''un fournisseur.' end);

  -- 4. Prix
  select x into v_block from jsonb_array_elements(v_lines) x where x ->> 'level' = 'block' order by (x ->> 'ratio')::numeric desc limit 1;
  select count(*) filter (where x ->> 'level' = 'warn'), count(*) filter (where x ->> 'level' = 'unknown')
    into v_warn, v_unknown
    from jsonb_array_elements(v_lines) x;
  select x into v_high from jsonb_array_elements(v_lines) x
   where x ->> 'level' = 'warn' and (x ->> 'ratio')::numeric >= 3 order by (x ->> 'ratio')::numeric desc limit 1;
  v_checks := v_checks || jsonb_build_object('id', 'prix', 'label', 'Prix comparés au référentiel',
    'level', case when v_block is not null then 'block' when v_warn + v_unknown > 0 then 'warn' else 'ok' end,
    'detail', case
      when v_block is not null then format('« %s » coûte %s fois le prix de référence (%s $ par %s). Corrigez le montant ou la quantité.',
        v_block ->> 'label', public.format_ratio((v_block ->> 'ratio')::numeric),
        trim_scale((v_block ->> 'reference_price')::numeric), v_block ->> 'reference_unit')
      when v_high is not null then format('« %s » semble coûter %s fois le prix de référence « %s » (%s $ par %s) : à vérifier avec le devis.',
        v_high ->> 'label', public.format_ratio((v_high ->> 'ratio')::numeric), v_high ->> 'reference_label',
        trim_scale((v_high ->> 'reference_price')::numeric), v_high ->> 'reference_unit')
      when v_warn > 0 then v_warn || ' poste(s) au-dessus du prix de référence (1,5 fois ou plus) : le devis doit le justifier.'
      when v_unknown > 0 then v_unknown || ' poste(s) sans prix de référence : le devis fait foi.'
      else 'Tous les postes sont au prix de référence.' end);

  -- 5. Texte copié d'une campagne d'un autre club
  select o.title into v_title
    from public.campaigns o
   where o.id <> c.id and o.club_id <> c.club_id and char_length(c.description) >= 80
     and o.created_at < c.created_at  -- la plus ancienne est l'originale : seule la copie est bloquée
     and public.normalize_text(o.description) = public.normalize_text(c.description)
   limit 1;
  v_checks := v_checks || jsonb_build_object('id', 'original', 'label', 'Description originale',
    'level', case when v_title is not null then 'block' else 'ok' end,
    'detail', case when v_title is not null then format('La description est identique à celle de « %s », campagne d''un autre club.', v_title)
                   else 'Aucune copie d''une autre campagne.' end);

  -- 6. Antécédents du club
  select count(*) into v_count
    from public.campaign_milestones m join public.campaigns o on o.id = m.campaign_id
   where o.club_id = c.club_id and o.id <> c.id and o.status = 'funded' and m.done_at is null
     and o.closed_at < now() - interval '90 days';
  select count(*) into v_warn from public.campaigns o where o.club_id = c.club_id and o.id <> c.id and o.status = 'published';
  v_checks := v_checks || jsonb_build_object('id', 'historique', 'label', 'Antécédents du club',
    'level', case when v_count + v_warn > 0 then 'warn' else 'ok' end,
    'detail', case
      when v_count > 0 then v_count || ' jalon(s) d''une campagne financée il y a plus de 3 mois toujours sans preuve.'
      when v_warn > 0 then 'Une autre campagne du club est déjà en cours de collecte.'
      else 'Aucun jalon en retard, aucune autre collecte en cours.' end);

  return jsonb_build_object(
    'level', case
      when exists (select 1 from jsonb_array_elements(v_checks) x where x ->> 'level' = 'block') then 'block'
      when exists (select 1 from jsonb_array_elements(v_checks) x where x ->> 'level' = 'warn') then 'warn'
      else 'ok' end,
    'checks', v_checks,
    'lines', v_lines,
    'checked_at', now());
end $$;

-- Lecture du contrôle : membres du club et équipe Tribune.
create function public.campaign_compliance(p_campaign_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_club uuid;
begin
  perform public.require_user();
  select club_id into v_club from public.campaigns where id = p_campaign_id;
  if v_club is null or not (public.is_club_member(v_club) or public.is_staff()) then
    raise exception 'Campagne introuvable.' using errcode = '42501';
  end if;
  return public.compute_campaign_compliance(p_campaign_id);
end $$;

-- Premier point bloquant d'un contrôle, pour le message d'erreur.
create function public.first_blocking(p_report jsonb) returns text
language sql immutable set search_path = '' as $$
  select x ->> 'detail' from jsonb_array_elements(p_report -> 'checks') x where x ->> 'level' = 'block' limit 1;
$$;

-- ---------------------------------------------------------------------
-- Référentiel : modifié par l'équipe conformité (enregistrer = confirmer)
-- ---------------------------------------------------------------------
create function public.save_price_reference(
  p_id uuid, p_label text, p_category text, p_unit text, p_unit_price numeric,
  p_keywords text[], p_source text, p_active boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_staff uuid := public.require_staff();
  v_id uuid := p_id;
  v_old public.price_references;
  v_keywords text[];
begin
  if coalesce(char_length(trim(p_label)), 0) < 3 then
    raise exception 'Indiquez le nom de l''article ou du service.';
  end if;
  if p_unit_price is null or p_unit_price <= 0 then
    raise exception 'Le prix de référence doit être un montant positif.';
  end if;
  if coalesce(trim(p_source), '') = '' then
    raise exception 'Indiquez la source du prix (devis reçus, relevé de marché, facture…).';
  end if;
  select coalesce(array_agg(distinct k), '{}') into v_keywords
    from (select public.normalize_text(k) as k from unnest(coalesce(p_keywords, '{}')) k) t
   where char_length(k) >= 3;

  if v_id is null then
    insert into public.price_references (label, category, unit, unit_price, keywords, source, active, confirmed_at, confirmed_by)
    values (trim(p_label), p_category, trim(p_unit), p_unit_price, v_keywords, trim(p_source), coalesce(p_active, true), now(), v_staff)
    returning id into v_id;
  else
    select * into v_old from public.price_references where id = v_id for update;
    if v_old.id is null then
      raise exception 'Prix de référence introuvable.';
    end if;
    update public.price_references
       set label = trim(p_label), category = p_category, unit = trim(p_unit), unit_price = p_unit_price,
           keywords = v_keywords, source = trim(p_source), active = coalesce(p_active, true),
           confirmed_at = now(), confirmed_by = v_staff
     where id = v_id;
  end if;
  perform public.write_audit('prix_reference.enregistre', 'price_reference', v_id::text, jsonb_build_object(
    'article', trim(p_label), 'prix', p_unit_price, 'unite', trim(p_unit), 'ancien_prix', v_old.unit_price,
    'source', trim(p_source), 'actif', coalesce(p_active, true)));
  return v_id;
exception
  when unique_violation then
    raise exception 'Un article porte déjà ce nom dans le référentiel.';
end $$;

-- ---------------------------------------------------------------------
-- Brouillon : quantité et article du référentiel pour chaque poste
-- (même fonction que la version « paramètres des campagnes », plus ces deux champs)
-- ---------------------------------------------------------------------
create or replace function public.save_campaign_draft(
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
  if exists (
    select 1
      from jsonb_array_elements(coalesce(p_budget, '[]'::jsonb)) t(item),
           lateral (select coalesce(nullif(trim(t.item ->> 'quantity'), ''), '1') as q) v
     where coalesce(trim(t.item ->> 'label'), '') <> ''
       and case when v.q ~ '^[0-9]{1,7}([.][0-9]{1,2})?$' then v.q::numeric <= 0 or v.q::numeric > 1000000 else true end
  ) then
    raise exception 'La quantité de chaque poste doit être un nombre positif.';
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
  insert into public.campaign_budget_lines (campaign_id, position, label, amount, quantity, reference_id)
  select v_id, (t.ord - 1)::int, trim(t.item ->> 'label'), (t.item ->> 'amount')::numeric,
         coalesce(nullif(trim(t.item ->> 'quantity'), '')::numeric, 1),
         (select r.id from public.price_references r where r.id::text = t.item ->> 'reference_id' and r.active)
    from jsonb_array_elements(coalesce(p_budget, '[]'::jsonb)) with ordinality as t(item, ord)
   where coalesce(trim(t.item ->> 'label'), '') <> '';

  delete from public.campaign_milestones where campaign_id = v_id;
  insert into public.campaign_milestones (campaign_id, position, label, target_label)
  select v_id, (t.ord - 1)::int, trim(t.item ->> 'label'), coalesce(trim(t.item ->> 'target'), '')
    from jsonb_array_elements(coalesce(p_milestones, '[]'::jsonb)) with ordinality as t(item, ord)
   where coalesce(trim(t.item ->> 'label'), '') <> '';

  update public.campaigns
     set compliance_level = (public.compute_campaign_compliance(v_id) ->> 'level'), compliance_checked_at = now()
   where id = v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Envoi en revue : refusé si le contrôle automatique bloque
-- ---------------------------------------------------------------------
create or replace function public.submit_campaign(p_campaign_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  c public.campaigns;
  v_budget numeric;
  v_report jsonb;
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
  v_report := public.compute_campaign_compliance(c.id);
  if v_report ->> 'level' = 'block' then
    raise exception 'Contrôle automatique : %', public.first_blocking(v_report);
  end if;

  update public.campaigns
     set status = 'in_review', submitted_at = now(), end_date = public.kinshasa_today() + c.duration_days - 1,
         compliance_level = v_report ->> 'level', compliance_checked_at = now()
   where id = c.id;
  perform public.write_audit('campagne.soumise', 'campaign', c.id::text, jsonb_build_object('controle', v_report -> 'checks'));
end $$;

-- ---------------------------------------------------------------------
-- Publication : quatre critères, et le contrôle automatique sans point bloquant
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
  v_report jsonb;
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
  if p_decision = 'approve' and not coalesce(p_criteria, '{}') @> array['clarte', 'faisabilite', 'coherence', 'authenticite'] then
    raise exception 'Pour publier, confirmez les quatre critères d''instruction : clarté, faisabilité, cohérence et authenticité.';
  end if;
  if p_decision = 'approve' and c.goal_amount > 20000 and not public.is_admin() then
    raise exception 'Au-delà de 20 000, la publication doit être validée par un administrateur.';
  end if;
  if p_decision = 'approve' and not exists (select 1 from public.clubs where id = c.club_id and status = 'verified') then
    raise exception 'Le club n''est pas vérifié.';
  end if;
  v_report := public.compute_campaign_compliance(c.id);
  if p_decision = 'approve' and v_report ->> 'level' = 'block' then
    raise exception 'Publication impossible, contrôle automatique : %', public.first_blocking(v_report);
  end if;

  update public.campaigns
     set status = v_new, review_note = nullif(trim(p_note), ''), reviewed_by = v_staff, reviewed_at = now(),
         published_at = case when v_new = 'published' then now() else published_at end,
         end_date = case when v_new = 'published' then public.kinshasa_today() + c.duration_days - 1 else end_date end,
         compliance_level = v_report ->> 'level', compliance_checked_at = now()
   where id = c.id;

  if v_new = 'published' then
    select publication_fee into v_fee from public.platform_settings;
    if v_fee > 0 then
      insert into public.publication_fees (campaign_id, amount) values (c.id, v_fee)
      on conflict (campaign_id) do nothing;
    end if;
  end if;

  perform public.write_audit('campagne.' || p_decision, 'campaign', c.id::text,
    jsonb_build_object('note', p_note, 'controle', v_report -> 'checks') || case when v_new = 'published'
      then jsonb_build_object('criteres', to_jsonb(p_criteria), 'frais_publication', coalesce(v_fee, 0),
        'duree_jours', c.duration_days, 'fin', public.kinshasa_today() + c.duration_days - 1, 'postes', v_report -> 'lines')
      else '{}'::jsonb end);
end $$;

-- Niveau des campagnes existantes (brouillons et revues en cours).
update public.campaigns
   set compliance_level = public.compute_campaign_compliance(id) ->> 'level', compliance_checked_at = now()
 where status in ('draft', 'changes_requested', 'in_review');

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
alter table public.price_references enable row level security;
alter table public.campaign_documents enable row level security;
revoke all on public.price_references, public.campaign_documents from anon, authenticated;
grant select on public.price_references to anon, authenticated;
grant select on public.campaign_documents to authenticated;

create policy "référentiel des prix : lecture (actifs), équipe (tous)" on public.price_references
  for select to anon, authenticated using (active or public.is_staff());
create policy "devis : membres du club et équipe" on public.campaign_documents
  for select to authenticated using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and (public.is_club_member(c.club_id) or public.is_staff()))
  );

revoke execute on function
  public.normalize_text(text),
  public.format_ratio(numeric),
  public.compute_campaign_compliance(uuid),
  public.first_blocking(jsonb),
  public.campaign_compliance(uuid),
  public.save_price_reference(uuid, text, text, text, numeric, text[], text, boolean)
from public, anon, authenticated;

grant execute on function
  public.campaign_compliance(uuid),
  public.save_price_reference(uuid, text, text, text, numeric, text[], text, boolean)
to authenticated;
