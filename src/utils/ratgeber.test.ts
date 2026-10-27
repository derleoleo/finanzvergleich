import { describe, expect, it } from "vitest";
import {
  beitragLesen,
  beitragSeite,
  escape,
  uebersichtSeite,
  type Beitrag,
} from "./ratgeber";
import { ERLAUBTE_PARAMETER } from "./messparameter";

// Rohimport statt Dateisystem: Vite loest das beim Transformieren auf, also
// laeuft es ohne Node-Typen und ohne Pfadrechnerei.
const ROH = import.meta.glob("../../ratgeber/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
import SITEMAP from "../../public/sitemap.xml?raw";

const BEITRAEGE = Object.entries(ROH).map(([pfad, text]) => ({
  datei: pfad.split("/").pop() as string,
  text,
}));

const KOPF = `---
titel: Ein Titel
beschreibung: Ein Satz dazu.
datum: 2026-10-27
---
`;

describe("Beitraege lesen", () => {
  it("liest Kopf und Koerper", () => {
    const b = beitragLesen("mein-beitrag.md", `${KOPF}\n## Zwischentitel\n\nText.\n`);
    expect(b.slug).toBe("mein-beitrag");
    expect(b.titel).toBe("Ein Titel");
    expect(b.datum).toBe("2026-10-27");
    expect(b.html).toContain("<h2>Zwischentitel</h2>");
    expect(b.html).toContain("<p>Text.</p>");
  });

  it("bricht ab, wenn die Beschreibung fehlt", () => {
    // Eine Seite, die Google ohne Description sieht, ist schlimmer als eine,
    // die es noch nicht gibt. Der Bau soll laut scheitern.
    const ohne = "---\ntitel: T\ndatum: 2026-10-27\n---\nText";
    expect(() => beitragLesen("x.md", ohne)).toThrow(/beschreibung/);
  });

  it("bricht bei fehlendem oder schiefem Datum ab", () => {
    expect(() => beitragLesen("x.md", "---\ntitel: T\nbeschreibung: B\n---\nText")).toThrow(/datum/);
    expect(() =>
      beitragLesen("x.md", "---\ntitel: T\nbeschreibung: B\ndatum: 27.10.2026\n---\nText"),
    ).toThrow(/JJJJ-MM-TT/);
  });

  it("bricht ohne Kopf ab", () => {
    expect(() => beitragLesen("x.md", "# Nur Text")).toThrow(/Kopf/);
  });
});

describe("Zeichen maskieren", () => {
  it("entschaerft Anfuehrungszeichen und Klammern", () => {
    expect(escape('Ein "Titel" & <mehr>')).toBe("Ein &quot;Titel&quot; &amp; &lt;mehr&gt;");
  });

  it("maskiert den Titel im Kopf der Seite", () => {
    const b = beitragLesen("x.md", KOPF.replace("Ein Titel", 'Mit "Zitat"'));
    expect(beitragSeite(b)).toContain("<title>Mit &quot;Zitat&quot; – Vorsorgewaage</title>");
  });
});

describe("Die erzeugte Seite", () => {
  const b: Beitrag = beitragLesen("mein-beitrag.md", `${KOPF}\nText.\n`);

  it("bringt eigene Metadaten mit - der Grund fuer dieses ganze Modul", () => {
    const html = beitragSeite(b);
    expect(html).toContain('<html lang="de">');
    expect(html).toContain("<title>Ein Titel – Vorsorgewaage</title>");
    expect(html).toContain('<meta name="description" content="Ein Satz dazu.">');
    expect(html).toContain(
      '<link rel="canonical" href="https://www.vorsorgewaage.de/ratgeber/mein-beitrag/">',
    );
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"datePublished":"2026-10-27"');
  });

  it("ist nach § 5 DDG vom Impressum aus erreichbar - und umgekehrt", () => {
    expect(beitragSeite(b)).toContain('href="https://www.vorsorgewaage.de/impressum"');
    expect(uebersichtSeite([b])).toContain('href="https://www.vorsorgewaage.de/impressum"');
  });

  it("enthaelt ohne Zaehlstelle kein einziges Skript", () => {
    expect(beitragSeite(b)).not.toContain("<script defer");
    expect(beitragSeite(b)).not.toContain("vorsorgewaageVorSenden");
  });

  it("nimmt mit Zaehlstelle alle erlaubten Parameter mit", () => {
    // Die Positivliste liegt in messparameter.ts, damit Anwendung und
    // statische Seiten dieselbe haben. Dieser Test ist die Klammer: Ein neuer
    // Parameter dort darf hier nicht stillschweigend fehlen.
    const html = beitragSeite(b, { basis: "https://cloud.umami.is/", seite: "abc" });
    expect(html).toContain('src="https://cloud.umami.is/script.js"');
    expect(html).toContain('data-before-send="vorsorgewaageVorSenden"');
    expect(html).toContain('data-domains="www.vorsorgewaage.de"');
    expect(html).toContain('data-do-not-track="true"');
    for (const p of ERLAUBTE_PARAMETER) expect(html).toContain(`"${p}"`);
  });

  it("sortiert die Uebersicht neueste zuerst", () => {
    const alt = beitragLesen("alt.md", KOPF.replace("2026-10-27", "2026-01-01"));
    const html = uebersichtSeite([alt, b]);
    expect(html.indexOf("mein-beitrag")).toBeLessThan(html.indexOf("alt"));
  });
});

describe("Die wirklichen Beitraege", () => {
  it("es gibt mindestens einen", () => {
    expect(BEITRAEGE.length).toBeGreaterThan(0);
  });

  for (const { datei, text } of BEITRAEGE) {
    it(`${datei} laesst sich lesen und hat einen Rechtsstand`, () => {
      const b = beitragLesen(datei, text);
      expect(b.titel.length).toBeGreaterThan(10);
      expect(b.beschreibung.length).toBeGreaterThan(40);
      // Ohne Rechtsstand ist ein Steuerbeitrag fuer die Begruendungspflicht
      // nach § 61 VVG wertlos.
      expect(b.stand).toBeTruthy();
      expect(beitragSeite(b)).toContain("</html>");
    });
  }

  it("steht vollstaendig in der Sitemap", () => {
    // Verhindert das Auseinanderlaufen ohne zweiten Sitemap-Erzeuger.
    expect(SITEMAP).toContain("/ratgeber/");
    for (const { datei } of BEITRAEGE) {
      expect(SITEMAP).toContain(`/ratgeber/${datei.replace(/\.md$/, "")}/`);
    }
  });
});

describe("Tabellen auf schmalen Bildschirmen", () => {
  it("bekommen einen scrollbaren Rahmen", () => {
    // Ohne ihn schiebt eine vierspaltige Zahlentabelle die ganze Seite nach
    // rechts, und die aussagekraeftigste Spalte steht ganz aussen.
    const b = beitragLesen("x.md", `${KOPF}\n| A | B |\n|---|---|\n| 1 | 2 |\n`);
    expect(b.html).toContain('<div class="tabelle"><table>');
    expect(b.html).toContain("</table></div>");
  });
});
