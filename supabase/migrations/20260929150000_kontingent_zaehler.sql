-- Kontingent des kostenlosen Plans über einen eigenen Zähler (Audit F17).
--
-- Bisher wurden vorhandene Zeilen gezählt. Das hatte zwei Schwächen:
--   1. Löschen gab das Kontingent wieder frei.
--   2. Gleichzeitige Anfragen konnten denselben Zählstand sehen.
-- Jetzt zählt eine eigene Tabelle je Nutzer und Monat, hochgezählt in einem
-- Schritt (upsert mit Inkrement). Gelöschte Berechnungen zählen weiter mit:
-- Begrenzt werden ausgeführte Berechnungen, nicht gespeicherte Datensätze.
--
-- Im Supabase SQL-Editor ausführen. Voraussetzung: die Migration
-- 20260928090000_free_limit_serverseitig.sql wurde bereits eingespielt.

create table if not exists public.berechnungs_zaehler (
  user_id uuid not null references auth.users (id) on delete cascade,
  monat date not null,
  anzahl integer not null default 0,
  primary key (user_id, monat)
);

alter table public.berechnungs_zaehler enable row level security;

-- Nutzer dürfen ihren Stand lesen (für die Anzeige „x von 3“), aber nicht
-- schreiben – das erledigt ausschließlich der Trigger.
drop policy if exists zaehler_lesen on public.berechnungs_zaehler;
create policy zaehler_lesen
  on public.berechnungs_zaehler
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.pruefe_free_kontingent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_monat date := date_trunc('month', now())::date;
  v_stand integer;
begin
  if public.hat_aktives_abo(new.user_id) then
    return new;
  end if;

  -- Einfügen und Hochzählen in einem Schritt; die Primärschlüssel-Sperre
  -- verhindert, dass parallele Anfragen denselben Stand sehen.
  insert into public.berechnungs_zaehler (user_id, monat, anzahl)
    values (new.user_id, v_monat, 1)
    on conflict (user_id, monat)
    do update set anzahl = public.berechnungs_zaehler.anzahl + 1
    returning anzahl into v_stand;

  if v_stand > 3 then
    raise exception 'Kontingent erreicht: Im kostenlosen Plan sind 3 Berechnungen pro Monat möglich.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- Bestandsnutzer nicht schlechter stellen: vorhandene Berechnungen des
-- laufenden Monats als Startstand übernehmen.
insert into public.berechnungs_zaehler (user_id, monat, anzahl)
select user_id, date_trunc('month', now())::date, count(*)
from (
  select user_id, created_date from public.calculations
  union all select user_id, created_date from public.single_payment_calculations
  union all select user_id, created_date from public.best_advice_calculations
  union all select user_id, created_date from public.pension_gap_calculations
) alle
where created_date >= date_trunc('month', now())
group by user_id
on conflict (user_id, monat) do nothing;

-- Anzeige-Funktion: Stand des laufenden Monats
create or replace function public.berechnungen_dieser_monat(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select anzahl from public.berechnungs_zaehler
      where user_id = p_user_id and monat = date_trunc('month', now())::date),
    0
  );
$$;
