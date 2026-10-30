-- =====================================================================
-- Connexion avec Google.
--
-- Le site parle lui-même à Google (OpenID Connect : code, PKCE, nonce). Le
-- fournisseur Google de Supabase reste désactivé : il relierait tout seul un
-- compte Google à un compte existant de même adresse e-mail, et ouvrirait une
-- session sans code SMS.
--
--   - Compte Google déjà relié : code SMS de connexion, comme avec le mot de passe.
--   - Adresse Google (vérifiée par Google) égale à celle d'un compte Tribune :
--     le compte n'est relié qu'une fois saisi le code SMS envoyé au numéro de
--     ce compte. Avoir l'adresse ne suffit pas.
--   - Sinon : inscription (numéro, consentement), puis code SMS.
--
-- Tout est écrit par le serveur (clé service_role).
-- =====================================================================

-- Comptes Google reliés. On reconnaît un compte Google à son identifiant
-- (« sub »), qui ne change jamais, et non à son adresse e-mail.
create table public.oauth_identities (
  provider text not null check (provider in ('google')),
  subject text not null check (char_length(subject) between 1 and 255),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Adresse du compte Google au moment où il a été relié (affichage).
  email text,
  created_at timestamptz not null default now(),
  primary key (provider, subject),
  -- Un seul compte Google par compte Tribune.
  unique (provider, user_id)
);

-- Connexions Google en cours, du clic sur le bouton jusqu'au code SMS.
-- Chaque ligne n'est traitée qu'une fois : un retour de Google rechargé ou
-- reçu deux fois renvoie vers la même étape, sans nouvel échange ni nouveau SMS.
create table public.oauth_logins (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('google')),
  -- Empreintes SHA-256 du paramètre « state » et du cookie du navigateur qui a
  -- commencé : un lien de retour volé ne sert à rien dans un autre navigateur.
  state_hash text not null unique,
  browser_hash text not null,
  code_verifier text not null,
  nonce text not null,
  return_to text,
  expires_at timestamptz not null,
  -- Retour de Google, traité une seule fois.
  claimed_at timestamptz,
  outcome text check (outcome in ('login', 'link', 'signup', 'refused')),
  refusal text,
  subject text,
  email text,
  first_name text,
  last_name text,
  -- Compte concerné (connexion, liaison) ou créé (inscription).
  user_id uuid references public.profiles (id) on delete cascade,
  -- Formulaire d'inscription envoyé (une seule création de compte).
  signup_started_at timestamptz,
  created_at timestamptz not null default now()
);

create index oauth_logins_browser on public.oauth_logins (browser_hash, claimed_at desc);

alter table public.oauth_identities enable row level security;
alter table public.oauth_logins enable row level security;
revoke all on public.oauth_identities, public.oauth_logins from anon, authenticated;

-- Chacun voit si son propre compte est relié à Google (page « Mon compte »).
grant select on public.oauth_identities to authenticated;
create policy "identité google : la sienne" on public.oauth_identities
  for select to authenticated using (user_id = (select auth.uid()));

-- Codes SMS envoyés pendant une connexion Google : ils gardent la référence de
-- la connexion (pour relier le compte une fois le code saisi, et pour retrouver
-- le code si le retour de Google est rechargé).
alter table public.sms_challenges drop constraint sms_challenges_purpose_check;
alter table public.sms_challenges add constraint sms_challenges_purpose_check
  check (purpose in ('signup', 'login', 'reset', 'link'));
alter table public.sms_challenges add column oauth_login_id uuid references public.oauth_logins (id) on delete cascade;
create index sms_challenges_oauth_login on public.sms_challenges (oauth_login_id) where oauth_login_id is not null;
