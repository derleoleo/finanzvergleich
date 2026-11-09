-- Sieben Spalten, die der Code längst schreibt und die Tabellen nie bekamen.
--
-- Im Supabase SQL-Editor ausführen (oder via supabase db push).
--
-- ## Der Anlass
--
-- Am 09.11.2026 gemeldet: Der Rentenlückenrechner speichert nicht, Meldung
-- „Fehler beim Speichern". Ursache war nicht die Eingabe, sondern das Schema.
-- Alle vier Rechner mit Einzelspalten speichern mit `{ ...formData, results }`
-- — jedes Formularfeld wandert also als Spalte in den Insert. Für sieben
-- Felder gab es diese Spalte nie, und PostgREST lehnt daraufhin den
-- **gesamten** Insert mit PGRST204 ab.
--
-- Entstanden ist das in drei Schritten, bei denen die Migration jeweils
-- vergessen wurde:
--
--   29.09.2026  ae8a528  withdrawal_end_age (Planungshorizont, Audit F15)
--   26.10.2026  8c97a1b  einnahmen_basis, abzuege_gesetzliche_rente_percent (C04)
--   (älter)              die Fondslisten und die BestAdvice-Felder
--
-- Beim Sparvertragsrechner wurde es richtig gemacht — siehe
-- 20260711120000_add_dynamik_percent.sql. Dort war es ein Feld; hier sind es
-- sieben, über drei Tabellen.
--
-- ## Zwei Entscheidungen, die hier drinstecken
--
-- **`if not exists` durchgängig.** Das Schema entstand ursprünglich im
-- Dashboard (siehe den Kopf von 00000000000001_ausgangsstand_tabellen.sql).
-- Es ist also möglich, dass einzelne Spalten in der Produktion längst von
-- Hand angelegt wurden, ohne dass das Repository davon weiß. Mit
-- `if not exists` ist diese Datei mehrfach ausführbar und in beiden Fällen
-- richtig — sie muss nicht wissen, was dort wirklich steht.
--
-- **Alles nullable, kein Default.** Bestehende Zeilen bleiben gültig, und ein
-- fehlender Wert ist ehrlicher als ein erfundener: Eine Berechnung von
-- September weiß nichts über einen Planungshorizont, der im Oktober
-- dazukam. Keine Datenwanderung nötig.
--
-- `src/entities/schema.test.ts` hält ab jetzt fest, dass Formularfelder und
-- Spalten zusammenpassen — er wäre am 29.09.2026 rot geworden.

-- Rentenlücke: der gemeldete Fall.
alter table public.pension_gap_calculations
  add column if not exists withdrawal_end_age integer,
  -- 'heute' | 'rentenbeginn' — in welchem Geldwert die Einnahmen stehen.
  add column if not exists einnahmen_basis text,
  add column if not exists abzuege_gesetzliche_rente_percent numeric;

-- Einmalanlage: die gewichteten Fondslisten. Auf `calculations` gibt es sie
-- als jsonb (Zeile 113/114 des Ausgangsstands), hier wurden sie vergessen.
alter table public.single_payment_calculations
  add column if not exists lv_funds jsonb,
  add column if not exists depot_funds jsonb;

-- BestAdvice: zwei Felder – und nur zwei.
--
-- Der Rechner entfernt sechs weitere Formularfelder vor dem Speichern
-- ausdrücklich wieder (BestAdviceCalculator.tsx:444-454: extra_lvs, die
-- beiden Overrides, current_contract_start_year, current_eingezahlt_bisher,
-- current_wechselkosten). Der Kommentar dort sagt warum: Sie stecken in den
-- Ergebnissen (Audit F06). Für die gehören hier **keine** Spalten angelegt –
-- das wäre eine zweite Ablage derselben Angabe.
--
-- Diese beiden werden dagegen gesendet und haben keine Spalte. Nicht zu
-- verwechseln mit current_product_tax_free, das es gibt.
alter table public.best_advice_calculations
  add column if not exists current_fondsgebunden boolean,
  add column if not exists current_rueckkaufswert_ist_netto boolean;
