-- Testcode-Einlösung in einem Schritt.
--
-- Vorher lief die Einlösung über vier getrennte Anfragen: prüfen, ob der Code
-- schon vergeben ist, prüfen, ob ein bezahltes Abo läuft, den Code eintragen,
-- das Abo setzen. Zwischen Prüfung und Eintrag liegt ein Fenster, in dem ein
-- zweiter Aufruf dasselbe tun kann. Und schlug der letzte Schritt fehl, musste
-- der Code von Hand wieder freigegeben werden – ein Weg, der selbst
-- fehlschlagen kann und den Code dann für alle verbrennt.
--
-- Beides verschwindet, wenn alles in einer Transaktion passiert. Schlägt
-- irgendetwas fehl, ist auch der Code nicht verbraucht.
--
-- Im Supabase SQL-Editor ausführen.

-- Die Tabelle entstand seinerzeit im Dashboard, nicht als Migration. Hier
-- steht sie zum ersten Mal versioniert; bei vorhandener Tabelle passiert
-- nichts.
create table if not exists public.redeemed_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  user_id uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz
);

alter table public.redeemed_codes enable row level security;
-- Bewusst ohne Regeln: Nutzer haben hier nichts zu suchen. Geschrieben wird
-- ausschließlich über die Funktion unten mit dem Service-Role-Schlüssel.

-- Ohne diese Eindeutigkeit gibt es keine Atomarität: Erst sie macht aus
-- „einfügen" ein „beanspruchen". Gibt es bereits doppelte Codes, bricht die
-- Migration hier mit einer verständlichen Meldung ab – die Doppelten gehören
-- dann erst von Hand geklärt, nicht stillschweigend gelöscht.
do $$
declare
  v_doppelt text;
begin
  select string_agg(code, ', ')
    into v_doppelt
    from (
      select code from public.redeemed_codes group by code having count(*) > 1
    ) d;
  if v_doppelt is not null then
    raise exception
      'Mehrfach eingetragene Codes gefunden: %. Bitte zuerst klaeren, welche Einloesung gilt.',
      v_doppelt;
  end if;
end;
$$;

create unique index if not exists redeemed_codes_code_key
  on public.redeemed_codes (code);

-- Prüfen, beanspruchen und freischalten in einem Rutsch.
--
-- Rückgabe: 'ok', 'bereits_verwendet' oder 'abo_aktiv'. Welche Codes gültig
-- sind, entscheidet weiterhin die Anwendung (TEST_CODES) – die Datenbank
-- kennt die Liste nicht und darf deshalb von niemandem direkt aufgerufen
-- werden (siehe revoke unten).
create or replace function public.code_einloesen(p_code text, p_user uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  v_status text;
  v_stripe text;
begin
  if v_code = '' or p_user is null then
    return 'ungueltig';
  end if;

  -- Die Zeile sperren, damit nicht gleichzeitig ein Stripe-Ereignis dasselbe
  -- Abo ändert. Gibt es noch keine, ist nichts zu sperren.
  select status, stripe_subscription_id
    into v_status, v_stripe
    from public.subscriptions
   where user_id = p_user
     for update;

  if v_stripe is not null and v_status = 'active' then
    return 'abo_aktiv';
  end if;

  -- Beanspruchen. Ein vorbereiteter Eintrag ohne Nutzer darf übernommen
  -- werden; ein bereits eingelöster nicht.
  insert into public.redeemed_codes as r (code, user_id, redeemed_at)
  values (v_code, p_user, now())
  on conflict (code) do update
    set user_id = excluded.user_id,
        redeemed_at = excluded.redeemed_at
    where r.user_id is null;

  if not found then
    return 'bereits_verwendet';
  end if;

  insert into public.subscriptions (
    user_id, plan, status, current_period_end, cancel_at_period_end, updated_at
  )
  values (p_user, 'business', 'trialing', now() + interval '30 days', false, now())
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = excluded.status,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        updated_at = excluded.updated_at;

  return 'ok';
end;
$$;

-- Wichtig: Die Funktion schaltet Premium frei, ohne die Codeliste zu kennen.
-- Dürfte ein angemeldeter Nutzer sie aufrufen, bekäme er mit einem beliebigen
-- Text ein Abo. Sie gehört ausschließlich dem Server.
revoke all on function public.code_einloesen(text, uuid) from public;
revoke all on function public.code_einloesen(text, uuid) from anon;
revoke all on function public.code_einloesen(text, uuid) from authenticated;
grant execute on function public.code_einloesen(text, uuid) to service_role;
