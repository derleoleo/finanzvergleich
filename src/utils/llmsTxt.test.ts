// src/utils/llmsTxt.test.ts
// `/llms.txt` darf nicht veralten.
//
// Der ganze Zweck der Datei ist, dass ein Abrufer erfährt, welche Adressen es
// gibt. Eine Karte, auf der ein Beitrag fehlt, ist schlechter als keine –
// deshalb wird sie beim Bauen erzeugt, und deshalb prüft dieser Test gegen
// die echten Markdown-Dateien statt gegen eine Beispielliste.

import { describe, expect, it } from "vitest";
import { llmsTxt } from "./llmsTxt";
import { DOMAIN, beitragLesen } from "./ratgeber";
import { RECHNER } from "./rechner";
import { FREI_BERECHNUNGEN_PRO_MONAT, PREIS_JAHR, PREIS_MONAT, eur } from "./preise";

function lesen(muster: Record<string, string>) {
  return Object.entries(muster).map(([pfad, text]) =>
    beitragLesen(pfad.split("/").pop() as string, text),
  );
}

const BEITRAEGE = lesen(
  import.meta.glob("../../ratgeber/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>,
);
const TEXTSEITEN = lesen(
  import.meta.glob("../../seiten/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>,
);

const TXT = llmsTxt(BEITRAEGE, TEXTSEITEN);

describe("llms.txt", () => {
  it("beginnt mit Namen und einem Satz, wie die Konvention es vorsieht", () => {
    expect(TXT.startsWith("# Vorsorgewaage")).toBe(true);
    expect(TXT).toContain("\n> ");
  });

  it("nennt jeden Ratgeberbeitrag mit absoluter Adresse", () => {
    expect(BEITRAEGE.length).toBeGreaterThan(0);
    for (const b of BEITRAEGE) {
      expect(TXT, `Beitrag fehlt: ${b.slug}`).toContain(`${DOMAIN}/ratgeber/${b.slug}/`);
      expect(TXT).toContain(b.beschreibung);
    }
  });

  it("nennt jede Einzelseite", () => {
    expect(TEXTSEITEN.length).toBeGreaterThan(0);
    for (const b of TEXTSEITEN) {
      expect(TXT, `Seite fehlt: ${b.slug}`).toContain(`${DOMAIN}/${b.slug}`);
    }
  });

  it("nennt alle Rechner", () => {
    for (const r of RECHNER) {
      expect(TXT, `Rechner fehlt: ${r.name}`).toContain(r.name);
    }
  });

  it("holt die Preise aus preise.ts", () => {
    expect(TXT).toContain(eur(PREIS_MONAT));
    expect(TXT).toContain(eur(PREIS_JAHR));
    expect(TXT).toContain(String(FREI_BERECHNUNGEN_PRO_MONAT));
  });

  it("sagt, was nicht erlaubt ist, und was erlaubt ist", () => {
    // Die Entscheidung aus docs/ki-crawler-entscheidung.md in Worten: lesen
    // und zitieren ja, Training nein. Ohne diesen Absatz liest ein Assistent
    // nur die Sperre in robots.txt und haelt sich fuer unerwuenscht.
    expect(TXT).toContain("GPTBot");
    expect(TXT).toContain("zitiert werden");
  });

  it("stellt klar, dass es keine Beratung ist", () => {
    expect(TXT).toContain("keine** Finanz-, Steuer- oder Rechtsberatung");
    expect(TXT).toContain("Privatpersonen");
  });
});
