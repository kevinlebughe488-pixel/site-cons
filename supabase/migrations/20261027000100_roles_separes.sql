-- =====================================================================
-- Rôles séparés : un compte n'a que les droits de son rôle.
--
-- Avant, l'équipe Tribune (conformité, administrateur) héritait des droits
-- du supporter : contribuer, déclarer une pièce d'identité, inscrire ou
-- gérer un club. Désormais :
--   - seul un supporter contribue et déclare son identité ;
--   - seuls un supporter (demande en cours) ou un gestionnaire sont membres d'un club ;
--   - le rôle « gestionnaire de club » suppose d'être rattaché à un club ;
--   - l'équipe Tribune voit les clubs par ses propres droits, jamais comme membre.
-- =====================================================================

-- Membre d'un club, et seulement avec un rôle « club » : un compte de l'équipe
-- qui serait resté rattaché à un club ne peut pas agir comme gestionnaire.
create or replace function public.is_club_member(p_club_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
      from public.club_members m
      join public.profiles p on p.id = m.user_id
     where m.club_id = p_club_id and m.user_id = auth.uid() and p.role in ('supporter', 'club_manager')
  );
$$;

-- Contributions : uniquement des comptes supporters (elles sont écrites par le
-- serveur avec la clé service_role, d'où un déclencheur plutôt qu'une règle RLS).
create function public.check_contribution_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = new.user_id and role = 'supporter') then
    raise exception 'Seuls les comptes supporters peuvent contribuer.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger contributions_check_role
  before insert on public.contributions
  for each row execute function public.check_contribution_role();

-- Membres d'un club : supporters (demande d'inscription) et gestionnaires seulement.
create function public.check_club_member_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id = new.user_id and role in ('supporter', 'club_manager')) then
    raise exception 'Les comptes de l''équipe Tribune ne peuvent pas gérer un club.' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger club_members_check_role
  before insert or update of user_id on public.club_members
  for each row execute function public.check_club_member_role();

-- Changement de rôle : cohérent avec le rattachement à un club.
create function public.check_role_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_member boolean := exists (select 1 from public.club_members where user_id = new.id);
begin
  if new.role in ('compliance', 'admin') and v_member then
    raise exception 'Ce compte gère un club : il ne peut pas faire partie de l''équipe Tribune.';
  end if;
  if new.role = 'club_manager' and not v_member then
    raise exception 'Pour faire de ce compte un gestionnaire, ajoutez-le à un club depuis la page Clubs.';
  end if;
  return new;
end $$;

create trigger profiles_check_role_change
  before update of role on public.profiles
  for each row when (new.role is distinct from old.role)
  execute function public.check_role_change();

-- Déclaration d'identité (vigilance sur les contributions) : supporters seulement.
create or replace function public.declare_identity(p_doc_type text, p_doc_last4 text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.require_user();
  v_status public.kyc_status;
begin
  if public.current_app_role() <> 'supporter' then
    raise exception 'Seuls les comptes supporters déclarent une pièce d''identité.' using errcode = '42501';
  end if;
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

-- Les fonctions de déclencheur ne s'appellent pas directement.
revoke execute on function public.check_contribution_role(), public.check_club_member_role(),
  public.check_role_change() from public, anon, authenticated;

-- Signale les comptes déjà incohérents (rien n'est supprimé automatiquement).
do $$
declare
  r record;
begin
  for r in
    select p.email, p.role, c.name
      from public.club_members m
      join public.profiles p on p.id = m.user_id
      join public.clubs c on c.id = m.club_id
     where p.role in ('compliance', 'admin')
  loop
    raise notice 'À corriger : % (%) est encore membre du club « % ».', r.email, r.role, r.name;
  end loop;
  for r in
    select p.email from public.profiles p
     where p.role = 'club_manager' and not exists (select 1 from public.club_members m where m.user_id = p.id)
  loop
    raise notice 'À corriger : % est gestionnaire sans club.', r.email;
  end loop;
end $$;
