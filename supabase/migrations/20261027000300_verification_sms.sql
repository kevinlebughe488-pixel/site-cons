-- =====================================================================
-- Vérification par SMS (double authentification).
--
-- Plus de lien par e-mail : à l'inscription, à chaque connexion et pour
-- changer de mot de passe, un code à 6 chiffres est envoyé par SMS au
-- numéro du compte. Le serveur seul crée et vérifie les codes (clé
-- service_role) : la table n'est lisible par aucun utilisateur.
-- =====================================================================

alter table public.profiles add column phone_verified_at timestamptz;

-- Les comptes existants ont déjà été créés et confirmés : leur numéro est
-- considéré comme vérifié (sinon une nouvelle inscription pourrait le reprendre).
update public.profiles set phone_verified_at = coalesce(phone_verified_at, created_at) where phone is not null;

create table public.sms_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purpose text not null check (purpose in ('signup', 'login', 'reset')),
  phone text not null,
  code_hash text not null,
  -- Rempli seulement en mode simulation (démo sans fournisseur SMS) pour afficher le code.
  demo_code text,
  attempts int not null default 0,
  return_to text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index sms_challenges_user_recent on public.sms_challenges (user_id, created_at desc);

alter table public.sms_challenges enable row level security;
revoke all on public.sms_challenges from anon, authenticated;

-- Le numéro sert de second facteur : on ne le change pas depuis son profil
-- sans vérification (sinon un tiers connecté pourrait détourner les codes).
revoke update (phone) on public.profiles from authenticated;
