-- =====================================================================
-- Un numéro de téléphone = un seul compte.
--
-- La colonne profiles.phone est déjà unique, mais un même numéro pouvait
-- s'écrire de plusieurs façons (0812345678, 812345678, 00243812345678,
-- 243812345678) et passer plusieurs fois si quelqu'un appelait l'API sans
-- passer par le site. Le numéro est maintenant toujours ramené au format
-- international sans « + » (comme normalizeAnyPhone dans src/lib/phone.ts)
-- avant l'enregistrement, et un doublon est refusé avec un message clair.
-- =====================================================================

create function public.normalize_phone(p_phone text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if v = '' then
    return null;
  end if;
  if v like '00%' then
    v := substr(v, 3);
  end if;
  -- Numéros congolais écrits sans l'indicatif.
  if char_length(v) = 10 and v like '0%' and substr(v, 2, 1) in ('8', '9') then
    v := '243' || substr(v, 2);
  elsif char_length(v) = 9 and substr(v, 1, 1) in ('8', '9') then
    v := '243' || v;
  end if;
  return v;
end $$;

create function public.check_profile_phone() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.phone := public.normalize_phone(new.phone);
  if new.phone is not null and exists (
    select 1 from public.profiles where phone = new.phone and id <> new.id
  ) then
    raise exception 'Ce numéro de téléphone est déjà utilisé par un autre compte.' using errcode = '23505';
  end if;
  return new;
end $$;

-- « 0 » dans le nom : s'exécute avant les autres déclencheurs de la table.
create trigger profiles_0_phone
  before insert or update of phone on public.profiles
  for each row execute function public.check_profile_phone();

revoke execute on function public.normalize_phone(text), public.check_profile_phone() from public, anon, authenticated;

-- Signale les numéros existants qui deviendraient des doublons une fois normalisés
-- (rien n'est modifié automatiquement).
do $$
declare
  r record;
begin
  for r in
    select public.normalize_phone(phone) as tel, count(*) as n
      from public.profiles where phone is not null
     group by 1 having count(*) > 1
  loop
    raise notice 'À corriger : le numéro % est utilisé par % comptes.', r.tel, r.n;
  end loop;
end $$;
