-- Ausgangsstand der Zugriffsregeln (Row Level Security).
--
-- Warum diese Datei existiert: Das Schema entstand ursprünglich im Dashboard,
-- nicht als Migration. Die Zugriffsregeln lagen deshalb nur in der Cloud – sie
-- waren im Code weder nachlesbar noch prüfbar, und eine Änderung im Dashboard
-- wäre niemandem aufgefallen. Falsch gesetzte Regeln fallen im Betrieb nicht
-- auf; sie fallen auf, wenn jemand fremde Daten liest.
--
-- Abgezogen am 25.10.2026 aus `pg_policies` und `pg_tables` der
-- Produktivdatenbank. Die Datei bildet den Stand ab, sie verändert ihn nicht:
-- Einspielen ist gefahrlos, weil jede Regel vorher verworfen wird und danach
-- identisch neu entsteht.
--
-- Enthalten sind auch die sechs Funktionen des Schemas. NICHT enthalten:
-- die Tabellendefinitionen selbst. Für die bräuchte es
-- `supabase db dump`, und das setzt Docker voraus. Die Regeln sind der
-- sicherheitsrelevante Teil; eine falsche Spalte fällt im Betrieb auf.
--
-- Im Supabase SQL-Editor ausführen – oder einfach als Nachweis liegen lassen.

-- ---------------------------------------------------------------------------
-- Zeilensicherheit aktiv: 16 Tabellen
-- ---------------------------------------------------------------------------

alter table public.api_aufrufe enable row level security;
alter table public.avd_calculations enable row level security;
alter table public.berechnungs_zaehler enable row level security;
alter table public.best_advice_calculations enable row level security;
alter table public.calculations enable row level security;
alter table public.fall_versionen enable row level security;
alter table public.finanzvergleich_consents enable row level security;
alter table public.net_policy_calculations enable row level security;
alter table public.pension_gap_calculations enable row level security;
alter table public.redeemed_codes enable row level security;
alter table public.single_payment_calculations enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_profiles enable row level security;
alter table public.werbe_codes enable row level security;
alter table public.werbungen enable row level security;
alter table public.withdrawal_plans enable row level security;

-- ---------------------------------------------------------------------------
-- Eigene Daten: lesen und schreiben nur für die eigene Kennung
--
-- `using` steuert, welche Zeilen sichtbar sind, `with check`, welche
-- geschrieben werden dürfen. Ohne das zweite könnte jemand eine eigene Zeile
-- auf eine fremde Nutzerkennung umschreiben.
-- ---------------------------------------------------------------------------

drop policy if exists own_data on public.avd_calculations;
create policy own_data on public.avd_calculations
  as permissive for all to authenticated
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

drop policy if exists own_data on public.best_advice_calculations;
create policy own_data on public.best_advice_calculations
  as permissive for all to authenticated
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

drop policy if exists own_data on public.calculations;
create policy own_data on public.calculations
  as permissive for all to authenticated
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

drop policy if exists own_data on public.net_policy_calculations;
create policy own_data on public.net_policy_calculations
  as permissive for all to authenticated
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

drop policy if exists own_data on public.pension_gap_calculations;
create policy own_data on public.pension_gap_calculations
  as permissive for all to authenticated
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

drop policy if exists own_data on public.single_payment_calculations;
create policy own_data on public.single_payment_calculations
  as permissive for all to authenticated
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

drop policy if exists own_data on public.user_profiles;
create policy own_data on public.user_profiles
  as permissive for all to authenticated
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

drop policy if exists own_data on public.withdrawal_plans;
create policy own_data on public.withdrawal_plans
  as permissive for all to authenticated
  using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));

-- ---------------------------------------------------------------------------
-- Nur lesen: Was der Server schreibt, darf der Nutzer nicht ändern
-- ---------------------------------------------------------------------------

-- Den Plan setzt ausschließlich der Stripe-Webhook über den
-- Service-Role-Schlüssel. Mit Schreibrecht könnte sich jeder selbst auf
-- Premium setzen.
drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription" on public.subscriptions
  as permissive for select to authenticated
  using ((auth.uid() = user_id));

-- Hochgezählt wird ausschließlich vom Trigger; der Nutzer sieht nur den Stand
-- für die Anzeige „x von 3".
drop policy if exists zaehler_lesen on public.berechnungs_zaehler;
create policy zaehler_lesen on public.berechnungs_zaehler
  as permissive for select to authenticated
  using ((auth.uid() = user_id));

-- Der eigene Empfehlungscode. Fremde Codes schlägt der Server nach.
drop policy if exists werbe_codes_lesen on public.werbe_codes;
create policy werbe_codes_lesen on public.werbe_codes
  as permissive for select to authenticated
  using ((auth.uid() = user_id));

-- Der Werber sieht seine eigenen Empfehlungen. Der Geworbene hat hier nichts
-- zu suchen - für ihn ist die Zeile nur ein Vermerk.
drop policy if exists werbungen_lesen on public.werbungen;
create policy werbungen_lesen on public.werbungen
  as permissive for select to authenticated
  using ((auth.uid() = werber_user_id));

-- ---------------------------------------------------------------------------
-- Nachweise: anlegen und lesen, aber nicht ändern
--
-- Eine Einwilligung oder eine Fassung, die sich nachträglich ändern lässt, ist
-- kein Nachweis. Deshalb fehlt hier bewusst jedes UPDATE.
-- ---------------------------------------------------------------------------

drop policy if exists consents_anlegen on public.finanzvergleich_consents;
create policy consents_anlegen on public.finanzvergleich_consents
  as permissive for insert to authenticated
  with check ((auth.uid() = user_id));

drop policy if exists consents_lesen on public.finanzvergleich_consents;
create policy consents_lesen on public.finanzvergleich_consents
  as permissive for select to authenticated
  using ((auth.uid() = user_id));

drop policy if exists versionen_anlegen on public.fall_versionen;
create policy versionen_anlegen on public.fall_versionen
  as permissive for insert to authenticated
  with check ((auth.uid() = user_id));

drop policy if exists versionen_lesen on public.fall_versionen;
create policy versionen_lesen on public.fall_versionen
  as permissive for select to authenticated
  using ((auth.uid() = user_id));

-- Löschen bleibt erlaubt, damit mit einem Fall auch seine Fassungen
-- verschwinden können.
drop policy if exists versionen_loeschen on public.fall_versionen;
create policy versionen_loeschen on public.fall_versionen
  as permissive for delete to authenticated
  using ((auth.uid() = user_id));

-- ---------------------------------------------------------------------------
-- Ohne jede Regel, also für Nutzer vollständig gesperrt
--
-- `api_aufrufe` (Drosselung) und `redeemed_codes` (eingelöste Testcodes)
-- haben Zeilensicherheit aktiv, aber keine einzige Regel. Geschrieben und
-- gelesen wird dort ausschließlich mit dem Service-Role-Schlüssel. Das ist
-- Absicht und keine Lücke: Wer hier mitlesen könnte, sähe fremde Codes
-- beziehungsweise das Nutzungsverhalten anderer.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Funktionen des Schemas (Stand 25.10.2026)
--
-- Alle sechs sind SECURITY DEFINER mit `set search_path to 'public'`. Der
-- feste Suchpfad gehoert dazu: Ohne ihn koennte jemand eine eigene Tabelle
-- vor die echte schieben und die Funktion auf untergeschobenen Daten laufen
-- lassen.
--
-- Die Definitionen stehen bereits in den jeweiligen Migrationen:
--   hat_aktives_abo, berechnungen_dieser_monat, pruefe_free_kontingent
--     -> 20260928090000_free_limit_serverseitig.sql
--        und 20260929150000_kontingent_zaehler.sql
--   naechste_fallversion   -> 20261003120000_fallversionen.sql
--   code_einloesen         -> 20261004120000_code_einloesung_atomar.sql
--   drossel_zaehlen        -> 20261011120000_api_drosselung.sql
--
-- Hier deshalb nur, wer sie aufrufen darf - das ist der Teil, der im Dashboard
-- entsteht und sonst nirgends steht.
--
--   code_einloesen             nur service_role  (schaltet Premium frei)
--   drossel_zaehlen            nur service_role  (entscheidet ueber Zugang)
--   hat_aktives_abo            nur service_role  (siehe 20261025120000)
--   berechnungen_dieser_monat  nur service_role  (siehe 20261025120000)
--   naechste_fallversion       offen - beschraenkt sich selbst ueber auth.uid()
--   pruefe_free_kontingent     Triggerfunktion, nicht sinnvoll direkt rufbar
-- ---------------------------------------------------------------------------
