// src/utils/vorabInhalt.test.ts
// Hält fest, was gemessen war und was gelten soll.
//
// Der Anlass: Gemessen am gebauten `dist/` lieferten neun der achtzehn
// Sitemap-Adressen einen leeren Rumpf – `/` und `/beispiel` null Wörter. Die
// Abrufer der KI-Assistenten führen kein JavaScript aus und bekamen damit
// eine Seite ohne Inhalt, obwohl `robots.txt` sie hereinlässt.
//
// Diese Tests sichern die drei Zusagen ab, die leicht still kaputtgehen:
// je Adresse ein eigener Vorabtext, keine zweite Fassung von Texten, die
// schon woanders stehen, und kein Stapeln beim Kopieren der Startseite.

import { describe, expect, it } from "vitest";
import { vorabHtml, vorabSetzen } from "./vorabInhalt";
import { FAQ } from "./faq";
import { RECHNER } from "./rechner";
import { PREIS_JAHR, PREIS_MONAT, eur } from "./preise";
import { SEITENKOEPFE, kopfSetzen } from "./seitenkoepfe";

/** Die gebaute Startseite, so weit sie hier gebraucht wird. */
const STARTSEITE = `<!doctype html>
<html lang="de">
  <head>
    <title>Vorsorgewaage – Beratungssoftware für Altersvorsorge</title>
    <meta name="description" content="Beratungssoftware für Altersvorsorge: Sechs Rechner für Berater." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://www.vorsorgewaage.de/" />
    <meta property="og:url" content="https://www.vorsorgewaage.de/" />
    <meta property="og:title" content="Vorsorgewaage" />
    <meta property="og:description" content="x" />
    <meta name="twitter:title" content="Vorsorgewaage" />
    <meta name="twitter:description" content="x" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`;

/** Grobe Textgewinnung – wie ein Abrufer, der kein JavaScript ausführt. */
function text(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("Vorabtext ohne JavaScript", () => {
  it("die Startseite nennt alle sechs Rechner", () => {
    const t = text(vorabHtml("/", "Vorsorgewaage – Beratungssoftware", "Kurz."));
    for (const r of RECHNER) {
      expect(t, `Rechner fehlt: ${r.name}`).toContain(r.name);
    }
    expect(RECHNER).toHaveLength(6);
  });

  it("die Startseite gibt die häufigen Fragen wortgleich wieder", () => {
    const t = text(vorabHtml("/", "Vorsorgewaage", "Kurz."));
    for (const f of FAQ) {
      expect(t, `Frage fehlt: ${f.q}`).toContain(f.q);
      // Wortgleich, nicht nachempfunden: Ein Abrufer, dem etwas anderes
      // vorgelesen wird als einem Besucher, ist schlimmer als keiner.
      expect(t).toContain(f.a.slice(0, 60));
    }
  });

  it("die Preise kommen aus preise.ts, nicht aus einer zweiten Fassung", () => {
    const t = text(vorabHtml("/pricing", "Preise – Vorsorgewaage", "Kurz."));
    expect(t).toContain(eur(PREIS_MONAT));
    expect(t).toContain(eur(PREIS_JAHR));
  });

  it("die Überschrift trägt den Markenzusatz nicht", () => {
    const t = vorabHtml("/impressum", "Impressum – Vorsorgewaage", "Kurz.");
    expect(t).toContain("<h1>Impressum</h1>");
    expect(t).not.toContain("<h1>Impressum – Vorsorgewaage</h1>");
  });

  it("verweist nicht auf die Adresse, auf der man schon ist", () => {
    const t = vorabHtml(
      "/was-die-rechner-koennen",
      "Was die Rechner können",
      "Kurz.",
    );
    expect(t).not.toContain('href="/was-die-rechner-koennen"');
    expect(t).toContain('href="/was-ist-vorsorgewaage"');
  });

  it("Rechtstexte bekommen keine zweite, kürzere Fassung", () => {
    // Eine Zusammenfassung neben dem verbindlichen Text wäre eine zweite
    // Aussage über denselben Gegenstand. Nur Beschreibung und Wege.
    const t = text(vorabHtml("/agb", "Allgemeine Geschäftsbedingungen – Vorsorgewaage", "Nutzungsbedingungen."));
    expect(t).not.toContain("Häufige Fragen");
    expect(t).not.toContain("Die sechs Rechner");
    expect(t).toContain("Nutzungsbedingungen.");
  });

  it("ersetzt den Block beim Kopieren statt ihn zu stapeln", () => {
    const einmal = vorabSetzen(STARTSEITE, vorabHtml("/", "A", "a"));
    const zweimal = vorabSetzen(einmal, vorabHtml("/pricing", "B", "b"));
    expect(zweimal.match(/<noscript>/g)).toHaveLength(1);
    expect(zweimal).toContain("<h1>B</h1>");
    expect(zweimal).not.toContain("<h1>A</h1>");
  });

  it("jede öffentliche Adresse liefert ohne JavaScript echten Text", () => {
    // Das ist der gemessene Befund von damals, als Zusage formuliert: null
    // Wörter waren es vorher. Die Schwelle liegt bewusst niedrig – sie soll
    // „leer" ausschließen, nicht eine Mindestlänge vorschreiben.
    const start = vorabSetzen(STARTSEITE, vorabHtml("/", "Vorsorgewaage", "Kurz."));
    for (const kopf of SEITENKOEPFE) {
      const html = kopfSetzen(start, kopf);
      const rumpf = text(html.slice(html.indexOf("<body")));
      expect(html.match(/<noscript>/g), `kein Vorabtext: ${kopf.pfad}`).toHaveLength(1);
      expect(rumpf.split(" ").length, `zu wenig Text: ${kopf.pfad}`).toBeGreaterThan(30);
    }
  });
});
