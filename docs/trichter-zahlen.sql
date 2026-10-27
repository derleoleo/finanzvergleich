-- docs/trichter-zahlen.sql
-- Die Zahlen des Trichters, die aus der angemeldeten Anwendung kommen.
--
-- Warum nicht aus der Reichweitenmessung: Umami Cloud ist ein Dienst eines
-- Dritten und darf aus der angemeldeten Anwendung keine Daten erhalten (AVV
-- § 2 und § 3, siehe src/utils/messung.ts). Die Zahlen 2 bis 5 des Plans
-- stehen aber ohnehin hier - und zwar genauer: kein Werbeblocker, keine
-- Stichprobe, keine doppelt gezaehlten Sitzungen.
--
-- Aufteilung der fuenf Zahlen:
--   1. Besucher auf / und /beispiel  -> Umami (nur das ist nicht in der DB)
--   2. Registrierungen               -> Abfrage A
--   3. Anteil mit erster Berechnung  -> Abfrage B
--   4. Anteil am Monatslimit         -> Abfrage C
--   5. Zahlende                      -> Abfrage D
--
-- Im SQL-Editor von Supabase ausfuehren, einmal pro Woche. Zeile 1 aus Umami
-- daneben in dieselbe Tabelle.

-- ===================================================================
-- A) Registrierungen je Monat
-- ===================================================================
select
  date_trunc('month', created_at)::date as monat,
  count(*)                              as registrierungen,
  count(*) filter (where email_confirmed_at is not null) as bestaetigt
from auth.users
group by 1
order by 1 desc;

-- ===================================================================
-- B) Anteil der Registrierten, der mindestens einmal gerechnet hat
--
-- Der Moment, in dem das Produkt seinen Wert zeigt. Gezaehlt wird je
-- Anmeldemonat (Kohorte), nicht insgesamt - sonst verwaessert jeder neue
-- Monat das Bild.
-- ===================================================================
with angemeldet as (
  select id, date_trunc('month', created_at)::date as kohorte
  from auth.users
),
gerechnet as (
  select distinct user_id from public.berechnungs_zaehler where anzahl > 0
)
select
  a.kohorte,
  count(*)                                              as registriert,
  count(g.user_id)                                      as hat_gerechnet,
  round(100.0 * count(g.user_id) / nullif(count(*), 0), 1) as anteil_prozent
from angemeldet a
left join gerechnet g on g.user_id = a.id
group by 1
order by 1 desc;

-- ===================================================================
-- C) Anteil, der das Monatslimit des Gratiszugangs erreicht hat
--
-- Der Kaufanlass. Die 3 ist FREI_BERECHNUNGEN_PRO_MONAT aus
-- src/utils/preise.ts - wird der Wert dort geaendert, muss er hier mit.
-- Beruecksichtigt werden nur Monate ohne bezahlten Zugang: Wer zahlt, hat
-- kein Limit und darf die Quote nicht verwaessern.
-- ===================================================================
with gratis_monate as (
  select z.user_id, z.monat, z.anzahl
  from public.berechnungs_zaehler z
  where not exists (
    select 1 from public.subscriptions s
    where s.user_id = z.user_id
      and s.plan <> 'free'
      and s.status in ('active', 'trialing')
  )
)
select
  monat,
  count(*)                                                        as aktive_gratisnutzer,
  count(*) filter (where anzahl >= 3)                             as am_limit,
  round(100.0 * count(*) filter (where anzahl >= 3)
        / nullif(count(*), 0), 1)                                 as anteil_prozent
from gratis_monate
group by 1
order by 1 desc;

-- ===================================================================
-- D) Zahlende, Stand jetzt
--
-- 'trialing' getrennt ausgewiesen: Die 30 Tage sind noch kein Umsatz, und
-- sie zusammenzuzaehlen waere genau die Art Schoenrechnung, die man sich
-- selbst nicht leisten sollte.
-- ===================================================================
select
  plan,
  status,
  count(*) as anzahl
from public.subscriptions
where plan <> 'free'
group by 1, 2
order by 1, 2;

-- ===================================================================
-- E) Welcher Rechner wird benutzt
--
-- Nicht im Plan, aber die Frage, die bei der naechsten Inhaltsentscheidung
-- zuerst kommt: Woran arbeiten Berater wirklich?
-- ===================================================================
select 'Fonds-Sparvertrag' as rechner, count(*) from public.calculations
union all select 'Einmalanlage',        count(*) from public.single_payment_calculations
union all select 'BestAdvice',          count(*) from public.best_advice_calculations
union all select 'Rentenluecke',        count(*) from public.pension_gap_calculations
union all select 'Altersvorsorgedepot', count(*) from public.avd_calculations
union all select 'Netto-/Bruttopolice', count(*) from public.net_policy_calculations
union all select 'Entnahmeplan',        count(*) from public.withdrawal_plans
order by 2 desc;
