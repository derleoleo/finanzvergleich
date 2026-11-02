// Die Einzelseiten unter `/` – „Was ist Vorsorgewaage?" und was noch kommt.
//
// Zwei Dinge hält dieser Test fest.
//
// Erstens: Der Text steht im ausgelieferten HTML. Genau das war der Grund für
// die Umstellung — als React-Seite lieferte sie null Wörter ohne JavaScript.
// Ein Test auf „enthält den Text" ist hier also kein Selbstzweck, sondern die
// Zusage, um derentwillen die Seite existiert.
//
// Zweitens: Die Preise stehen im Markdown wörtlich. Das verletzt die Regel,
// dass `preise.ts` die einzige Quelle ist — es sei denn, ein Test hält beide
// zusammen. Dasselbe Muster wie bei den Zahlen der Ratgeberbeiträge: Der Text
// darf Zahlen nennen, solange sie nachgerechnet werden.

import { describe, expect, it } from "vitest";
import { DOMAIN, beitragLesen, einzelseite } from "./ratgeber";
import { FREI_BERECHNUNGEN_PRO_MONAT, PREIS_JAHR, PREIS_MONAT, eur } from "./preise";
import SITEMAP from "../../public/sitemap.xml?raw";

const ROH = import.meta.glob("../../seiten/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const SEITEN = Object.entries(ROH).map(([pfad, text]) => ({
  datei: pfad.split("/").pop() as string,
  text,
}));

describe("Einzelseiten", () => {
  it("es gibt mindestens eine", () => {
    expect(SEITEN.length).toBeGreaterThan(0);
  });

  for (const { datei, text } of SEITEN) {
    const b = beitragLesen(datei, text);
    const html = einzelseite(b);

    it(`${datei} wird zu einer vollständigen Seite`, () => {
      expect(html).toContain('<html lang="de">');
      expect(html).toContain("</html>");
      expect(html).toContain(`<h1>${b.titel}</h1>`);
      expect(html).toContain(
        `<link rel="canonical" href="${DOMAIN}/${b.slug}">`,
      );
      // Produktseite, kein Artikel.
      expect(html).toContain('<meta property="og:type" content="website">');
      expect(html).not.toContain('"@type":"Article"');
      expect(html).toContain('"@type":"BreadcrumbList"');
      // Der Title steht allein und bekommt kein "– Vorsorgewaage" angehängt.
      expect(html).toContain(`<title>${b.kurztitel ?? b.titel}</title>`);
    });

    it(`${datei} liefert seinen Text ohne JavaScript`, () => {
      // Der Grund für die ganze Umstellung. Als React-Seite standen im
      // ausgelieferten HTML null Wörter.
      const koerper = /<body[\s\S]*?>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
      const woerter = koerper
        .replace(/<script[\s\S]*?<\/script>/g, " ")
        .replace(/<style[\s\S]*?<\/style>/g, " ")
        .replace(/<[^>]*>/g, " ")
        .split(/\s+/)
        .filter(Boolean).length;
      expect(woerter, `${datei} hat zu wenig Text im HTML`).toBeGreaterThan(500);
      expect(html).not.toContain('<div id="root">');
    });

    it(`${datei} ist nach § 5 DDG vom Impressum aus erreichbar`, () => {
      expect(html).toContain(`href="${DOMAIN}/impressum"`);
    });

    it(`${datei} steht in der Sitemap`, () => {
      expect(SITEMAP).toContain(`<loc>${DOMAIN}/${b.slug}</loc>`);
    });

    it(`${datei} passt in die Trefferliste`, () => {
      const titel = b.kurztitel ?? b.titel;
      expect(titel.length, `Title zu lang: "${titel}"`).toBeLessThanOrEqual(60);
      expect(b.beschreibung.length, `Description zu lang in ${datei}`).toBeLessThanOrEqual(155);
      expect(b.beschreibung.length, `Description zu kurz in ${datei}`).toBeGreaterThan(80);
    });
  }

  it("die genannten Preise stimmen mit preise.ts überein", () => {
    // Der Text nennt die Beträge wörtlich, weil er Markdown ist und nichts
    // einsetzen kann. Dann muss ein Test sie zusammenhalten.
    const seite = SEITEN.find((s) => s.datei === "was-ist-vorsorgewaage.md");
    expect(seite, "was-ist-vorsorgewaage.md fehlt").toBeDefined();
    const text = seite!.text;

    expect(text, `Monatspreis ${eur(PREIS_MONAT)} fehlt`).toContain(eur(PREIS_MONAT));
    expect(text, `Jahrespreis ${eur(PREIS_JAHR)} fehlt`).toContain(eur(PREIS_JAHR));
    expect(FREI_BERECHNUNGEN_PRO_MONAT).toBe(3);
    expect(text, "die Zahl der freien Berechnungen fehlt").toContain("drei\nBerechnungen");
    // Endpreise, Kleinunternehmer - keine Umsatzsteuer ausweisen.
    expect(text).toContain("§ 19 UStG");
    expect(text).not.toMatch(/zzgl|netto|MwSt|USt\./);
  });

  it("nennt die Grenzen des Werkzeugs, nicht nur die Fähigkeiten", () => {
    // Drei der ersten sieben Suchanfragen zielten auf Dinge, die die Software
    // nicht kann. Wer danach sucht, soll das hier lesen und nicht erst nach
    // der Anmeldung merken.
    const text = SEITEN.find((s) => s.datei === "was-ist-vorsorgewaage.md")!.text;
    for (const grenze of [
      "Keine Anlageberatung",
      "Pensionsrückstellungen",
      "Pensionskassen",
      "Fondsanalyse-Werkzeug",
      "Nicht für Endkunden",
    ]) {
      expect(text, `Die Grenze "${grenze}" fehlt`).toContain(grenze);
    }
  });
});
