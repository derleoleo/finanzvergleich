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
alter policy "Users can read own subscription" on public.subscriptions to authenticated;
alter policy own_data on public.calculations to authenticated;
alter policy own_data on public.single_payment_calculations to authenticated;
alter policy own_data on public.best_advice_calculations to authenticated;
alter policy own_data on public.pension_gap_calculations to authenticated;
alter policy own_data on public.user_profiles to authenticated;

-- Gegenprobe nach dem Ausführen:
-- select tablename, policyname, cmd, roles from pg_policies
-- where schemaname = 'public' order by tablename, cmd;
