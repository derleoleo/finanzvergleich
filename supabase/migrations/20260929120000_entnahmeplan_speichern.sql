-- Entnahmeplan speicherbar machen (Rest von Audit F14).
-- Aufbau wie avd_calculations: Eingaben als form, Kennzahlen als results.
-- Im Supabase SQL-Editor ausführen.

create table if not exists public.withdrawal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  name text not null,
  form jsonb not null,
  results jsonb
);

create index if not exists withdrawal_plans_user_idx
  on public.withdrawal_plans (user_id, created_date desc);

alter table public.withdrawal_plans enable row level security;

drop policy if exists own_data on public.withdrawal_plans;
create policy own_data
  on public.withdrawal_plans
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists free_kontingent on public.withdrawal_plans;
create trigger free_kontingent
  before insert on public.withdrawal_plans
  for each row execute function public.pruefe_free_kontingent();
