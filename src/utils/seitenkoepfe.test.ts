// Jede Adresse der Sitemap muss einen Kopf haben, der auf sie selbst zeigt.
//
// Der Anlass: /beispiel, /pricing und die fünf Rechtsseiten standen in der
// Sitemap, trugen aber alle das Canonical der Startseite — für einen Crawler
// sind das Dubletten. Die Sitemap war eingereicht, neun von dreizehn Adressen
// waren damit praktisch nicht indexierbar.
//
// Dieser Test schließt beide Richtungen: eine Sitemap-Adresse ohne Kopf fällt
// auf, und ein Kopf ohne Sitemap-Adresse ebenso.

import { describe, expect, it } from "vitest";
import { DOMAIN, RATGEBER_PFAD } from "./ratgeber";
import { SEITENKOEPFE, dateinamen, kopfSetzen } from "./seitenkoepfe";
import SITEMAP from "../../public/sitemap.xml?raw";

const ROH = import.meta.glob("../../ratgeber/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** Alle Adressen der Sitemap, in ihrer Reihenfolge. */
const ADRESSEN = [...SITEMAP.matchAll(/<loc>([^<]+)<\/loc>/g)].map((t) => t[1]);

/** Adressen, die der Ratgeber selbst erzeugt — mit eigenem Kopf. */
const RATGEBER_ADRESSEN = [
  `${DOMAIN}${RATGEBER_PFAD}/`,
  ...Object.keys(ROH).map(
    (p) => `${DOMAIN}${RATGEBER_PFAD}/${(p.split("/").pop() as string).replace(/\.md$/, "")}/`,
  ),
];

describe("Köpfe der öffentlichen Seiten", () => {
  it("die Sitemap ist nicht leer", () => {
    expect(ADRESSEN.length).toBeGreaterThan(10);
  });

  it("jede Adresse der Sitemap hat genau eine Quelle für ihren Kopf", () => {
    const ausKoepfen = SEITENKOEPFE.map((k) => `${DOMAIN}${k.pfad}`);
    for (const adresse of ADRESSEN) {
      // Die Startseite traegt ihren Kopf in index.html und stimmt dort schon.
      if (adresse === `${DOMAIN}/`) continue;
      const quellen = [
        RATGEBER_ADRESSEN.includes(adresse) ? "ratgeber" : null,
        ausKoepfen.includes(adresse) ? "seitenkoepfe" : null,
      ].filter(Boolean);
      expect(quellen, `keine oder mehrfache Quelle für ${adresse}`).toHaveLength(1);
    }
  });

  it("kein Kopf ohne Eintrag in der Sitemap", () => {
    for (const k of SEITENKOEPFE) {
      expect(ADRESSEN, `${k.pfad} fehlt in der Sitemap`).toContain(`${DOMAIN}${k.pfad}`);
    }
  });

  it("Titel und Beschreibung sind eigen und brauchbar lang", () => {
    const titel = new Set<string>();
    for (const k of SEITENKOEPFE) {
      expect(k.titel.length, k.pfad).toBeGreaterThan(15);
      expect(k.titel.length, `${k.pfad}: Titel zu lang für die Trefferliste`).toBeLessThan(75);
      expect(k.beschreibung.length, k.pfad).toBeGreaterThan(60);
      titel.add(k.titel);
    }
    // Identische Titel waren genau das Problem.
    expect(titel.size).toBe(SEITENKOEPFE.length);
  });

  it("schreibt Kopfzeilen in die gebaute Seite", () => {
    const vorlage = `<!doctype html><html lang="de"><head>
<link rel="preload" href="/fonts/inter-latin.woff2" as="font" />
<title>Vorsorgewaage – Professionelle Analysen für Finanzberater</title>
<meta name="description" content="Alte Beschreibung." />
<link rel="canonical" href="https://www.vorsorgewaage.de/" />
<meta property="og:url" content="https://www.vorsorgewaage.de/" />
<meta property="og:title" content="Vorsorgewaage" />
<meta property="og:description" content="Alte Beschreibung." />
<script type="application/ld+json">{"@type":"FAQPage"}</script>
</head><body><div id="root"></div><script src="/assets/index-abc.js"></script></body></html>`;

    const kopf = SEITENKOEPFE.find((k) => k.pfad === "/beispiel");
    expect(kopf).toBeDefined();
    const neu = kopfSetzen(vorlage, kopf!);

    expect(neu).toContain(`<title>${kopf!.titel}</title>`);
    expect(neu).toContain('<link rel="canonical" href="https://www.vorsorgewaage.de/beispiel" />');
    expect(neu).toContain('<meta property="og:url" content="https://www.vorsorgewaage.de/beispiel" />');
    expect(neu).toContain(`content="${kopf!.beschreibung}"`);
    expect(neu).not.toContain("Alte Beschreibung");
    expect(neu).not.toContain("Professionelle Analysen für Finanzberater");

    // Strukturierte Daten gehoeren der Startseite, nicht acht Kopien.
    expect(neu).not.toContain("ld+json");

    // Und der Rumpf bleibt unberuehrt - sonst startet die Anwendung nicht.
    expect(neu).toContain('<div id="root"></div>');
    expect(neu).toContain("/assets/index-abc.js");
    expect(neu).toContain("inter-latin.woff2");
  });

  it("legt die Kopien dorthin, wo jeder Server sie findet", () => {
    // Vercel nimmt die Verzeichnisdatei, der Vorschauserver die mit Endung.
    expect(dateinamen("/beispiel")).toEqual(["beispiel/index.html", "beispiel.html"]);
    expect(dateinamen("/legal/avv")).toEqual(["legal/avv/index.html", "legal/avv.html"]);
  });
});
