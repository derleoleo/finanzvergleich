// src/entities/schema.test.ts
// Jedes Formularfeld, das gespeichert wird, braucht eine Spalte.
//
// ## Warum es diesen Test gibt
//
// Am 09.11.2026 meldete ein Nutzer, der Rentenlückenrechner speichere nicht –
// „Fehler beim Speichern". Die Ursache: `PensionGapCalculator` speichert mit
// `{ ...formData, results }`, und drei Felder des Formulars hatten in
// `pension_gap_calculations` nie eine Spalte bekommen. Eingeführt wurden sie
// am 29.09. (`withdrawal_end_age`) und am 26.10.2026 (`einnahmen_basis`,
// `abzuege_gesetzliche_rente_percent`) – **beide Male ohne Migration.**
// PostgREST lehnt den ganzen Insert mit `PGRST204` ab.
//
// Drei Dinge haben zusammen dafür gesorgt, dass das sechs Wochen unbemerkt
// blieb:
//
//  1. Die Oberfläche zeigt einen Allgemeinplatz; die Meldung, die die Spalte
//     beim Namen nennt, landete nur in der Browser-Konsole.
//  2. TypeScript konnte es nicht fangen. Auf Eigenschaften, die über einen
//     Spread hereinkommen, wendet es die Excess-Property-Prüfung nicht an –
//     und `withdrawal_end_age` stand sogar im Model-Typ, beschrieb also eine
//     Spalte, die es nicht gab.
//  3. Kein Test deckte das Speichern ab.
//
// Dieser Test schließt Lücke 3 für die ganze Klasse, nicht nur für den einen
// Rechner: Er hätte am 29.09.2026 angeschlagen.
//
// ## Was er prüft
//
// Die Spalten kommen aus `supabase/migrations/*.sql`, die Felder aus dem
// `FormData`-Typ der jeweiligen Seite – **derselben Quelle, die der Spread
// verschickt**. Eine abgeschriebene Feldliste wäre eine zweite Fassung und
// liefe irgendwann auseinander.
//
// Nicht geprüft werden kann, ob die Produktivdatenbank wirklich so aussieht
// wie die Migrationen: Das Schema entstand ursprünglich im Dashboard (siehe
// den Kopf von `00000000000001_ausgangsstand_tabellen.sql`). Der Test hält
// also das Repository in sich stimmig – mehr kann er von hier aus nicht, und
// mehr braucht es auch nicht, damit der Fehler nicht wiederkommt.

import { describe, expect, it } from "vitest";

const MIGRATIONEN = import.meta.glob("../../supabase/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const SEITEN = import.meta.glob("../pages/*Calculator.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/**
 * Die Rechner, deren Tabelle eine Spalte je Feld führt.
 *
 * `avd_calculations`, `net_policy_calculations` und `withdrawal_plans` fehlen
 * hier mit Absicht: Sie legen das Formular als `form jsonb` ab und sind gegen
 * diese Fehlerklasse immun. Wer einen neuen Rechner dieser Bauart anlegt,
 * braucht hier nichts einzutragen – wer einen mit Einzelspalten anlegt,
 * schon.
 */
const RECHNER: { tabelle: string; seite: string }[] = [
  { tabelle: "calculations", seite: "Calculator.tsx" },
  { tabelle: "single_payment_calculations", seite: "SinglePaymentCalculator.tsx" },
  { tabelle: "best_advice_calculations", seite: "BestAdviceCalculator.tsx" },
  { tabelle: "pension_gap_calculations", seite: "PensionGapCalculator.tsx" },
];

/** Spalten vom Server gesetzt oder gesondert übergeben – kein Formularfeld. */
const NICHT_AUS_DEM_FORMULAR = new Set(["id", "user_id", "created_date", "results"]);

/** Alle Spalten einer Tabelle, aus `create table` und allen `add column`. */
function spaltenVon(tabelle: string): Set<string> {
  const spalten = new Set<string>();
  for (const sql of Object.values(MIGRATIONEN)) {
    const angelegt = new RegExp(
      `create table if not exists public\\.${tabelle}\\s*\\(([\\s\\S]*?)\\n\\);`,
    ).exec(sql);
    if (angelegt) {
      for (const zeile of angelegt[1].split("\n")) {
        const name = /^\s*([a-z][a-z0-9_]*)\s+\S/.exec(zeile)?.[1];
        if (name) spalten.add(name);
      }
    }
    const nachtraeglich = new RegExp(
      `alter table public\\.${tabelle}\\s+([\\s\\S]*?);`,
      "g",
    );
    for (const t of sql.matchAll(nachtraeglich)) {
      for (const s of t[1].matchAll(/add column(?:\s+if not exists)?\s+([a-z][a-z0-9_]*)/g)) {
        spalten.add(s[1]);
      }
    }
  }
  return spalten;
}

/**
 * Die Felder auf oberster Ebene des `FormData`-Typs einer Seite.
 *
 * Klammern werden mitgezählt, damit ein verschachteltes Objekt nicht seine
 * inneren Felder beisteuert – die reisen als ein Wert mit, nicht als eigene
 * Spalten.
 */
function formularfelderVon(quelle: string): string[] {
  const start = quelle.indexOf("type FormData = {");
  if (start < 0) return [];
  const felder: string[] = [];
  let tiefe = 0;
  for (const zeile of quelle.slice(start).split("\n").slice(1)) {
    if (tiefe === 0 && /^\};/.test(zeile)) break;
    if (tiefe === 0) {
      const name = /^\s{2}([a-z][a-zA-Z0-9_]*)\??\s*:/.exec(zeile)?.[1];
      if (name) felder.push(name);
    }
    tiefe += (zeile.match(/\{/g) ?? []).length - (zeile.match(/\}/g) ?? []).length;
  }
  return felder;
}

/**
 * Felder, die vor dem Speichern ausdruecklich wieder entfernt werden.
 *
 * `BestAdviceCalculator.tsx:444-454` destrukturiert sechs Felder aus
 * `formData` heraus, bevor der Rest gespeichert wird – mit Begruendung: Sie
 * stecken in den Ergebnissen (Audit F06). Fuer die gehoert **keine** Spalte
 * angelegt, und dieser Test darf sie nicht anmahnen.
 *
 * Erkannt wird das Muster `const { a: _x, b: _y, ...rest } = formData;`.
 */
function ausgenommeneFelder(quelle: string): Set<string> {
  const muster = /const \{([\s\S]*?)\.\.\.\w+\s*\}\s*=\s*formData;/.exec(quelle);
  if (!muster) return new Set();
  return new Set(
    [...muster[1].matchAll(/^\s*([a-z][a-zA-Z0-9_]*)\s*:/gm)].map((t) => t[1]),
  );
}

/** Was tatsaechlich im Insert landet: Formularfelder minus Ausgenommene. */
function gesendeteFelder(quelle: string): string[] {
  const aus = ausgenommeneFelder(quelle);
  return formularfelderVon(quelle).filter((f) => !aus.has(f));
}

describe("Formularfelder und Tabellenspalten", () => {
  it("die Migrationen und die Seiten sind überhaupt lesbar", () => {
    // Ohne diese Vorprüfung wäre alles Weitere still leer und grün.
    expect(Object.keys(MIGRATIONEN).length).toBeGreaterThan(5);
    expect(Object.keys(SEITEN).length).toBeGreaterThan(3);
    expect(spaltenVon("calculations").size).toBeGreaterThan(15);
  });

  for (const { tabelle, seite } of RECHNER) {
    it(`${seite} speichert nur Felder, die ${tabelle} als Spalte hat`, () => {
      const quelle = Object.entries(SEITEN).find(([p]) => p.endsWith(`/${seite}`))?.[1];
      expect(quelle, `${seite} nicht gefunden`).toBeDefined();

      const felder = gesendeteFelder(quelle!);
      expect(felder.length, `kein FormData-Typ in ${seite} gefunden`).toBeGreaterThan(3);

      const spalten = spaltenVon(tabelle);
      const fehlend = felder.filter(
        (f) => !spalten.has(f) && !NICHT_AUS_DEM_FORMULAR.has(f),
      );

      expect(
        fehlend,
        `Diese Felder werden gespeichert, haben in ${tabelle} aber keine Spalte. ` +
          "Der Insert schlaegt dadurch komplett fehl (PGRST204) - es braucht eine " +
          "Migration in supabase/migrations/",
      ).toEqual([]);
    });
  }

  it("der Model-Typ beschreibt keine Spalte, die es nicht gibt", () => {
    /*
     * Die zweite Richtung. `withdrawal_end_age` stand in `PensionGapModel`
     * und sah damit aus wie eine vorhandene Spalte - der Typ hat den Fehler
     * nicht nur nicht gefangen, er hat ihn plausibel aussehen lassen.
     */
    const modelle = import.meta.glob("./*Calculation.ts", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;

    const zuTabelle: Record<string, string> = {
      "./Calculation.ts": "calculations",
      "./SinglePaymentCalculation.ts": "single_payment_calculations",
      "./BestAdviceCalculation.ts": "best_advice_calculations",
      "./PensionGapCalculation.ts": "pension_gap_calculations",
    };

    for (const [pfad, tabelle] of Object.entries(zuTabelle)) {
      const quelle = modelle[pfad];
      if (!quelle) continue;
      const spalten = spaltenVon(tabelle);
      const typ = /export type \w+Model = \{([\s\S]*?)\n\};/.exec(quelle)?.[1] ?? "";
      const erfunden: string[] = [];
      let tiefe = 0;
      for (const zeile of typ.split("\n")) {
        if (tiefe === 0) {
          const name = /^\s{2}([a-z][a-zA-Z0-9_]*)\??\s*:/.exec(zeile)?.[1];
          if (name && !spalten.has(name) && !NICHT_AUS_DEM_FORMULAR.has(name)) {
            erfunden.push(name);
          }
        }
        tiefe += (zeile.match(/\{/g) ?? []).length - (zeile.match(/\}/g) ?? []).length;
      }
      expect(erfunden, `${pfad} beschreibt Spalten, die ${tabelle} nicht hat`).toEqual([]);
    }
  });
});
