// src/utils/ratgeber-fundstellen.test.ts
// Die Linkpflicht – und die eine Zusage, auf die es wirklich ankommt.
//
// Befund vor dieser Änderung: 79 Rechtsfundstellen in sieben Beiträgen,
// **kein einziger externer Link**. Teils standen die Zitate in einer
// Tabellenspalte, die wörtlich „Norm" heißt.
//
// Die Links sind einmalig mit `scripts/fundstellen-verlinken.mjs` erzeugt und
// von Hand durchgesehen worden. Danach ist das Markdown die Quelle – und
// dieser Test das, was die Zusage hält. Ohne ihn verlässt sich die Sache auf
// Disziplin, und der nächste Beitrag hätte wieder keine Links.
//
// **Die wichtigste Zusage steht in Test 3:** Keine Fundstelle mit „n.F." darf
// auf gesetze-im-internet.de zeigen. Dort steht die heute geltende Fassung,
// das Zitat meint die ab 2027 geltende – ein Link dorthin zeigte dem Leser
// einen anderen Text als den zitierten, ohne jeden Hinweis darauf.

import { describe, expect, it } from "vitest";
import {
  NEUFASSUNG,
  OHNE_LINK,
  fundstelleUrl,
  fundstellenImText,
  koerperVon,
} from "./fundstellen";
import { beitragLesen, beitragSeite } from "./ratgeber";

const ROH = import.meta.glob("../../ratgeber/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BEITRAEGE = Object.entries(ROH).map(([pfad, text]) => ({
  datei: pfad.split("/").pop() as string,
  text,
  koerper: koerperVon(text),
}));

/** Alle Beitraege als Objekte – `beitragSeite` braucht sie fuer „Weiterlesen". */
const ALLE = BEITRAEGE.map((b) => beitragLesen(b.datei, b.text));

describe("Fundstellen im Ratgeber", () => {
  it("es gibt Beiträge und sie nennen Fundstellen", () => {
    // Ohne diese Vorprüfung wären alle folgenden still leer und grün.
    expect(BEITRAEGE.length).toBeGreaterThan(5);
    const alle = BEITRAEGE.flatMap((b) => fundstellenImText(b.koerper));
    expect(alle.length).toBeGreaterThan(60);
    expect(alle.filter((v) => v.verlinkt).length).toBeGreaterThan(50);
  });

  for (const b of BEITRAEGE) {
    it(`${b.datei}: jede auflösbare Fundstelle ist verlinkt`, () => {
      const offen = fundstellenImText(b.koerper).filter(
        (v) => !v.verlinkt && !v.geteilt && fundstelleUrl(v.zitat),
      );
      expect(
        offen.map((v) => `Z.${v.zeile}: ${v.zitat}`),
        "Diese Fundstellen hätten eine Adresse, sind aber nicht verlinkt",
      ).toEqual([]);
    });
  }

  it("keine Fundstelle mit n.F. zeigt auf gesetze-im-internet.de", () => {
    // Die zentrale Zusage. Dort steht die heute geltende Fassung.
    for (const b of BEITRAEGE) {
      for (const t of b.koerper.matchAll(/\[([^\]]*n\.F\.)\]\(([^)\s]+)/g)) {
        expect(t[2], `${b.datei}: „${t[1]}" zeigt auf die falsche Fassung`).toBe(
          NEUFASSUNG.adresse,
        );
      }
    }
  });

  it("keine Fundstelle ohne Fassungsangabe zeigt auf das Gesetzblatt", () => {
    // Die Gegenrichtung: Das Gesetzblatt ist nur für „n.F." richtig.
    for (const b of BEITRAEGE) {
      for (const t of b.koerper.matchAll(/\[([^\]]*)\]\((https:\/\/www\.recht\.bund\.de[^)\s]*)/g)) {
        expect(t[1], `${b.datei}: „${t[1]}" sollte auf das geltende Recht zeigen`).toContain("n.F.");
      }
    }
  });

  it("ein über den Zeilenumbruch geteiltes Zitat wird nicht verlinkt", () => {
    /*
     * Der gefährlichste Fall, und der Grund für `Vorkommen.geteilt`:
     * `(§ 86 Abs. 1 EStG` am Zeilenende mit `a.F.)` darunter sieht für sich
     * aus wie eine gewöhnliche Fundstelle. Ein Link darauf zeigte auf die
     * heute geltende Fassung, und die Prüfung oben schlüge nicht an, weil im
     * Linktext kein „n.F." steht.
     */
    for (const b of BEITRAEGE) {
      const falsch = fundstellenImText(b.koerper).filter((v) => v.geteilt && v.verlinkt);
      expect(
        falsch.map((v) => `Z.${v.zeile}: ${v.zitat}`),
        `${b.datei}: geteiltes Zitat verlinkt – die Fassungsangabe steht auf der nächsten Zeile`,
      ).toEqual([]);
    }
  });

  it("jede externe Adresse stammt aus fundstellen.ts", () => {
    // Damit ein Tippfehler in einer URL nicht überlebt.
    for (const b of BEITRAEGE) {
      for (const t of b.koerper.matchAll(/\[([^\]]+)\]\((https:\/\/[^)\s]+)/g)) {
        expect(t[2], `${b.datei}: Adresse passt nicht zum Zitat „${t[1]}"`).toBe(
          fundstelleUrl(t[1]),
        );
      }
    }
  });

  it("kein Link liegt in einem Link", () => {
    // `[Die Begründung nach § 61 VVG](/ratgeber/…)` enthält ein Zitat im
    // Linktext. Ein Link darin ergäbe ungültiges HTML, und der innere
    // Verweis bräche.
    for (const b of BEITRAEGE) {
      const html = beitragSeite(beitragLesen(b.datei, b.text), undefined, ALLE).toString();
      const artikel = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
      // `<a[\s>]` statt `<a`: Sonst trifft das Muster `<article>`.
      expect(
        artikel.match(/<a[\s>][^>]*>(?:(?!<\/a>)[\s\S])*?<a[\s>]/),
        `${b.datei}: <a> in <a>`,
      ).toBeNull();
    }
  });

  it("was ohne Link bleibt, hat einen Grund", () => {
    // Keine Bequemlichkeitsliste: Jeder Eintrag ist eine Entscheidung.
    expect(OHNE_LINK.length).toBeGreaterThan(2);
    for (const e of OHNE_LINK) expect(e.grund.length).toBeGreaterThan(60);
    expect(OHNE_LINK.map((e) => e.was)).toContain("a.F.");
  });
});

describe("Gesetzeszitat und eigene These", () => {
  /*
   * Vorher trugen beide dasselbe blockquote. Gezaehlt waren das zehn
   * Thesenkaesten und zwei Gesetzeszitate — optisch nicht zu unterscheiden.
   * Fuer einen Beitrag, dessen Thema die Begruendungspflicht ist, ist das der
   * falsche Fehler.
   */
  const GEBAUT = BEITRAEGE.map((b) => ({
    datei: b.datei,
    html: beitragSeite(beitragLesen(b.datei, b.text), undefined, ALLE),
  }));

  it("es gibt ueberhaupt eingefasste Gesetzeszitate", () => {
    const anzahl = GEBAUT.reduce(
      (n, g) => n + (g.html.match(/<div class="gesetz">/g) ?? []).length,
      0,
    );
    expect(anzahl).toBeGreaterThan(1);
  });

  for (const g of GEBAUT) {
    it(`${g.datei}: jeder Mantel ist geschlossen und umfasst genau ein Zitat`, () => {
      /*
       * Was dieser Test haelt, und was nicht.
       *
       * Der Entwurf warnte, eine fehlende Leerzeile vor dem schliessenden div
       * ziehe dieses in den Absatz und der Mantel verschlucke den Rest des
       * Beitrags. Nachgemessen stimmt das nicht: marked v18 liefert mit und
       * ohne Leerzeile zeichengleiches HTML. Die Pruefungen unten bleiben
       * trotzdem — sie halten die Zusage von Teil 3 fest, dass jedes
       * Gesetzeszitat eingefasst ist und seine Fundstelle traegt. Die
       * Laengen- und Ueberschriftenpruefung ist eine Rueckversicherung gegen
       * einen Mantel, der aus anderem Grund offen bleibt.
       */
      const auf = (g.html.match(/<div class="gesetz">/g) ?? []).length;
      if (auf === 0) return;

      const maentel = [...g.html.matchAll(/<div class="gesetz">([\s\S]*?)<\/div>/g)];
      expect(maentel.length, "ein Mantel wird nicht geschlossen").toBe(auf);

      for (const m of maentel) {
        expect((m[1].match(/<blockquote>/g) ?? []).length, "genau ein Zitat je Mantel").toBe(1);
        // Die Fundstelle steht darunter und ist anklickbar.
        expect(m[1], "Mantel ohne Fundstellenzeile").toMatch(/<p><a href="https:\/\/[^"]+">/);
        // Der Schadensfall: Fehlt die Leerzeile vor dem schliessenden div,
        // zieht marked es in den Absatz, und der Mantel reicht bis zum
        // naechsten div irgendwo im Beitrag — mitsamt Ueberschriften.
        expect(m[1], "Mantel verschluckt den Rest des Beitrags").not.toMatch(/<h[12]/);
        expect(m[1].length, "Mantel unerwartet lang").toBeLessThan(1200);
      }
    });
  }
});
