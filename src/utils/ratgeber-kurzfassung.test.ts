// Die Antwort am Anfang eines Beitrags darf nichts Neues behaupten.
//
// Der Anlass: Am 14.11.2026 ergab der KI-Check, dass Perplexity auf genau die
// Fragen, die drei dieser Beiträge beantworten, nur ungefähre Antworten gibt —
// „1.800 Euro für die maximale Förderung", „im Todesfall grundsätzlich
// vererbbar", „keine feste Einkommensgrenze". Die exakten Zahlen stehen in den
// Beiträgen, aber weit unten in Tabellen. Deshalb steht die Antwort jetzt im
// ersten Absatz.
//
// Damit entsteht eine Gefahr: eine zweite Fassung derselben Zahlen, oben im
// Fließtext, die bei der nächsten Modelländerung stehen bleibt, während die
// Tabelle darunter mitwandert. Die Tabellen sind gegen die Engine geprüft
// (`src/lib/finance/avd/ratgeber-*-zahlen.test.ts`); die Kurzfassung ist es
// nicht.
//
// Dieser Test schließt die Lücke von der anderen Seite: Jede Zahl in der
// Kurzfassung muss weiter unten im selben Beitrag noch einmal vorkommen — dort,
// wo sie nachgerechnet wird. Eine erfundene oder veraltete Zahl oben hat dann
// keine Deckung und fällt auf.

import { describe, expect, it } from "vitest";

const ROH = import.meta.glob("../../ratgeber/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BEITRAEGE = Object.entries(ROH).map(([pfad, text]) => ({
  datei: pfad.split("/").pop() as string,
  text,
}));

const MARKE = "**Kurz gesagt:**";

/** Die Kurzfassung: vom Marker bis zur nächsten Leerzeile. */
function kurzfassung(text: string): string | null {
  const ab = text.indexOf(MARKE);
  if (ab < 0) return null;
  const rest = text.slice(ab);
  const ende = rest.search(/\r?\n\s*\r?\n/);
  return ende < 0 ? rest : rest.slice(0, ende);
}

/** Jede Zahlenaussage: Beträge, Prozente, Centbeträge. */
function zahlen(text: string): string[] {
  const treffer = text.match(/\d[\d.]*\s?(?:€|%)|\d+\s?Cent/g) ?? [];
  return [...new Set(treffer.map((z) => z.replace(/\s+/g, " ").trim()))];
}

describe("Kurzfassung am Beitragsanfang", () => {
  const mitKurzfassung = BEITRAEGE.filter((b) => b.text.includes(MARKE));

  it("es gibt sie überhaupt", () => {
    // Drei Beiträge haben sie bekommen. Faellt eine weg, soll das auffallen.
    expect(mitKurzfassung.length).toBeGreaterThanOrEqual(3);
  });

  for (const b of mitKurzfassung) {
    it(`${b.datei}: jede Zahl steht auch im Beitrag selbst`, () => {
      const kurz = kurzfassung(b.text);
      expect(kurz, `Kurzfassung in ${b.datei} nicht lesbar`).not.toBeNull();
      const rest = b.text.replace(kurz as string, "");
      const gefunden = zahlen(kurz as string);
      expect(gefunden.length, `${b.datei}: Kurzfassung nennt keine Zahl`).toBeGreaterThan(0);
      for (const z of gefunden) {
        expect(rest, `${b.datei}: "${z}" steht nur in der Kurzfassung`).toContain(z);
      }
    });

    it(`${b.datei}: steht vor dem ersten Absatz, nicht irgendwo`, () => {
      // Eine Antwort, die erst auf halber Hoehe kommt, loest das Problem nicht.
      const vor = b.text.slice(0, b.text.indexOf(MARKE));
      expect(vor, `${b.datei}: Kurzfassung steht nach einer Überschrift`).not.toMatch(
        /^##\s/m,
      );
    });
  }
});
