-- =====================================================================
-- Photos de la situation actuelle d'une campagne.
--
-- Avant de contribuer, le supporter voit de quoi il s'agit : l'état actuel
-- de la pelouse pour une rénovation, le vestiaire, le matériel usé… Le club
-- ajoute jusqu'à 6 photos, chacune avec une légende et la date de prise de
-- vue ; l'une d'elles sert de couverture (campaigns.cover_path).
--
-- Le contrôle automatique (compute_campaign_compliance) exige au moins une
-- photo, signale une photo de plus de 6 mois et bloque une photo identique
-- (même empreinte SHA-256, calculée par le serveur) à celle d'une campagne
-- antérieure d'un autre club.
--
-- Les photos sont dans le bucket public « campaign-images » ; les lignes ne
-- sont écrites que par le serveur, après vérification des droits. Le club
-- les modifie tant que le dossier est modifiable, l'équipe à tout moment.
-- =====================================================================

create table public.campaign_photos (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  file_path text not null unique check (char_length(file_path) <= 200),
  caption text not null check (char_length(caption) between 3 and 200),
  taken_on date,
  sha256 text check (sha256 ~ '^[0-9a-f]{64}$'),
  position int not null default 0,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index campaign_photos_campaign_idx on public.campaign_photos (campaign_id, position, created_at);
create index campaign_photos_sha_idx on public.campaign_photos (sha256) where sha256 is not null;

-- La photo de couverture existante devient la première photo de la campagne.
insert into public.campaign_photos (campaign_id, file_path, caption, created_at)
select id, cover_path, 'Photo du projet', coalesce(published_at, submitted_at, created_at)
  from public.campaigns
 where cover_path is not null;

-- ---------------------------------------------------------------------
-- Contrôle automatique : photos de la situation actuelle, photos copiées
-- (même fonction que « contrôle de conformité », points 2 et 5 complétés)
-- ---------------------------------------------------------------------
create or replace function public.compute_campaign_compliance(p_campaign_id uuid) returns jsonb
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
  v_last date;
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

  -- 2. Photos de la situation actuelle (légendées, récentes)
  select count(*), max(taken_on) into v_count, v_last from public.campaign_photos where campaign_id = c.id;
  v_checks := v_checks || jsonb_build_object('id', 'photo', 'label', 'Photos de la situation actuelle',
    'level', case when v_count = 0 then 'block'
                  when v_last is null or v_last < public.kinshasa_today() - 180 then 'warn'
                  else 'ok' end,
    'detail', case
      when v_count = 0 then 'Ajoutez au moins une photo légendée de la situation actuelle (la pelouse, le vestiaire, le matériel…).'
      when v_last is null then 'Date des photos inconnue : vérifiez qu''elles montrent bien l''état actuel.'
      when v_last < public.kinshasa_today() - 180 then 'La photo la plus récente date de plus de 6 mois : montrez l''état actuel.'
      else v_count || ' photo(s), la plus récente du ' || to_char(v_last, 'DD/MM/YYYY') || '.' end);

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

  -- 5. Texte ou photo copiés d'une campagne antérieure d'un autre club
  select o.title into v_title
    from public.campaigns o
   where o.id <> c.id and o.club_id <> c.club_id and char_length(c.description) >= 80
     and o.created_at < c.created_at  -- la plus ancienne est l'originale : seule la copie est bloquée
     and public.normalize_text(o.description) = public.normalize_text(c.description)
   limit 1;
  if v_title is not null then
    v_checks := v_checks || jsonb_build_object('id', 'original', 'label', 'Description et photos originales', 'level', 'block',
      'detail', format('La description est identique à celle de « %s », campagne d''un autre club.', v_title));
  else
    -- Même fichier (empreinte SHA-256) qu'une photo envoyée avant par un autre club.
    select o.title into v_title
      from public.campaign_photos p
      join public.campaign_photos q on q.sha256 = p.sha256 and q.campaign_id <> p.campaign_id and q.created_at < p.created_at
      join public.campaigns o on o.id = q.campaign_id
     where p.campaign_id = c.id and p.sha256 is not null and o.club_id <> c.club_id
     limit 1;
    v_checks := v_checks || jsonb_build_object('id', 'original', 'label', 'Description et photos originales',
      'level', case when v_title is not null then 'block' else 'ok' end,
      'detail', case when v_title is not null then format('Une photo est identique à celle de « %s », campagne d''un autre club.', v_title)
                     else 'Aucune copie d''une autre campagne.' end);
  end if;

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

update public.campaigns
   set compliance_level = public.compute_campaign_compliance(id) ->> 'level', compliance_checked_at = now()
 where status in ('draft', 'changes_requested', 'in_review');

-- ---------------------------------------------------------------------
-- Droits : lecture comme la campagne, écriture par le serveur uniquement
-- ---------------------------------------------------------------------
alter table public.campaign_photos enable row level security;
revoke all on public.campaign_photos from anon, authenticated;
grant select on public.campaign_photos to anon, authenticated;
create policy "photos : comme la campagne" on public.campaign_photos
  for select to anon, authenticated using (exists (select 1 from public.campaigns c where c.id = campaign_id));
