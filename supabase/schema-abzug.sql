-- Abzug der Tabellendefinitionen aus der Produktivdatenbank (Audit D02).
--
-- Warum es diese Abfrage gibt: Das Schema entstand im Dashboard, nicht als
-- Migration. Ohne die Tabellendefinitionen lässt sich aus `migrations/` keine
-- leere Datenbank aufbauen – und damit ist auch keine Wiederherstellung
-- geprobt. `supabase db dump` wäre der bequeme Weg, setzt aber Docker voraus,
-- das hier nicht installiert ist. Also erzeugt die Datenbank ihr eigenes DDL.
--
-- Ablauf:
--   1. Diese Abfrage im Supabase SQL-Editor ausführen.
--   2. Das Ergebnis ist **eine einzige Textzelle**. Sie vollständig kopieren
--      (nicht die Tabellenansicht abfotografieren – der rechte Rand fehlt dann)
--      und in `migrations/00000000000001_ausgangsstand_tabellen.sql` ablegen.
--   3. Danach die Reihenfolge prüfen: Der Ausgangsstand muss vor allen
--      anderen Migrationen laufen. Sein Zeitstempel ist deshalb der kleinste.
--   4. Zum Nachweis einmal gegen eine leere Datenbank spielen (lokales
--      Supabase oder ein Wegwerf-Projekt), nicht gegen die Produktion.
--
-- Was die Abfrage NICHT liefert: Daten, Rollen, Einwilligungen, Schlüssel.
-- Nur Struktur. Die Zugriffsregeln liegen getrennt in
-- `zugriffsregeln-stand.sql`, die Funktionen in ihren eigenen Migrationen.

with spalten as (
  select
    c.table_name,
    string_agg(
      format(
        '  %I %s%s%s',
        c.column_name,
        -- Der vom Server formatierte Typ: trifft auch numeric(12,2), text[],
        -- timestamptz und die Aufzählungstypen richtig.
        format_type(a.atttypid, a.atttypmod),
        case when c.column_default is not null
             then ' default ' || c.column_default else '' end,
        case when c.is_nullable = 'NO' then ' not null' else '' end
      ),
      e',\n' order by c.ordinal_position
    ) as spaltenliste
  from information_schema.columns c
  join pg_class t
    on t.relname = c.table_name
   and t.relnamespace = 'public'::regnamespace
  join pg_attribute a
    on a.attrelid = t.oid
   and a.attname = c.column_name
  where c.table_schema = 'public'
  group by c.table_name
),
bedingungen as (
  -- Primär-, Fremd- und Eindeutigkeitsschlüssel sowie CHECK-Bedingungen.
  -- pg_get_constraintdef gibt sie genau so aus, wie sie wieder eingelesen
  -- werden können.
  select
    rel.relname as table_name,
    string_agg(
      format('alter table public.%I add constraint %I %s;',
             rel.relname, con.conname, pg_get_constraintdef(con.oid)),
      e'\n' order by con.contype desc, con.conname
    ) as liste
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relnamespace = 'public'::regnamespace
    -- 'n' = NOT NULL. Postgres 17 führt die als eigene Bedingung; sie steht
    -- aber schon in der Spaltenliste oben, und die ALTER-Schreibweise dafür
    -- kennen ältere Server nicht.
    and con.contype <> 'n'
  group by rel.relname
),
indizes as (
  -- Nur eigenständige Indizes; die aus Schlüsseln entstehen oben schon.
  select
    tablename as table_name,
    -- Wiederholbar machen: Ein Ausgangsstand soll sich zweimal einspielen
    -- lassen, ohne am vorhandenen Index zu scheitern.
    string_agg(
      replace(
        replace(indexdef, 'CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS '),
        'CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS '
      ) || ';',
      e'\n' order by indexname
    ) as liste
  from pg_indexes
  where schemaname = 'public'
    and indexname not in (
      select con.conname from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      where rel.relnamespace = 'public'::regnamespace
    )
  group by tablename
),
zeilensicherheit as (
  -- Ob eine Tabelle Zeilensicherheit hat, gehört zum Ausgangsstand.
  --
  -- Eine neu aufgebaute Datenbank stünde sonst offen, bis jemand
  -- `zugriffsregeln-stand.sql` nachschiebt – genau davor warnt der
  -- Supabase-Editor zu Recht. Die Regeln selbst stehen dort; hier geht es nur
  -- um den Schalter, und der wird aus der Produktion übernommen statt geraten.
  select
    rel.relname as table_name,
    rel.relrowsecurity as an
  from pg_class rel
  where rel.relnamespace = 'public'::regnamespace
    and rel.relkind = 'r'
)
select
  '-- Ausgangsstand der Tabellen, abgezogen am ' ||
  to_char(now(), 'DD.MM.YYYY') || E'.\n' ||
  '-- Erzeugt von supabase/schema-abzug.sql. Nur Struktur, keine Daten.' ||
  E'\n' ||
  '-- Die Zugriffsregeln selbst stehen in supabase/zugriffsregeln-stand.sql;' ||
  E'\n' ||
  '-- ohne sie ist eine Tabelle mit Zeilensicherheit vollständig gesperrt.' ||
  E'\n\n' ||
  string_agg(
    format(
      E'create table if not exists public.%I (\n%s\n);\n%s%s%s',
      s.table_name,
      s.spaltenliste,
      coalesce(E'\n' || b.liste || E'\n', ''),
      coalesce(E'\n' || i.liste || E'\n', ''),
      case when z.an
        then format(E'\nalter table public.%I enable row level security;\n', s.table_name)
        else format(E'\n-- Hinweis: public.%I hatte in der Produktion KEINE Zeilensicherheit.\n', s.table_name)
      end
    ),
    E'\n' order by s.table_name
  ) as ausgangsstand
from spalten s
left join bedingungen b on b.table_name = s.table_name
left join indizes i on i.table_name = s.table_name
left join zeilensicherheit z on z.table_name = s.table_name;
