// Die Zahlen im Beitrag zur Günstigerprüfung gegen die Engine.
//
// Gleiches Muster wie ratgeber-zahlen.test.ts: Die Tabellen werden aus der
// Markdown-Datei gelesen und nachgerechnet. Ein Fachbeitrag mit Zahlen, die
// der eigene Rechner nicht mehr bestätigt, ist schlimmer als kein Beitrag.
//
// Besonders hier: Der Beitrag nennt Umschlagpunkte. Die liegen auf einem
// flachen Abschnitt des Steuertarifs — eine Angabe auf den Euro wäre
// Scheingenauigkeit, und ein Test darauf würde bei jeder Tarifänderung aus dem
// falschen Grund fallen. Geprüft wird deshalb die Aussage, nicht die Stelle:
// vor dem genannten Punkt gewinnt die Zulage, dahinter der Abzug.

import { describe, expect, it } from "vitest";
import { berechneZulagen, guenstigerpruefung } from "./zulagen";
import { RECHTS_FLAGS_DEFAULT } from "./config";
import TEXT from "../../../../ratgeber/zulage-oder-sonderausgabenabzug.md?raw";

const ALTER = 40;
const BEITRAG = 1800;

/** "1.800 €" -> 1800 */
function euro(zelle: string): number {
  return Number(zelle.replace(/\./g, "").replace(/\s*€/, "").replace(",", ".").trim());
}

/** "63,3 %" -> 63.3 */
function prozent(zelle: string): number {
  return Number(zelle.replace("%", "").replace(",", ".").trim());
}

/**
 * Datenzeilen der **ersten** Tabelle nach `nachTitel`.
 *
 * Nur der erste zusammenhaengende Block von `|`-Zeilen, nicht alles, was
 * danach noch kommt: Dieser Beitrag hat mehrere vierspaltige Tabellen, und ein
 * Leser, der bis zum Dateiende sammelt, mischt sie zu einer zusammen.
 */
function tabelle(nachTitel: string, spalten: number, mindestens = 3): string[][] {
  const ab = TEXT.indexOf(nachTitel);
  expect(ab, `Abschnitt "${nachTitel}" fehlt im Beitrag`).toBeGreaterThan(-1);
  const zeilen = TEXT.slice(ab).split("\n");
  const start = zeilen.findIndex((z: string) => z.trim().startsWith("|"));
  expect(start, `keine Tabelle nach "${nachTitel}"`).toBeGreaterThan(-1);
  const bis = zeilen.slice(start).findIndex((z: string) => !z.trim().startsWith("|"));
  const block = zeilen.slice(start, bis < 0 ? undefined : start + bis);

  const daten = block
    .map((z: string) => z.split("|").slice(1, -1).map((c: string) => c.trim()))
    .filter((c: string[]) => c.length === spalten && /\d/.test(c[0]) && !c[0].includes("---"));
  expect(daten.length, `Tabelle nach "${nachTitel}" zu kurz`).toBeGreaterThanOrEqual(mindestens);
  return daten;
}

/** Zulage und Zulage-ohne-Kinder für eine Kinderzahl. */
function zulagen(kinder: number) {
  const z = berechneZulagen({
    eigenbeitrag: BEITRAG,
    alterZuBeitragsjahresbeginn: ALTER,
    kinder,
  });
  const ohneKinder = berechneZulagen({
    eigenbeitrag: BEITRAG,
    alterZuBeitragsjahresbeginn: ALTER,
  });
  return { zulageGesamt: z.zulageGesamt, zulageOhneKinder: ohneKinder.zulageGesamt };
}

function pruefe(kinder: number, zvE: number, splitting = false, flags = RECHTS_FLAGS_DEFAULT) {
  const { zulageGesamt, zulageOhneKinder } = zulagen(kinder);
  return guenstigerpruefung({
    eigenbeitrag: BEITRAG,
    zulageGesamt,
    zulageOhneKinder,
    zvE,
    splitting,
    flags,
  });
}

describe("Ratgeber: Zulage oder Sonderausgabenabzug", () => {
  it("die Tabelle ohne Kinder stimmt mit der Engine ueberein", () => {
    const zeilen = tabelle("## Ab welchem Einkommen trägt der Abzug ohne Kinder?", 4, 8);
    for (const [zvEZelle, entlastungZelle, gesamtZelle, quoteZelle] of zeilen) {
      const zvE = euro(zvEZelle);
      const g = pruefe(0, zvE);
      expect(Math.round(g.steuerentlastung), `Entlastung bei zvE ${zvE}`).toBe(
        euro(entlastungZelle),
      );
      expect(Math.round(g.gesamtfoerderung), `Gesamtfoerderung bei zvE ${zvE}`).toBe(
        euro(gesamtZelle),
      );
      expect(g.foerderquote * 100, `Quote bei zvE ${zvE}`).toBeCloseTo(prozent(quoteZelle), 1);
    }
  });

  it("die Tabelle mit zwei Kindern stimmt mit der Engine ueberein", () => {
    const zeilen = tabelle("## Warum verschieben Kinder den Punkt so weit?", 4, 5);
    for (const [zvEZelle, entlastungZelle, gesamtZelle, quoteZelle] of zeilen) {
      const zvE = euro(zvEZelle);
      const g = pruefe(2, zvE);
      expect(Math.round(g.steuerentlastung), `Entlastung bei zvE ${zvE}`).toBe(
        euro(entlastungZelle),
      );
      expect(Math.round(g.gesamtfoerderung), `Gesamtfoerderung bei zvE ${zvE}`).toBe(
        euro(gesamtZelle),
      );
      expect(g.foerderquote * 100, `Quote bei zvE ${zvE}`).toBeCloseTo(prozent(quoteZelle), 1);
    }
  });

  it("die genannten Zulagen je Kinderzahl stimmen", () => {
    const zeilen = tabelle("Alle drei Punkte nebeneinander", 4, 3);
    expect(zeilen).toHaveLength(3);
    for (const [kinderZelle, zulageZelle] of zeilen) {
      const kinder = Number(kinderZelle);
      expect(zulagen(kinder).zulageGesamt, `Zulage bei ${kinder} Kindern`).toBe(euro(zulageZelle));
    }
  });

  it("die Umschlagpunkte trennen wirklich die beiden Wege", () => {
    // Nicht die Stelle, sondern die Aussage: 500 € unter dem genannten Punkt
    // gewinnt die Zulage, 500 € darueber der Abzug. Der Abstand ist gross
    // genug, um die Rundung auf 100 € abzudecken, und klein genug, dass eine
    // echte Verschiebung auffaellt.
    const zeilen = tabelle("Alle drei Punkte nebeneinander", 4, 3);
    for (const [kinderZelle, , grundtarifZelle, splittingZelle] of zeilen) {
      const kinder = Number(kinderZelle);
      for (const [punkt, splitting] of [
        [euro(grundtarifZelle), false],
        [euro(splittingZelle), true],
      ] as [number, boolean][]) {
        expect(
          pruefe(kinder, punkt - 500, splitting).ergebnis,
          `${kinder} Kinder, ${splitting ? "Splitting" : "Grundtarif"}: unter ${punkt} muss die Zulage gewinnen`,
        ).toBe("zulage");
        expect(
          pruefe(kinder, punkt + 500, splitting).ergebnis,
          `${kinder} Kinder, ${splitting ? "Splitting" : "Grundtarif"}: ueber ${punkt} muss der Abzug gewinnen`,
        ).toBe("sonderausgabenabzug");
      }
    }
  });

  it("die enge BMF-Lesart kippt bei zwei Kindern tatsaechlich nie", () => {
    // Die Kernaussage des letzten Abschnitts. Faellt dieser Test, ist der
    // Beitrag an seiner wichtigsten Stelle falsch.
    const eng = { ...RECHTS_FLAGS_DEFAULT, kinderzulageErhoehtSaVolumen: false };
    for (const zvE of [60000, 80000, 150000, 500000]) {
      const g = pruefe(2, zvE, false, eng);
      expect(g.ergebnis, `enge Lesart bei zvE ${zvE}`).toBe("zulage");
    }
    // Und die beiden Zahlen, die im Text als Gegenueberstellung stehen.
    expect(Math.round(pruefe(2, 80000).steuerentlastung)).toBe(1235);
    expect(Math.round(pruefe(2, 80000, false, eng).steuerentlastung)).toBe(983);
    expect(pruefe(2, 80000).sonderausgabenVolumen).toBe(2940);
    expect(pruefe(2, 80000, false, eng).sonderausgabenVolumen).toBe(2340);
    expect(TEXT).toContain("2.940 €");
    expect(TEXT).toContain("2.340 €");
    expect(TEXT).toContain("kein Umschlag");
  });

  it("nennt die Normen, auf die er sich stuetzt", () => {
    for (const norm of [
      "§ 10a Abs. 1",
      "§ 84",
      "§ 85 Abs. 1 S. 1",
      "§ 32a",
    ]) {
      expect(TEXT, `Fundstelle ${norm} fehlt`).toContain(norm);
    }
    // Die Guenstigerpruefung laeuft von Amts wegen - die Aussage, die ein
    // Berater am haeufigsten falsch macht.
    expect(TEXT).toContain("von Amts wegen");
  });
});
