-- Fassungen gehören zu einem eigenen Fall (Audit D01).
--
-- Bisher genügte beim Anlegen einer Fassung `auth.uid() = user_id`. Ob die
-- mitgegebene `fall_id` überhaupt zu einem eigenen Fall gehört, prüfte
-- niemand. Gleichzeitig gilt die Eindeutigkeit global für
-- `(fall_tabelle, fall_id, version)`, während `naechste_fallversion` nur die
-- eigenen Zeilen zählte.
--
-- Daraus ergab sich: Wer eine fremde Fall-Kennung kennt, konnte unter seiner
-- eigenen Nutzerkennung eine Fassung mit einer noch freien Nummer für diesen
-- fremden Fall einfügen. Der Eigentümer sah die Zeile wegen der
-- Zugriffsregeln nicht, seine Nummernfunktion zählte sie nicht mit – und sein
-- nächstes Speichern lief in die Eindeutigkeitsverletzung. Fremde Inhalte
-- waren dabei nicht lesbar; es ging um die Verfügbarkeit des Speicherns.
--
-- Abhilfe: Anlegen nur noch über eine Funktion, die den Elternfall prüft. Das
-- direkte INSERT wird entzogen – eine Regel, die man umgehen kann, indem man
-- sie einfach nicht benutzt, ist keine.
--
-- Im Supabase SQL-Editor ausführen.

-- ---------------------------------------------------------------------------
-- 1. Anlegen mit Besitzprüfung
-- ---------------------------------------------------------------------------

create or replace function public.fassung_anlegen(
  p_fall_tabelle text,
  p_fall_id uuid,
  p_name text,
  p_form jsonb,
  p_results jsonb,
  p_reihen jsonb default null
)
returns public.fall_versionen
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_gehoert boolean;
  v_version integer;
  v_zeile public.fall_versionen;
begin
  if v_user is null then
    raise exception 'nicht angemeldet' using errcode = '42501';
  end if;

  -- Feste Liste, weil der Tabellenname in dynamisches SQL geht. Ohne sie wäre
  -- das eine offene Tür in jede Tabelle des Schemas.
  if p_fall_tabelle not in (
    'calculations',
    'single_payment_calculations',
    'best_advice_calculations',
    'pension_gap_calculations',
    'avd_calculations',
    'net_policy_calculations',
    'withdrawal_plans'
  ) then
    raise exception 'unbekannte Falltabelle: %', p_fall_tabelle
      using errcode = '22023';
  end if;

  execute format(
    'select exists (select 1 from public.%I where id = $1 and user_id = $2)',
    p_fall_tabelle
  )
  into v_gehoert
  using p_fall_id, v_user;

  if not v_gehoert then
    -- Bewusst dieselbe Meldung für „gibt es nicht" und „gehört jemand
    -- anderem": Der Unterschied würde verraten, welche Kennungen existieren.
    raise exception 'Fall nicht gefunden' using errcode = '42501';
  end if;

  -- Ohne Nutzerfilter, passend zur globalen Eindeutigkeit der Spalte. Mit
  -- Filter konnte die Nummer bereits belegt sein.
  select coalesce(max(version), 0) + 1
  into v_version
  from public.fall_versionen
  where fall_tabelle = p_fall_tabelle
    and fall_id = p_fall_id;

  insert into public.fall_versionen (
    user_id, fall_tabelle, fall_id, version, name, form, results, reihen
  )
  values (
    v_user, p_fall_tabelle, p_fall_id, v_version, p_name, p_form, p_results, p_reihen
  )
  returning * into v_zeile;

  return v_zeile;
end;
$$;

revoke all on function public.fassung_anlegen(text, uuid, text, jsonb, jsonb, jsonb)
  from public;
revoke all on function public.fassung_anlegen(text, uuid, text, jsonb, jsonb, jsonb)
  from anon;
-- Angemeldete dürfen sie rufen: Die Funktion prüft selbst, für wen sie
-- arbeitet, und nimmt die Nutzerkennung nicht als Parameter.
grant execute on function public.fassung_anlegen(text, uuid, text, jsonb, jsonb, jsonb)
  to authenticated;
grant execute on function public.fassung_anlegen(text, uuid, text, jsonb, jsonb, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- 2. Direktes Anlegen entziehen
-- ---------------------------------------------------------------------------

-- Lesen, Löschen und das Verbot von UPDATE bleiben unverändert.
drop policy if exists versionen_anlegen on public.fall_versionen;

-- ---------------------------------------------------------------------------
-- 3. Die alte Nummernfunktion entfernen
-- ---------------------------------------------------------------------------

-- Sie zählte nur eigene Zeilen und konnte deshalb eine Nummer liefern, die
-- global bereits belegt war. Die Nummer zieht jetzt `fassung_anlegen` selbst;
-- eine zweite, abweichende Quelle dafür ist genau die Doppelung, aus der der
-- Fehler entstand.
drop function if exists public.naechste_fallversion(text, uuid);
