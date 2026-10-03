-- Offene Empfehlungen nachholbar machen (Audit O05).
--
-- Bisher wurde eine Werbung nur belohnt, wenn der Werber im Moment der
-- Zahlung des Geworbenen bereits ein aktives Abo hatte. Hatte er keines,
-- blieb die Werbung auf 'registriert' stehen – und wurde nie wieder
-- angefasst, weil der Webhook ausschließlich nach der Rolle „geworben"
-- sucht. Die Zusage „jede Empfehlung, die zu einem Abo führt, wird
-- gutgeschrieben" war damit nicht gedeckt.
--
-- Mit diesem Zeitstempel ist unterscheidbar:
--   qualifiziert_am IS NULL      → der Geworbene hat noch nicht gezahlt
--   qualifiziert_am IS NOT NULL  → Anspruch entstanden, Gutschrift steht aus
-- Der Webhook kann die Gutschrift dann bei der nächsten Zahlung des Werbers
-- nachholen.
--
-- Im Supabase SQL-Editor ausführen.

alter table public.werbungen
  add column if not exists qualifiziert_am timestamptz;

comment on column public.werbungen.qualifiziert_am is
  'Zeitpunkt der ersten echten Zahlung des Geworbenen. Ab hier besteht der Anspruch, auch wenn die Gutschrift erst später möglich ist.';

-- Bestandsdaten: Bereits belohnte Werbungen waren zwangsläufig qualifiziert.
update public.werbungen
  set qualifiziert_am = coalesce(qualifiziert_am, belohnt_am)
  where status = 'belohnt' and belohnt_am is not null;

-- Offene Ansprüche schnell finden
create index if not exists werbungen_offen_idx
  on public.werbungen (werber_user_id)
  where status = 'registriert' and qualifiziert_am is not null;
