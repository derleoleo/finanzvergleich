-- Altersvorsorgedepot und Netto-/Bruttopolice speicherbar machen (Audit F14).
-- Bisher blieben beide Rechner reine Browser-Entwürfe und tauchten weder in
-- „Alle Ergebnisse" noch im Backup auf. Aufbau wie bei den vier bestehenden
-- Rechner-Tabellen: eine Zeile je Berechnung, Eingaben und Ergebnis als jsonb.
-- Im Supabase SQL-Editor ausführen.

create table if not exists public.avd_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  name text not null,
  form jsonb not null,
  results jsonb
);

create table if not exists public.net_policy_calculations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_date timestamptz not null default now(),
  name text not null,
  form jsonb not null,
  results jsonb
);

create index if not exists avd_calculations_user_idx
  on public.avd_calculations (user_id, created_date desc);
create index if not exists net_policy_calculations_user_idx
  on public.net_policy_calculations (user_id, created_date desc);

alter table public.avd_calculations enable row level security;
alter table public.net_policy_calculations enable row level security;

-- Gleiche Trennung wie bei den übrigen Tabellen: nur eigene Zeilen
drop policy if exists own_data on public.avd_calculations;
create policy own_data
  on public.avd_calculations
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists own_data on public.net_policy_calculations;
create policy own_data
  on public.net_policy_calculations
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Beide Rechner sind Premium; das Kontingent des kostenlosen Plans greift
-- trotzdem, damit die Zählung vollständig bleibt.
drop trigger if exists free_kontingent on public.avd_calculations;
create trigger free_kontingent
  before insert on public.avd_calculations
  for each row execute function public.pruefe_free_kontingent();

drop trigger if exists free_kontingent on public.net_policy_calculations;
create trigger free_kontingent
  before insert on public.net_policy_calculations
  for each row execute function public.pruefe_free_kontingent();

-- Hinweis: Die Zählfunktion berechnungen_dieser_monat() zählt weiterhin nur
-- die vier ursprünglichen Tabellen. Wer das Kontingent auch auf die neuen
-- Tabellen beziehen will, ergänzt sie dort.
