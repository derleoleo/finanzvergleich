-- Härtung der Zugriffsregeln (Befund F10 aus docs/produkt-audit-2026-09-28.md).
-- Der geprüfte Stand war bereits dicht: Alle Tabellen haben RLS, Nutzer sehen
-- nur eigene Zeilen, auf subscriptions gibt es kein Schreibrecht.
-- Diese Migration räumt die verbleibenden Unsauberkeiten auf.
-- Im Supabase SQL-Editor ausführen.

-- 1) Einwilligungen sind ein Nachweis und dürfen nicht nachträglich
--    geändert oder gelöscht werden. Anlegen und Lesen genügt; das Löschen
--    beim Kontoschluss erledigt die Serverfunktion mit dem Service-Role-Key,
--    der RLS ohnehin umgeht.
drop policy if exists users_own_consents on public.finanzvergleich_consents;

-- Jede Regel vorher verwerfen, damit sich die Migration wiederholen laesst.
-- Ohne das bricht ein zweiter Lauf ab ("policy already exists") - gefunden
-- beim Neuaufbau gegen eine leere Datenbank (Audit D02).
drop policy if exists consents_lesen on public.finanzvergleich_consents;
drop policy if exists consents_anlegen on public.finanzvergleich_consents;

create policy consents_lesen
  on public.finanzvergleich_consents
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy consents_anlegen
  on public.finanzvergleich_consents
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 2) Doppelte Leseregel auf subscriptions entfernen (identischer Inhalt).
drop policy if exists "subscriptions: user sees own row" on public.subscriptions;

-- 3) Regeln auf angemeldete Nutzer eingrenzen statt auf public.
--    Inhaltlich ändert sich nichts, es ist nur eine Ebene weniger Angriffsfläche.
--
--    Nur, wenn die Regel schon da ist: Diese Regeln entstanden im Dashboard
--    und stehen in keiner Migration. Auf einer leeren Datenbank gibt es
--    nichts einzugrenzen, und `alter policy` bricht dann ab – genau daran
--    scheiterte der Neuaufbau (Audit D02). Die Regeln entstehen dort später
--    aus `zugriffsregeln-stand.sql`, bereits mit `to authenticated`.
do $$
declare
  ziel record;
begin
  for ziel in
    select * from (values
      ('subscriptions', 'Users can read own subscription'),
      ('calculations', 'own_data'),
      ('single_payment_calculations', 'own_data'),
      ('best_advice_calculations', 'own_data'),
      ('pension_gap_calculations', 'own_data'),
      ('user_profiles', 'own_data')
    ) as t(tabelle, regel)
  loop
    if exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = ziel.tabelle
        and policyname = ziel.regel
    ) then
      execute format(
        'alter policy %I on public.%I to authenticated',
        ziel.regel, ziel.tabelle
      );
    else
      raise notice 'Regel % auf % fehlt - nichts einzugrenzen.', ziel.regel, ziel.tabelle;
    end if;
  end loop;
end $$;

-- Gegenprobe nach dem Ausführen:
-- select tablename, policyname, cmd, roles from pg_policies
-- where schemaname = 'public' order by tablename, cmd;
