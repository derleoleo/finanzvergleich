-- Weiterempfehlung: Werbecode je Nutzer und erfasste Werbungen.
--
-- Ablauf: Der Werber erzeugt sich einen Code (Knopf in der App) und teilt den
-- Link. Registriert sich jemand darüber, entsteht eine Zeile in
-- `werbungen` mit Status 'registriert'. Zahlt der Geworbene nach dem
-- Testzeitraum zum ersten Mal, setzt der Stripe-Webhook den Status auf
-- 'belohnt' und legt dem Werber den Rabatt aufs laufende Abo.
--
-- Beide Tabellen sind für Nutzer nur lesbar. Geschrieben wird ausschließlich
-- über den Service-Role-Schlüssel in den API-Funktionen – sonst könnte sich
-- jeder selbst Werbungen eintragen.
--
-- Im Supabase SQL-Editor ausführen.

create table if not exists public.werbe_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.werbe_codes enable row level security;

-- Der Werber darf seinen eigenen Code lesen; erzeugt wird er serverseitig.
drop policy if exists werbe_codes_lesen on public.werbe_codes;
create policy werbe_codes_lesen
  on public.werbe_codes
  for select
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.werbungen (
  id uuid primary key default gen_random_uuid(),
  -- Wer geworben hat
  werber_user_id uuid not null references auth.users (id) on delete cascade,
  -- Wer geworben wurde; genau einmal, damit niemand mehrfach zählt
  geworbener_user_id uuid not null unique references auth.users (id) on delete cascade,
  code text not null,
  status text not null default 'registriert'
    check (status in ('registriert', 'belohnt', 'abgelehnt')),
  -- Belege für die Gutschrift
  stripe_coupon_id text,
  belohnt_am timestamptz,
  created_at timestamptz not null default now(),
  -- Sich selbst zu werben ergibt keinen Anspruch
  constraint werbung_nicht_selbst check (werber_user_id <> geworbener_user_id)
);

create index if not exists werbungen_werber_idx
  on public.werbungen (werber_user_id);

alter table public.werbungen enable row level security;

-- Der Werber sieht seine eigenen Werbungen (für die Anzeige „x Empfehlungen“).
-- Bewusst ohne die Identität des Geworbenen in der Oberfläche.
drop policy if exists werbungen_lesen on public.werbungen;
create policy werbungen_lesen
  on public.werbungen
  for select
  to authenticated
  using (auth.uid() = werber_user_id);
