# Supabase

## Was hier liegt

- `migrations/` – SQL-Änderungen am Schema, in zeitlicher Reihenfolge.
- `email-templates/` – die Auth-Mailvorlagen. Sie werden **nicht** automatisch
  ausgerollt, sondern im Dashboard unter *Authentication → Emails* eingefügt.
  Erzeugt werden sie von `scripts/generate-email-templates.mjs`.

## Migration einspielen

Ohne Supabase-CLI: Datei öffnen, Inhalt im **SQL Editor** des Projekts ausführen.

Mit CLI (einmalig `npx supabase link --project-ref <ref>`):

```bash
npx supabase db push
```

## Fehlender Ausgangsstand (wichtig)

Das Schema wurde ursprünglich im Dashboard angelegt, nicht per Migration.
Tabellen, Fremdschlüssel und vor allem die Zugriffsregeln (Row Level Security)
liegen deshalb nur in der Cloud. Folgen: Die Regeln lassen sich nicht im Code
prüfen, und nach einem Unfall gibt es keine Vorlage zum Wiederherstellen.

Einmalig nachholen, dann ist der Stand versioniert:

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

Offen war nur Kosmetik und der Nachweisschutz für Einwilligungen; beides
behebt `migrations/20260928120000_rls_haerten.sql`.

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
