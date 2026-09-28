-- Kontingent des kostenlosen Plans serverseitig durchsetzen.
-- Bisher wurde nur im Browser geprüft (SubscriptionContext), das lässt sich umgehen.
-- Im Supabase SQL-Editor ausführen (oder via supabase db push).
--
-- Regel: Ohne aktives Abo (status active/trialing) sind pro Kalendermonat
-- insgesamt 3 gespeicherte Berechnungen über alle vier Rechner-Tabellen erlaubt.

create or replace function public.hat_aktives_abo(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'trialing')
      -- Ohne Stripe-Abo (Testcode) beendet kein Ereignis den Zugang,
      -- deshalb zählt dort das Enddatum.
      and (
        s.stripe_subscription_id is not null
        or s.current_period_end is null
        or s.current_period_end > now()
      )
  );
$$;

create or replace function public.berechnungen_dieser_monat(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select (
    (select count(*) from public.calculations
      where user_id = p_user_id and created_at >= date_trunc('month', now()))
  + (select count(*) from public.single_payment_calculations
      where user_id = p_user_id and created_at >= date_trunc('month', now()))
  + (select count(*) from public.best_advice_calculations
      where user_id = p_user_id and created_at >= date_trunc('month', now()))
  + (select count(*) from public.pension_gap_calculations
      where user_id = p_user_id and created_at >= date_trunc('month', now()))
  )::int;
$$;

create or replace function public.pruefe_free_kontingent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.hat_aktives_abo(new.user_id) then
    return new;
  end if;

  if public.berechnungen_dieser_monat(new.user_id) >= 3 then
    raise exception 'Kontingent erreicht: Im kostenlosen Plan sind 3 Berechnungen pro Monat möglich.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists free_kontingent on public.calculations;
create trigger free_kontingent
  before insert on public.calculations
  for each row execute function public.pruefe_free_kontingent();

drop trigger if exists free_kontingent on public.single_payment_calculations;
create trigger free_kontingent
  before insert on public.single_payment_calculations
  for each row execute function public.pruefe_free_kontingent();

drop trigger if exists free_kontingent on public.best_advice_calculations;
create trigger free_kontingent
  before insert on public.best_advice_calculations
  for each row execute function public.pruefe_free_kontingent();

drop trigger if exists free_kontingent on public.pension_gap_calculations;
create trigger free_kontingent
  before insert on public.pension_gap_calculations
  for each row execute function public.pruefe_free_kontingent();
