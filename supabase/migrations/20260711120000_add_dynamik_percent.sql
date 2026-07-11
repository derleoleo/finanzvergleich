-- Beitragsdynamik für den Fonds-Sparvertrag-Rechner.
-- Im Supabase SQL-Editor ausführen (oder via supabase db push).
alter table public.calculations
  add column if not exists dynamik_percent numeric default 0;
