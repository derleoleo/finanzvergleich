// Die Zahlen im Ratgeberbeitrag gegen die Engine.
//
// Warum als Test und nicht als Sorgfalt beim Schreiben: Ein Fachbeitrag mit
// Zahlen, die der eigene Rechner nicht mehr bestaetigt, ist schlimmer als kein
// Beitrag - er ist eine Falle fuer jeden Berater, der sich darauf stuetzt. Die
// Tabellen werden deshalb aus der Markdown-Datei gelesen und nachgerechnet.
// Wird ein Flag umgestellt oder eine Norm angepasst, faellt dieser Test und
// nennt die Zeile, die im Text nicht mehr stimmt.

import { describe, expect, it } from "vitest";
import { berechneZulagen, guenstigerpruefung } from "./zulagen";
import TEXT from "../../../../ratgeber/grenzfoerderquote-altersvorsorgedepot.md?raw";

const ALTER = 40;

/** Eine Euro-Angabe aus dem Text: "1.800 €" -> 1800. */
function euro(zelle: string): number {
  return Number(zelle.replace(/\./g, "").replace(/\s*€/, "").replace(",", ".").trim());
}

/** Eine Prozentangabe: "63,3 %" -> 63.3 */
function prozent(zelle: string): number {
  return Number(zelle.replace("%", "").replace(",", ".").trim());
}

/**
 * Liest die Datenzeilen der Tabelle, die auf `nachTitel` folgt.
 * Kopf- und Trennzeile fallen weg.
 */
function tabelle(nachTitel: string, spalten: number): string[][] {
  const ab = TEXT.indexOf(nachTitel);
  expect(ab, `Abschnitt "${nachTitel}" fehlt im Beitrag`).toBeGreaterThan(-1);
  const zeilen = TEXT.slice(ab)
    .split("\n")
    .filter((z: string) => z.trim().startsWith("|"));
  const daten = zeilen
    .map((z: string) => z.split("|").slice(1, -1).map((c: string) => c.trim()))
    .filter((c: string[]) => c.length === spalten && /\d/.test(c[0]) && !c[0].includes("---"));
  expect(daten.length).toBeGreaterThan(3);
  return daten;
}

describe("Ratgeber: Zahlen zur Grenzfoerderquote", () => {
  it("Tabelle mit zwei Kindern stimmt mit der Engine ueberein", () => {
    const zeilen = tabelle("## Was die Kinderzulage daraus macht", 4);
    for (const [beitragZelle, zulageZelle, gesamtZelle, quoteZelle] of zeilen) {
      const beitrag = euro(beitragZelle);
      const z = berechneZulagen({
        eigenbeitrag: beitrag,
        kinder: 2,
        alterZuBeitragsjahresbeginn: ALTER,
      });
      const g = guenstigerpruefung({
        eigenbeitrag: beitrag,
        zulageGesamt: z.zulageGesamt,
        zvE: 45000,
        splitting: false,
      });
      expect(z.zulageGesamt, `Zulage bei ${beitrag} €`).toBe(euro(zulageZelle));
      expect(g.gesamtfoerderung, `Gesamtfoerderung bei ${beitrag} €`).toBe(euro(gesamtZelle));
      expect(g.foerderquote * 100, `Quote bei ${beitrag} €`).toBeCloseTo(prozent(quoteZelle), 1);
    }
  });

  it("Tabelle ohne Kinder stimmt mit der Engine ueberein", () => {
    const zeilen = tabelle("## Der Denkfehler", 5);
    for (const [beitragZelle, zulageZelle, erstattungZelle, gesamtZelle, quoteZelle] of zeilen) {
      const beitrag = euro(beitragZelle);
      const z = berechneZulagen({ eigenbeitrag: beitrag, alterZuBeitragsjahresbeginn: ALTER });
      const g = guenstigerpruefung({
        eigenbeitrag: beitrag,
        zulageGesamt: z.zulageGesamt,
        zvE: 45000,
        splitting: false,
      });
      expect(z.zulageGesamt, `Zulage bei ${beitrag} €`).toBe(euro(zulageZelle));
      expect(g.zusaetzlicheErstattung, `Erstattung bei ${beitrag} €`).toBe(euro(erstattungZelle));
      expect(g.gesamtfoerderung, `Gesamt bei ${beitrag} €`).toBe(euro(gesamtZelle));
      expect(g.foerderquote * 100, `Quote bei ${beitrag} €`).toBeCloseTo(prozent(quoteZelle), 1);
    }
  });

  /** Gesamtfoerderung bei einem Beitrag - fuer die Grenzbetrachtung. */
  function gesamt(beitrag: number, kinder: number, zvE: number): number {
    const z = berechneZulagen({
      eigenbeitrag: beitrag,
      kinder,
      alterZuBeitragsjahresbeginn: ALTER,
    });
    return guenstigerpruefung({
      eigenbeitrag: beitrag,
      zulageGesamt: z.zulageGesamt,
      zvE,
      splitting: false,
    }).gesamtfoerderung;
  }

  it("die drei Grenzquoten im Text sind nachgerechnet", () => {
    // "Die darauf folgenden 1.500 € bringen 26 Cent je Euro" (zwei Kinder)
    const kinder = (gesamt(1800, 2, 45000) - gesamt(300, 2, 45000)) / 1500;
    expect(Math.round(kinder * 100)).toBe(26);
    expect(TEXT).toContain("26 Cent je Euro");

    // "Von 360 € auf 1.800 € bringt jeder zusaetzliche Euro noch 41 Cent"
    const mittel = (gesamt(1800, 0, 45000) - gesamt(360, 0, 45000)) / 1440;
    expect(Math.round(mittel * 100)).toBe(41);
    expect(TEXT).toContain("noch 41 Cent");

    // "Dort bringen die Euros oberhalb von 360 € sogar 52,5 Cent je Euro"
    const hoch = (gesamt(1800, 0, 80000) - gesamt(360, 0, 80000)) / 1440;
    expect(hoch * 100).toBeCloseTo(52.5, 1);
    expect(TEXT).toContain("**52,5 Cent**");
  });

  it("die Staffel im Text entspricht den normfixierten Werten", async () => {
    const { GESETZ } = await import("./config");
    expect(GESETZ.GZ_STUFE1_GRENZE).toBe(360);
    expect(GESETZ.GZ_STUFE2_GRENZE).toBe(1800);
    expect(GESETZ.MINDESTEIGENBEITRAG).toBe(120);
    expect(GESETZ.KZ_MAX_PRO_KIND).toBe(300);
    // Dieselben Zahlen muessen im Text stehen - sonst wirbt der Beitrag mit
    // einer Staffel, die der Rechner nicht verwendet.
    expect(TEXT).toContain("die ersten 360 €");
    expect(TEXT).toContain("von 360 € bis 1.800 €");
    expect(TEXT).toContain("120 € im Jahr");
    expect(TEXT).toContain("300 € je Kind");
  });

  it("der Beitrag nennt die beiden offenen Rechtsfragen als Annahme", async () => {
    // Die Flags sind der Grund, warum der Beitrag ueberhaupt belastbar ist.
    // Faellt einer weg oder kippt der Default, muss der Abschnitt mit.
    const { RECHTS_FLAGS_DEFAULT } = await import("./config");
    expect(RECHTS_FLAGS_DEFAULT.kinderzulageProKindUnabhaengig).toBe(true);
    expect(RECHTS_FLAGS_DEFAULT.kinderzulageErhoehtSaVolumen).toBe(true);
    expect(TEXT).toContain("§ 85 Abs. 1 S. 1 EStG n.F.");
    expect(TEXT).toContain("§ 10a Abs. 1 S. 1 EStG n.F.");
    expect(TEXT).toContain("2.340 €");
  });
});
