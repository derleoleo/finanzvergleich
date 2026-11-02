// Die Zahlen im Beitrag zur mittelbaren Berechtigung gegen die Engine.
//
// Gleiches Muster wie ratgeber-zahlen.test.ts. Der Beitrag lebt von einer
// harten Schwelle — 120 € ja, 119 € nein — und von einem Deckel bei genau
// 350 € Ehegattenbeitrag. Beides sind Aussagen, die nur so lange tragen, wie
// die Engine sie bestätigt; eine Änderung an § 84 S. 3 oder am Mindestbeitrag
// soll diesen Test fällen und nicht den Beitrag stillschweigend falsch machen.

import { describe, expect, it } from "vitest";
import { berechneZulagen, guenstigerpruefung } from "./zulagen";
import { GESETZ } from "./config";
import TEXT from "../../../../ratgeber/mittelbare-berechtigung-ehegatte.md?raw";

const ALTER = 40;

function euro(zelle: string): number {
  return Number(zelle.replace(/\./g, "").replace(/\s*€/, "").replace(",", ".").trim());
}

function prozent(zelle: string): number {
  return Number(zelle.replace("%", "").replace(",", ".").trim());
}

/** Datenzeilen der ersten Tabelle nach `nachTitel` (siehe Ratgeber-Muster). */
function tabelle(nachTitel: string, spalten: number, mindestens = 3): string[][] {
  const ab = TEXT.indexOf(nachTitel);
  expect(ab, `Abschnitt "${nachTitel}" fehlt im Beitrag`).toBeGreaterThan(-1);
  const zeilen = TEXT.slice(ab).split("\n");
  const start = zeilen.findIndex((z: string) => z.trim().startsWith("|"));
  expect(start, `keine Tabelle nach "${nachTitel}"`).toBeGreaterThan(-1);
  const bis = zeilen.slice(start).findIndex((z: string) => !z.trim().startsWith("|"));
  const daten = zeilen
    .slice(start, bis < 0 ? undefined : start + bis)
    .map((z: string) => z.split("|").slice(1, -1).map((c: string) => c.trim()))
    .filter((c: string[]) => c.length === spalten && /\d/.test(c[0]) && !c[0].includes("---"));
  // Sonst prueft der Test stillschweigend nichts, wenn eine Zeile wegfaellt.
  expect(daten.length, `Tabelle nach "${nachTitel}" zu kurz`).toBeGreaterThanOrEqual(mindestens);
  return daten;
}

/** Mittelbare Zulage: eigener Beitrag, Beitrag des unmittelbar Berechtigten. */
function mittelbar(eigenbeitrag: number, ehegatte: number) {
  return berechneZulagen({
    eigenbeitrag,
    berechtigung: "mittelbar",
    eigenbeitragEhegatteUnmittelbar: ehegatte,
  });
}

describe("Ratgeber: mittelbare Berechtigung", () => {
  it("die Schwellentabelle stimmt mit der Engine ueberein", () => {
    const zeilen = tabelle("## Was passiert an der Schwelle von 120 €?", 3, 5);
    for (const [beitragZelle, zulageZelle, quoteZelle] of zeilen) {
      const beitrag = euro(beitragZelle);
      const z = mittelbar(beitrag, 1800);
      expect(z.grundzulage, `Grundzulage bei eigenem Beitrag ${beitrag} €`).toBe(
        euro(zulageZelle),
      );
      if (/\d/.test(quoteZelle)) {
        expect(
          (z.grundzulage / beitrag) * 100,
          `Quote bei eigenem Beitrag ${beitrag} €`,
        ).toBeCloseTo(prozent(quoteZelle), 1);
      }
    }
  });

  it("die Schwelle ist hart - 119 € bringen nichts, 120 € bringen alles", () => {
    // Die Kernaussage des Beitrags. Eine anteilige Kuerzung gibt es nicht.
    expect(mittelbar(119, 1800).grundzulage).toBe(0);
    expect(mittelbar(119, 1800).mindestbeitragErfuellt).toBe(false);
    expect(mittelbar(120, 1800).grundzulage).toBe(175);
    expect(mittelbar(120, 1800).mindestbeitragErfuellt).toBe(true);
    // Und der Betrag selbst steht so im Gesetz-Modul, nicht nur im Text.
    expect(GESETZ.MITTELBAR_MINDESTBEITRAG).toBe(120);
    expect(GESETZ.GZ_MAX_MITTELBAR).toBe(175);
    expect(TEXT).toContain("§ 79 S. 2 Nr. 4 EStG n.F.");
  });

  it("die Zulage bemisst sich am Beitrag des Ehegatten", () => {
    const zeilen = tabelle("## Warum hängt die Zulage am Beitrag des Ehegatten?", 2, 6);
    for (const [ehegatteZelle, zulageZelle] of zeilen) {
      const ehegatte = euro(ehegatteZelle);
      expect(
        mittelbar(120, ehegatte).grundzulage,
        `Grundzulage bei Ehegattenbeitrag ${ehegatte} €`,
      ).toBe(euro(zulageZelle));
    }
  });

  it("der Deckel ist bei genau 350 € Ehegattenbeitrag erreicht", () => {
    // Steht als "genau 350 €" im Text - also auch genau pruefen.
    expect(mittelbar(120, 349).grundzulage).toBeLessThan(175);
    expect(mittelbar(120, 350).grundzulage).toBe(175);
    expect(mittelbar(120, 1800).grundzulage).toBe(175);
    expect(TEXT).toContain("genau 350 €");
    // 350 x 0,50 € = 175 € - die erste Stufe allein reicht.
    expect(GESETZ.GZ_STUFE1_SATZ * 350).toBe(GESETZ.GZ_MAX_MITTELBAR);
  });

  it("die Abzugstabelle mit Ehegatten stimmt mit der Engine ueberein", () => {
    const zeilen = tabelle("## Was bringt der Ehegatte beim Sonderausgabenabzug?", 5, 3);
    expect(zeilen.length).toBe(3);

    const unmittelbar = berechneZulagen({
      eigenbeitrag: 1800,
      alterZuBeitragsjahresbeginn: ALTER,
      kinder: 2,
    });
    const ohneKinder = berechneZulagen({
      eigenbeitrag: 1800,
      alterZuBeitragsjahresbeginn: ALTER,
    });
    const ehegatte = mittelbar(120, 1800);
    const zulageGesamt = unmittelbar.zulageGesamt + ehegatte.zulageGesamt;

    for (const [zvEZelle, ohneZelle, mitZelle, gesamtZelle, quoteZelle] of zeilen) {
      const zvE = euro(zvEZelle);
      const ohne = guenstigerpruefung({
        eigenbeitrag: 1800,
        zulageGesamt: unmittelbar.zulageGesamt,
        zulageOhneKinder: ohneKinder.zulageGesamt,
        zvE,
        splitting: true,
      });
      const mit = guenstigerpruefung({
        eigenbeitrag: 1920,
        zulageGesamt,
        zulageOhneKinder: ohneKinder.zulageGesamt,
        zvE,
        splitting: true,
        ehegatteMittelbarBerechtigt: true,
      });
      expect(ohne.sonderausgabenVolumen, `Volumen ohne Ehegatten bei zvE ${zvE}`).toBe(
        euro(ohneZelle),
      );
      expect(mit.sonderausgabenVolumen, `Volumen mit Ehegatten bei zvE ${zvE}`).toBe(
        euro(mitZelle),
      );
      expect(Math.round(mit.gesamtfoerderung), `Gesamtfoerderung bei zvE ${zvE}`).toBe(
        euro(gesamtZelle),
      );
      expect(mit.foerderquote * 100, `Quote bei zvE ${zvE}`).toBeCloseTo(prozent(quoteZelle), 1);
    }
  });

  it("der Hoechstbetrag steigt um 120 €, nicht mehr um 60 €", () => {
    expect(GESETZ.SA_ERHOEHUNG_EHEGATTEN).toBe(120);
    expect(TEXT).toContain("§ 10a Abs. 3 S. 2–4 EStG n.F.");
    // Der Vergleich, mit dem der Beitrag argumentiert: 120 € mehr Beitrag
    // bringen 175 € mehr Zulage.
    expect(mittelbar(120, 1800).zulageGesamt).toBe(175);
    expect(TEXT).toContain("146 %");
  });
});
