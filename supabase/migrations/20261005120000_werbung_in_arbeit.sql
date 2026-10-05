-- Zwischenzustand für die Gutschrift einer Empfehlung (Audit A07).
--
-- Bisher wurde eine Werbung zuerst auf 'belohnt' gesetzt und erst danach der
-- Rabatt bei Stripe gesetzt. Das verhinderte zwar, dass zwei gleichzeitige
-- Ereignisse denselben Rabatt zweimal vergeben – schuf aber einen
-- unvollständigen Abschlusszustand: Bricht der Vorgang zwischen beiden
-- Schritten ab, steht 'belohnt' ohne Rabatt. Wiederholungen suchen nur nach
-- 'registriert' und holen das nie nach. Der Werber wartet dann auf eine
-- Gutschrift, die es nicht gibt, und niemand merkt es.
--
-- Mit 'in_arbeit' ist der Unterschied sichtbar:
--   registriert → Anspruch offen, noch nichts versucht
--   in_arbeit   → Vergabe läuft oder ist abgebrochen; wiederaufnehmbar
--   belohnt     → Rabatt steht bei Stripe, bestätigt
--
-- Die Wiederaufnahme ist gefahrlos, weil der Stripe-Aufruf einen festen
-- Idempotenzschlüssel je Werbung trägt: Ein zweiter Versuch mit demselben
-- Schlüssel wiederholt die Vergabe nicht.
--
-- Im Supabase SQL-Editor ausführen.

alter table public.werbungen
  drop constraint if exists werbungen_status_check;

alter table public.werbungen
  add constraint werbungen_status_check
  check (status in ('registriert', 'in_arbeit', 'belohnt', 'abgelehnt'));

alter table public.werbungen
  add column if not exists in_arbeit_seit timestamptz;

comment on column public.werbungen.in_arbeit_seit is
  'Beginn des laufenden Gutschriftversuchs. Liegt er lange zurueck, ist der Versuch abgebrochen und kann wiederaufgenommen werden.';

-- Haengengebliebene Versuche schnell finden
create index if not exists werbungen_in_arbeit_idx
  on public.werbungen (in_arbeit_seit)
  where status = 'in_arbeit';
