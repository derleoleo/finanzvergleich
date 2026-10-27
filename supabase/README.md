# Supabase

## Was hier liegt

- `migrations/` – SQL-Änderungen am Schema, in zeitlicher Reihenfolge.
- `zugriffsregeln-stand.sql` – Abzug der Zugriffsregeln und Funktionsrechte zum
  Nachlesen. Keine Migration (siehe unten).
- `email-templates/` – die Auth-Mailvorlagen. Sie werden **nicht** automatisch
  ausgerollt, sondern im Dashboard unter *Authentication → Emails* eingefügt.
  Erzeugt werden sie von `scripts/generate-email-templates.mjs`.

## Migration einspielen

Ohne Supabase-CLI: Datei öffnen, Inhalt im **SQL Editor** des Projekts ausführen.

Mit CLI (einmalig `npx supabase link --project-ref <ref>`):

```bash
npx supabase db push
```

`db push` spielt die Dateien in `migrations/` in Zeitstempelreihenfolge ein.
Das setzt voraus, dass die Datenbank den Ausgangsstand schon hat – siehe den
nächsten Abschnitt.

## Fehlender Ausgangsstand (wichtig)

Das Schema wurde ursprünglich im Dashboard angelegt, nicht per Migration.
Tabellen, Fremdschlüssel und vor allem die Zugriffsregeln (Row Level Security)
liegen deshalb nur in der Cloud. Folgen: Die Regeln lassen sich nicht im Code
prüfen, und nach einem Unfall gibt es keine Vorlage zum Wiederherstellen.

**Teilweise nachgeholt am 25.10.2026:** Die Zugriffsregeln und die
Funktionsrechte stehen jetzt in `zugriffsregeln-stand.sql` – **neben**
`migrations/`, nicht darin. Abgezogen wurde über `pg_policies` und
`pg_get_functiondef()` im SQL-Editor – `supabase db dump` setzt Docker voraus,
das hier nicht installiert ist.

Warum nicht als Migration: Die Datei trug den Zeitstempel 00000000000000 und
lief damit vor den Tabellen, die sie anfasst. `db push` auf eine leere
Datenbank brach daran ab (Audit D02). Der Abzug beschreibt einen Stand, er
stellt ihn nicht her.

Offen bleiben die **Tabellendefinitionen**. Solange sie fehlen, lässt sich aus
diesem Ordner **keine leere Datenbank aufbauen** – `db push` ist hier der Weg
für einzelne Änderungen an der bestehenden Datenbank, nicht für einen
Neuaufbau. Die Lücke ist weniger heikel als falsche Zugriffsregeln: Eine
fehlende Spalte fällt im Betrieb sofort auf.

Für den vollständigen Abzug (mit Docker):

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db dump --schema public -f supabase/migrations/00000000000000_ausgangsstand.sql
npx supabase db dump --schema public --data-only=false --role-only -f supabase/rollen.sql
```

Danach die erzeugte Datei durchsehen: Enthält sie Daten oder Schlüssel, diese
entfernen – hier gehört nur die Struktur hinein.

## Stand der Zugriffsregeln (geprüft am 28.09.2026)

Alle acht Tabellen haben RLS aktiv. Nutzer sehen und schreiben nur Zeilen mit
`auth.uid() = user_id`. Auf `subscriptions` gibt es ausschließlich Leserechte –
den Plan setzt nur der Stripe-Webhook über den Service-Role-Schlüssel.
`redeemed_codes` hat RLS ohne Regeln, ist für Nutzer also komplett gesperrt.

`redeemed_codes` ist seit `20261004120000_code_einloesung_atomar.sql` versioniert.
Geschrieben wird dort nur über `code_einloesen()`; die Funktion ist ausdrücklich
nur für `service_role` ausführbar, weil sie Premium freischaltet, ohne die
Codeliste zu kennen – die steht in `TEST_CODES` und wird in der Anwendung geprüft.

Offen war nur Kosmetik und der Nachweisschutz für Einwilligungen; beides
behebt `migrations/20260928120000_rls_haerten.sql`.

## Das Testkonto braucht einen bezahlten Zugang

Der angemeldete Playwright-Durchlauf (`e2e/beratungsablauf.spec.ts`) prüft auch
das Altersvorsorgedepot. Das ist eine `PaidRoute` – ohne bezahlten Zugang steht
der Test vor der Bezahlschranke und findet kein Eingabefeld.

Betroffen sind **zwei** Konten, und das ist leicht zu uebersehen:

- in CI das Konto aus `E2E_EMAIL`,
- lokal das Konto, zu dem `.playwright-auth.json` gehoert (die gespeicherte
  Sitzung aus `scripts/screenshots.mjs` - in der Regel das eigene).

Beide brauchen einen **von Hand gesetzten** Eintrag in `subscriptions`:
`plan = 'business'`, `status = 'trialing'`, `stripe_subscription_id = null`,
`current_period_end` weit in der Zukunft.

**Beim Aufräumen von Premium-Status müssen diese Zeilen stehen bleiben.** Sie
sehen aus wie manuelle Hochstufungen – weil sie welche sind. Ein pauschales

```sql
update public.subscriptions set plan = 'free' where stripe_subscription_id is null;
```

macht den AVD-Test rot, und zwar erst beim nächsten Lauf in CI. Genau das ist am
25.10.2026 passiert.

Wiederherstellen:

```sql
insert into public.subscriptions
  (user_id, plan, status, current_period_end, cancel_at_period_end, updated_at)
select u.id, 'business', 'trialing', now() + interval '10 years', false, now()
from auth.users u
where u.email in ('<E2E_EMAIL>', '<eigenes Konto>')
on conflict (user_id) do update
  set plan = excluded.plan,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = false,
      updated_at = now()
  where subscriptions.stripe_subscription_id is null;
```

**Die letzte Zeile ist wichtig, seit es echte Abos gibt** (erster Live-Kauf am
27.10.2026). Hat eines dieser Konten inzwischen selbst bezahlt, trägt seine
Zeile eine `stripe_subscription_id`. Ohne die Sperre läge darüber ein
erfundenes „trialing" über zehn Jahre – und es war vorher sogar schlimmer: Die
frühere Fassung setzte `stripe_subscription_id = null` und hätte die Zeile vom
echten Abo gelöst. `stripe_customer_id` bleibt in jedem Fall unberührt, denn
über die findet der Webhook seine Zeile bei Verlängerung und Kündigung
(`api/stripe-webhook.ts`).

Ein Konto mit echtem Abo braucht die Zeile ohnehin nicht: Es hat Premium
bereits über Stripe.

Das ferne Enddatum ist Absicht: `hat_aktives_abo()` prüft bei Zeilen ohne
Stripe-Abo das Datum. Ein ablaufender Testzugang ließe den Durchlauf irgendwann
ohne erkennbaren Grund scheitern.

Ein `update` ohne `returning` meldet im SQL-Editor übrigens immer „No rows
returned" – auch wenn keine Zeile passte. Zum Prüfen gehört eine eigene Abfrage.

## Worauf bei den Zugriffsregeln zu achten ist

Für jede Tabelle mit Nutzerdaten (`calculations`, `single_payment_calculations`,
`best_advice_calculations`, `pension_gap_calculations`, `user_profiles`,
`subscriptions`, `finanzvergleich_consents`) sollte gelten:

- `alter table ... enable row level security;`
- Lesen, Ändern und Löschen nur für `auth.uid() = user_id`.
- **Kein** `update`-Recht für Nutzer auf `subscriptions` – den Plan setzt
  ausschließlich der Stripe-Webhook über den Service-Role-Schlüssel. Sonst
  könnte sich jeder selbst auf Premium setzen.

Prüfen lässt sich das im Dashboard unter *Authentication → Policies* oder mit:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public';
select tablename, policyname, cmd, qual from pg_policies where schemaname = 'public';
```
