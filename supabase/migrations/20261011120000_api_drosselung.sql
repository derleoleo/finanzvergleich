-- Drosselung der Server-Endpunkte je Nutzer.
--
-- Alle Endpunkte verlangen eine Anmeldung, aber keiner begrenzt, wie oft ein
-- angemeldetes Konto sie aufruft. Mit einem kostenlosen Zugang liesse sich
-- `send-feedback` in einer Schleife rufen - jeder Aufruf verschickt eine Mail
-- über den Resend-Zugang des Betreibers. Das kostet Geld und beschädigt den
-- Ruf der Absenderdomain, was schwerer zu reparieren ist als die Rechnung.
-- `redeem-code` liesse sich ebenso ungebremst durchprobieren.
--
-- Aufbau wie beim Kontingentzähler (20260929150000): eine Zeile je Nutzer,
-- Endpunkt und Zeitfenster, in einem Schritt hochgezählt. Die Sperre des
-- Primärschlüssels verhindert, dass parallele Anfragen denselben Stand sehen
-- und die Grenze gemeinsam überschreiten.
--
-- Im Supabase SQL-Editor ausführen.

create table if not exists public.api_aufrufe (
  user_id uuid not null references auth.users (id) on delete cascade,
  endpunkt text not null,
  /** Beginn des Zeitfensters, auf die Fensterlänge abgerundet. */
  fenster timestamptz not null,
  anzahl integer not null default 0,
  primary key (user_id, endpunkt, fenster)
);

alter table public.api_aufrufe enable row level security;
-- Bewusst ohne Regeln: Nutzer haben hier nichts zu suchen. Geschrieben wird
-- ausschliesslich über die Funktion unten mit dem Service-Role-Schlüssel.

create index if not exists api_aufrufe_fenster_idx on public.api_aufrufe (fenster);

/**
 * Zählt einen Aufruf und sagt, ob er noch erlaubt ist.
 *
 * Rückgabe true = erlaubt, false = Grenze überschritten. Gezählt wird auch
 * der abgewiesene Aufruf: Wer gegen die Wand läuft, soll sie nicht durch
 * Weiterklopfen verschieben können.
 */
create or replace function public.drossel_zaehlen(
  p_user uuid,
  p_endpunkt text,
  p_fenster_sekunden integer,
  p_grenze integer
)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_fenster timestamptz;
  v_stand integer;
begin
  if p_user is null or p_endpunkt is null or p_fenster_sekunden <= 0 then
    return false;
  end if;

  -- Feste Fenster statt gleitender: Ein gleitendes Fenster braeuchte alle
  -- Einzelzeitpunkte, feste Fenster nur einen Zaehler. Der Preis ist, dass
  -- an der Fenstergrenze kurzzeitig bis zum Doppelten durchgeht - fuer den
  -- Zweck hier (Missbrauch bremsen, nicht exakt abrechnen) genuegt das.
  v_fenster := to_timestamp(
    floor(extract(epoch from now()) / p_fenster_sekunden) * p_fenster_sekunden
  );

  insert into public.api_aufrufe (user_id, endpunkt, fenster, anzahl)
    values (p_user, p_endpunkt, v_fenster, 1)
    on conflict (user_id, endpunkt, fenster)
    do update set anzahl = public.api_aufrufe.anzahl + 1
    returning anzahl into v_stand;

  -- Alte Fenster gelegentlich aufraeumen. Bei jedem Aufruf zu loeschen waere
  -- Verschwendung, ein eigener Zeitplan Mehraufwand; ein Prozent der Aufrufe
  -- haelt die Tabelle klein genug.
  if random() < 0.01 then
    delete from public.api_aufrufe where fenster < now() - interval '2 days';
  end if;

  return v_stand <= p_grenze;
end;
$$;

-- Die Funktion entscheidet ueber Zugang zu kostenpflichtigen Vorgaengen und
-- gehoert deshalb allein dem Server.
revoke all on function public.drossel_zaehlen(uuid, text, integer, integer) from public;
revoke all on function public.drossel_zaehlen(uuid, text, integer, integer) from anon;
revoke all on function public.drossel_zaehlen(uuid, text, integer, integer) from authenticated;
grant execute on function public.drossel_zaehlen(uuid, text, integer, integer) to service_role;
