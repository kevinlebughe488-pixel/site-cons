-- =====================================================================
-- Alignement sur le plan d'affaires de Plumes Capital (12/12/2025).
--
-- 1. Frais d'instruction et de publication (plan, § 5.2.4 et 11.2.2) :
--    facturés au club pour chaque campagne publiée, en plus de la
--    commission de 5 % sur les fonds collectés. Le plan prévoit 400 $
--    la première année et 500 $ ensuite : le montant en vigueur est un
--    réglage de la plateforme, modifié par un administrateur, et il est
--    figé sur la campagne au moment de la publication.
-- 2. Instruction sur critères (§ 7.1.1) : pour publier, l'équipe confirme
--    la clarté, la faisabilité et la cohérence du dossier ; les critères
--    sont inscrits au journal d'audit avec la décision.
-- 3. Encaissement séparé de l'instruction (§ 7.1.2) : seul un
--    administrateur enregistre le règlement des frais.
-- 4. Indicateurs de pilotage (§ 11.9) : agrégats réservés à l'équipe pour
--    comparer l'activité aux hypothèses du plan.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Réglages de la plateforme (une seule ligne)
-- ---------------------------------------------------------------------
create table public.platform_settings (
  id boolean primary key default true check (id),
  -- Frais d'instruction et de publication facturés au club par campagne publiée (USD).
  publication_fee numeric(12, 2) not null default 400 check (publication_fee between 0 and 10000),
  -- Début de l'année 1 du plan d'affaires (sert aux indicateurs de pilotage).
  launch_date date,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true);

create trigger platform_settings_touch before update on public.platform_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Frais de publication : une facture par campagne publiée
-- ---------------------------------------------------------------------
create table public.publication_fees (
  campaign_id uuid primary key references public.campaigns (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  invoiced_at timestamptz not null default now(),
  paid_at timestamptz,
  payment_ref text check (char_length(payment_ref) between 3 and 120),
  recorded_by uuid references public.profiles (id) on delete set null
);
create index publication_fees_unpaid_idx on public.publication_fees (invoiced_at) where paid_at is null;

-- ---------------------------------------------------------------------
-- Instruction : critères obligatoires et facturation à la publication
-- ---------------------------------------------------------------------
drop function public.review_campaign(uuid, text, text);

create function public.review_campaign(
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
         published_at = case when v_new = 'published' then now() else published_at end
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
      then jsonb_build_object('criteres', to_jsonb(p_criteria), 'frais_publication', coalesce(v_fee, 0))
      else '{}'::jsonb end);
end $$;

-- Règlement des frais par le club : enregistré par un administrateur, jamais
-- par la personne qui a instruit le dossier (séparation instruction / flux).
create function public.record_publication_fee_payment(p_campaign_id uuid, p_reference text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.require_admin();
  v_amount numeric;
begin
  if coalesce(char_length(trim(p_reference)), 0) < 3 then
    raise exception 'Indiquez la référence du paiement (reçu, transaction Mobile Money, virement).';
  end if;
  update public.publication_fees
     set paid_at = now(), payment_ref = trim(p_reference), recorded_by = v_admin
   where campaign_id = p_campaign_id and paid_at is null
  returning amount into v_amount;
  if v_amount is null then
    raise exception 'Aucuns frais à régler pour cette campagne.';
  end if;
  perform public.write_audit('frais.regles', 'campaign', p_campaign_id::text,
    jsonb_build_object('montant', v_amount, 'reference', trim(p_reference)));
end $$;

create function public.admin_update_settings(p_publication_fee numeric, p_launch_date date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := public.require_admin();
  v_old public.platform_settings;
begin
  if p_publication_fee is null or p_publication_fee < 0 or p_publication_fee > 10000 then
    raise exception 'Les frais de publication doivent être compris entre 0 et 10 000 $.';
  end if;
  select * into v_old from public.platform_settings for update;
  update public.platform_settings
     set publication_fee = p_publication_fee, launch_date = p_launch_date, updated_by = v_admin;
  perform public.write_audit('reglages.modifies', 'platform', null, jsonb_build_object(
    'frais_publication', jsonb_build_object('ancien', v_old.publication_fee, 'nouveau', p_publication_fee),
    'date_lancement', jsonb_build_object('ancienne', v_old.launch_date, 'nouvelle', p_launch_date)));
end $$;

-- ---------------------------------------------------------------------
-- Indicateurs de pilotage sur une période (plan, § 11.9)
-- ---------------------------------------------------------------------
create function public.plan_indicators(p_from timestamptz, p_to timestamptz)
returns table (
  published bigint, funded bigint, failed bigint, funded_raised numeric,
  commissions numeric, fees_invoiced numeric, fees_paid numeric
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_staff();
  return query select
    (select count(*) from public.campaigns where published_at >= p_from and published_at < p_to),
    (select count(*) from public.campaigns where status = 'funded' and closed_at >= p_from and closed_at < p_to),
    (select count(*) from public.campaigns where status = 'failed' and closed_at >= p_from and closed_at < p_to),
    (select coalesce(sum(raised_amount), 0) from public.campaigns
      where status = 'funded' and currency = 'USD' and closed_at >= p_from and closed_at < p_to),
    -- Commissions acquises : celles des campagnes financées (une campagne non financée est remboursée sans commission).
    (select coalesce(sum(x.commission), 0) from public.contributions x join public.campaigns c on c.id = x.campaign_id
      where c.status = 'funded' and c.currency = 'USD' and x.status = 'completed' and c.closed_at >= p_from and c.closed_at < p_to),
    (select coalesce(sum(amount), 0) from public.publication_fees where invoiced_at >= p_from and invoiced_at < p_to),
    (select coalesce(sum(amount), 0) from public.publication_fees where paid_at >= p_from and paid_at < p_to);
end $$;

-- ---------------------------------------------------------------------
-- Droits
-- ---------------------------------------------------------------------
alter table public.platform_settings enable row level security;
alter table public.publication_fees enable row level security;
revoke all on public.platform_settings, public.publication_fees from anon, authenticated;

-- Les tarifs sont publics : ils sont affichés avant tout dépôt de campagne.
grant select on public.platform_settings to anon, authenticated;
create policy "réglages : lecture publique" on public.platform_settings
  for select to anon, authenticated using (true);

grant select on public.publication_fees to authenticated;
create policy "frais : club concerné ou équipe" on public.publication_fees
  for select to authenticated using (
    public.is_staff() or exists (
      select 1 from public.campaigns c where c.id = campaign_id and public.is_club_member(c.club_id)
    )
  );

revoke execute on function
  public.review_campaign(uuid, text, text, text[]),
  public.record_publication_fee_payment(uuid, text),
  public.admin_update_settings(numeric, date),
  public.plan_indicators(timestamptz, timestamptz)
from public, anon, authenticated;

grant execute on function
  public.review_campaign(uuid, text, text, text[]),
  public.record_publication_fee_payment(uuid, text),
  public.admin_update_settings(numeric, date),
  public.plan_indicators(timestamptz, timestamptz)
to authenticated;
