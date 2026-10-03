-- Unveränderliche Fallversionen (Audit O08).
--
-- Bisher überschrieb „Aktualisieren" denselben Datensatz. Was ein Berater
-- seinem Kunden gezeigt hat, war danach nicht mehr rekonstruierbar: Die
-- Kennzahlen standen zwar im Datensatz, Diagramme und Auszahlpläne wurden
-- beim Öffnen aber neu gerechnet – und die Rechen-Engine von damals gibt es
-- im Code nicht mehr. Deshalb wird bei jedem Speichern eine Version
-- festgeschrieben, einschließlich der Ausgabereihen.
--
-- Bewusst eine gemeinsame Tabelle für alle Rechner statt sieben einzelner:
-- Der Inhalt ist in jedem Fall „Eingaben, Kennzahlen, Reihen" und wird nie
-- gefiltert oder verrechnet, nur anhand des Falls geladen.
--
-- Im Supabase SQL-Editor ausführen.

create table if not exists public.fall_versionen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  /** Tabelle des Hauptdatensatzes – ein Fremdschlüssel geht über sieben Tabellen nicht. */
  fall_tabelle text not null check (
    fall_tabelle in (
      'calculations',
      'single_payment_calculations',
      'best_advice_calculations',
      'pension_gap_calculations',
      'avd_calculations',
      'net_policy_calculations',
      'withdrawal_plans'
    )
  ),
  fall_id uuid not null,
  version integer not null check (version > 0),
  name text not null,
  /** Die wirksamen Eingaben zum Zeitpunkt der Berechnung. */
  form jsonb not null,
  /** Kennzahlen samt Modellstempel, wie im Hauptdatensatz. */
  results jsonb not null,
  /** Jahresreihen, Auszahlpläne – alles, was die Anzeige zum Zeichnen braucht. */
  reihen jsonb,
  created_at timestamptz not null default now(),
  unique (fall_tabelle, fall_id, version)
);

create index if not exists fall_versionen_fall_idx
  on public.fall_versionen (fall_tabelle, fall_id, version desc);

alter table public.fall_versionen enable row level security;

-- Lesen und Anlegen für eigene Zeilen. Ein UPDATE gibt es bewusst nicht:
-- Eine Version, die sich ändern lässt, ist kein Nachweis. Löschen bleibt
-- erlaubt, damit mit dem Fall auch seine Versionen verschwinden können.
drop policy if exists versionen_lesen on public.fall_versionen;
create policy versionen_lesen
  on public.fall_versionen
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists versionen_anlegen on public.fall_versionen;
create policy versionen_anlegen
  on public.fall_versionen
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists versionen_loeschen on public.fall_versionen;
create policy versionen_loeschen
  on public.fall_versionen
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Nächste Versionsnummer je Fall. Als Funktion, damit zwei gleichzeitige
-- Speichervorgänge nicht dieselbe Nummer ziehen; die Eindeutigkeit der
-- Spalte fängt den Rest ab.
create or replace function public.naechste_fallversion(
  p_fall_tabelle text,
  p_fall_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max(version), 0) + 1
  from public.fall_versionen
  where fall_tabelle = p_fall_tabelle
    and fall_id = p_fall_id
    and user_id = auth.uid();
$$;
