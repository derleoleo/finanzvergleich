// Die Beitragsbilder gegen die Beiträge und gegen die Engine.
//
// Ein Bild ist eine Behauptung wie jede andere. Google verlangt für
// `Article.image` ausdrücklich ein Bild, das den Beitrag zeigt — dann muss es
// auch stimmen, und zwar weiter stimmen, wenn sich eine Zahl ändert.
//
// Drei Schlösser:
//
// 1. Jede Zahl, die ein Bild nennt, muss wörtlich im Beitrag stehen. Ein Bild
//    kann hier also nicht behaupten, was der Text nicht sagt.
// 2. Die Schwellen hängen zusätzlich an der Engine, nicht nur am Text.
// 3. Die Prüfsumme des SVG steht im manifest.json neben den PNG. Wer eine Zahl
//    im Modul ändert und `npm run bilder:ratgeber` vergisst, fällt hier auf —
//    sonst zeigte das ausgelieferte Bild stillschweigend den alten Stand.

import { describe, expect, it } from "vitest";
import {
  BILDWERKE,
  SEITENVERHAELTNISSE,
  bildAdressen,
  bildwerkFuer,
  eur,
  zeichne,
} from "./beitragsbilder";
import { DOMAIN, beitragLesen, beitragSeite } from "./ratgeber";
import { GESETZ } from "../lib/finance/avd/config";
import { berechneZulagen } from "../lib/finance/avd/zulagen";
import MANIFEST from "../../public/bilder/ratgeber/manifest.json";

const ROH = import.meta.glob("../../ratgeber/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BEITRAEGE = Object.entries(ROH).map(([pfad, text]) => ({
  slug: (pfad.split("/").pop() as string).replace(/\.md$/, ""),
  text,
}));

/** Die tatsächlich erzeugten Dateien — ohne Dateisystemzugriff. */
const DATEIEN = new Set(
  Object.keys(
    import.meta.glob("../../public/bilder/ratgeber/*.png", { eager: true, query: "?url" }),
  ).map((p) => p.split("/").pop() as string),
);

async function pruefsumme(svg: string): Promise<string> {
  const roh = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(svg));
  return [...new Uint8Array(roh)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

describe("Beitragsbilder", () => {
  it("jeder Beitrag hat genau ein Bildwerk, und keines steht ohne Beitrag da", () => {
    // Beide Richtungen: Ein neuer Beitrag ohne Bild fällt auf, ein Bildwerk
    // für einen gelöschten Beitrag ebenso.
    const ausBeitraegen = BEITRAEGE.map((b) => b.slug).sort();
    const ausWerken = BILDWERKE.map((w) => w.slug).sort();
    expect(ausWerken).toEqual(ausBeitraegen);
    expect(BILDWERKE.length).toBeGreaterThanOrEqual(7);
  });

  it("nennt die drei von Google empfohlenen Seitenverhältnisse", () => {
    // „we recommend providing multiple high-resolution images … with the
    // following aspect ratios: 16x9, 4x3, and 1x1".
    expect(SEITENVERHAELTNISSE.map((m) => m.kennung)).toEqual(["16x9", "4x3", "1x1"]);
    for (const m of SEITENVERHAELTNISSE) {
      // „minimum of 50K pixels when multiplying width and height".
      expect(m.breite * m.hoehe, m.kennung).toBeGreaterThan(50_000);
      const verhaeltnis = m.breite / m.hoehe;
      const soll = { "16x9": 16 / 9, "4x3": 4 / 3, "1x1": 1 }[m.kennung];
      expect(verhaeltnis, m.kennung).toBeCloseTo(soll, 2);
    }
  });

  for (const werk of BILDWERKE) {
    const beitrag = BEITRAEGE.find((b) => b.slug === werk.slug);

    it(`${werk.slug}: jede Zahl im Bild steht auch im Beitrag`, () => {
      expect(beitrag, `kein Beitrag zu ${werk.slug}`).toBeDefined();
      const { aussagen } = zeichne(werk, SEITENVERHAELTNISSE[0]);
      for (const aussage of aussagen) {
        expect(
          beitrag!.text,
          `Das Bild nennt "${aussage}", der Beitrag nicht`,
        ).toContain(aussage);
      }
    });

    it(`${werk.slug}: liegt in allen drei Maßen als Datei vor`, () => {
      for (const mass of SEITENVERHAELTNISSE) {
        const datei = `${werk.slug}-${mass.kennung}.png`;
        expect(DATEIEN, `${datei} fehlt - npm run bilder:ratgeber`).toContain(datei);
      }
    });

    it(`${werk.slug}: die ausgelieferten Bilder sind nicht veraltet`, async () => {
      for (const mass of SEITENVERHAELTNISSE) {
        const datei = `${werk.slug}-${mass.kennung}.png`;
        const eintrag = (MANIFEST.bilder as Record<string, { pruefsumme: string }>)[datei];
        expect(eintrag, `${datei} fehlt im manifest.json`).toBeDefined();
        const jetzt = await pruefsumme(zeichne(werk, mass).svg);
        expect(
          eintrag.pruefsumme,
          `${datei} wurde nicht neu erzeugt - npm run bilder:ratgeber`,
        ).toBe(jetzt);
      }
    });

    it(`${werk.slug}: hat einen Alternativtext, der das Bild beschreibt`, () => {
      // Er landet als og:image:alt im Kopf und wird vorgelesen.
      expect(werk.alt.length, werk.slug).toBeGreaterThan(60);
      expect(werk.alt).not.toContain("Vorsorgewaage –");
    });
  }

  it("die Schwellen im Bild hängen an der Engine, nicht nur am Text", () => {
    const grenz = bildwerkFuer("grenzfoerderquote-altersvorsorgedepot");
    expect(grenz?.form.art).toBe("stufen");
    if (grenz?.form.art === "stufen") {
      expect(grenz.form.kanten).toEqual([
        GESETZ.GZ_STUFE1_GRENZE,
        GESETZ.GZ_STUFE2_GRENZE,
      ]);
      expect(grenz.form.stufen[0].wert).toBe(GESETZ.GZ_STUFE1_SATZ * 100);
      expect(grenz.form.stufen[1].wert).toBe(GESETZ.GZ_STUFE2_SATZ * 100);
      expect(grenz.form.stufen[2].wert).toBe(0);
      // Die Beschriftung steht frei daneben, damit sie die Worte des Beitrags
      // tragen kann - dann muss sie zum Wert passen. „50 Cent" je Euro sind
      // 50 von 100.
      for (const s of grenz.form.stufen) {
        const ausBeschriftung = /^(\d+) Cent$/.exec(s.beschriftung)?.[1];
        expect(
          ausBeschriftung ? Number(ausBeschriftung) : 0,
          `Beschriftung "${s.beschriftung}" passt nicht zum Wert ${s.wert}`,
        ).toBe(s.wert);
      }
    }

    const mittelbar = bildwerkFuer("mittelbare-berechtigung-ehegatte");
    expect(mittelbar?.form.art).toBe("balken");
    if (mittelbar?.form.art === "balken") {
      const [unter, drueber] = mittelbar.form.balken;
      // Die Kernaussage des Bildes, gegen die Engine gerechnet.
      const zulage = (eigenbeitrag: number) =>
        berechneZulagen({
          eigenbeitrag,
          berechtigung: "mittelbar",
          eigenbeitragEhegatteUnmittelbar: 1800,
        }).grundzulage;
      expect(unter.text).toContain(eur(GESETZ.MITTELBAR_MINDESTBEITRAG - 1));
      expect(unter.wert).toBe(zulage(GESETZ.MITTELBAR_MINDESTBEITRAG - 1));
      expect(drueber.text).toContain(eur(GESETZ.MITTELBAR_MINDESTBEITRAG));
      expect(drueber.wert).toBe(zulage(GESETZ.MITTELBAR_MINDESTBEITRAG));
      expect(drueber.wert).toBe(GESETZ.GZ_MAX_MITTELBAR);
    }
  });

  it("der Modellstempel im Bild zeigt die Fassung, die gilt", async () => {
    const vvg = bildwerkFuer("begruendungspflicht-paragraf-61-vvg");
    expect(vvg?.form.art).toBe("stempel");
    if (vvg?.form.art === "stempel") {
      const { MODELL_VERSION } = await import("../lib/finance/modell");
      const { RECHTS_FLAGS_DEFAULT } = await import("../lib/finance/avd/config");
      expect(vvg.form.felder.map((f) => f.wert)).toContain(MODELL_VERSION);
      // Der Beitrag spricht von sechs offenen Rechtsfragen - so viele Schalter
      // kennt die Engine, und so viele zeigt das Bild.
      expect(Object.keys(RECHTS_FLAGS_DEFAULT)).toHaveLength(6);
      expect(vvg.form.schalter).toHaveLength(6);
      expect(vvg.form.hinweis).toBe("sechs offenen Rechtsfragen");
    }
  });

  it("die Beitragsseite trägt die Bilder im Markup", () => {
    const slug = "vorabpauschale-was-sie-wirklich-kostet";
    const beitrag = BEITRAEGE.find((b) => b.slug === slug)!;
    const html = beitragSeite(beitragLesen(`${slug}.md`, beitrag.text));
    const werk = bildwerkFuer(slug)!;
    const adressen = bildAdressen(slug, DOMAIN);

    // Article.image als Feld mit allen drei Massen.
    const block = /<script type="application\/ld\+json">(\{"@context".*?"Article".*?\})<\/script>/.exec(
      html,
    );
    expect(block, "kein Article-Block gefunden").not.toBeNull();
    const artikel = JSON.parse(block![1]) as { image?: string[] };
    expect(artikel.image).toEqual(adressen);

    // og:image ist das Bild des Beitrags, nicht mehr das Markenbild.
    expect(html).toContain(`<meta property="og:image" content="${adressen[0]}">`);
    expect(html).toContain(`<meta name="twitter:image" content="${adressen[0]}">`);
    expect(html).not.toContain("og-image.png");
    expect(html).toContain(`content="${werk.alt}"`);
    expect(html).toContain('<meta property="og:image:height" content="675">');
  });

  it("die Übersicht behält das Markenbild", async () => {
    // Sie zeigt keinen einzelnen Beitrag - ein Beitragsbild waere dort falsch.
    const { uebersichtSeite } = await import("./ratgeber");
    const seiten = BEITRAEGE.map((b) => beitragLesen(`${b.slug}.md`, b.text));
    expect(uebersichtSeite(seiten)).toContain("og-image.png");
  });
});
