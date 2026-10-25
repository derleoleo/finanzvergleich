-- Ausführungsrechte der SECURITY-DEFINER-Funktionen begrenzen.
--
-- `hat_aktives_abo` und `berechnungen_dieser_monat` nehmen eine **fremde**
-- Nutzerkennung als Parameter und umgehen als SECURITY DEFINER die
-- Zeilensicherheit. Postgres vergibt das Ausführungsrecht auf Funktionen
-- standardmäßig an PUBLIC – beide waren damit ohne jede Anmeldung aufrufbar,
-- allein mit dem öffentlichen Anon-Schlüssel aus dem Browser-Bundle.
--
-- Nachgestellt am 25.10.2026 von außen:
--   hat_aktives_abo('<fremde uuid>')           -> false/true
--   berechnungen_dieser_monat('<fremde uuid>') -> 0
--
-- Wer eine Nutzerkennung kennt, erfährt damit, ob diese Person zahlende
-- Kundin ist und wie viel sie rechnet. Kennungen sind zwar nicht öffentlich
-- gelistet, tauchen aber in Protokollen, Fehlermeldungen und Supportfällen
-- auf. Das ist kein Grund, die Auskunft offen zu lassen.
--
-- Beide werden ausschließlich **innerhalb** von `pruefe_free_kontingent()`
-- gebraucht, und die Oberfläche liest ihren Zählerstand direkt aus
-- `berechnungs_zaehler` über die Regel `zaehler_lesen`. Der Entzug ändert
-- also nichts am Betrieb: Eine SECURITY-DEFINER-Funktion läuft mit den
-- Rechten ihrer Eigentümerin und darf die innere weiterhin aufrufen (gegen
-- ein echtes Postgres nachgestellt).
--
-- `naechste_fallversion` bleibt bewusst offen: Sie wird vom Browser gerufen
-- und beschränkt sich selbst über `auth.uid()`, kann also nur die eigenen
-- Fassungen zählen.
--
-- Im Supabase SQL-Editor ausführen.

revoke all on function public.hat_aktives_abo(uuid) from public;
revoke all on function public.hat_aktives_abo(uuid) from anon;
revoke all on function public.hat_aktives_abo(uuid) from authenticated;

revoke all on function public.berechnungen_dieser_monat(uuid) from public;
revoke all on function public.berechnungen_dieser_monat(uuid) from anon;
revoke all on function public.berechnungen_dieser_monat(uuid) from authenticated;

-- Der Server darf weiterhin, falls er sie je braucht.
grant execute on function public.hat_aktives_abo(uuid) to service_role;
grant execute on function public.berechnungen_dieser_monat(uuid) to service_role;
