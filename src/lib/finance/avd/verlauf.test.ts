// src/lib/finance/avd/verlauf.test.ts
//
// Die Bildunterschrift behauptet zwei Dinge über das Diagramm. Hier stehen sie
// als Test, nicht als Zusage:
//
//   1. Die Oberkante des gestapelten Kapitals ist das Gesamtkapital —
//      nominal wie real.
//   2. Der Abstand zwischen den beiden Beitragslinien ist die Förderung.
//
// Die zweite hat beim Schreiben schon einmal nicht gestimmt: `nettoAufwand`
// zieht nur die Steuererstattung ab, nicht die Zulage. Gegen den Bruttobeitrag
// gerechnet wäre der Abstand also bloß ein Teil der Förderung gewesen — und im
// Bild hätte nichts darauf hingewiesen.

import { describe, expect, it } from "vitest";
import { simuliereAvd, type AvdEingabe } from "./simulation";
import { baueAvdVerlauf } from "./verlauf";

function eingabe(over: Partial<AvdEingabe> = {}): AvdEingabe {
  return {
    geburtsjahr: 1990,
    beitragsjahrStart: 2027,
    auszahlungsbeginnAlter: 67,
    berechtigung: "unmittelbar",
    splitting: false,
    kinder: 2,
    ehegatteMittelbarBerechtigt: false,
    eigenbeitragMonatlich: 150,
    beitragsdynamikPaJahr: 0,
    zvEJahr: 48000,
    kirchensteuersatz: 0,
    soliBeruecksichtigen: false,
    steuersatzImAlter: 0.22,
    effektivkostenPaJahr: 0.005,
    fixkostenProJahr: 0,
    renditeBruttoPaJahr: 0.07,
    auszahlform: "auszahlplan",
    teilkapitalAnteil: 0,
    auszahlplanEndalter: 85,
    rentenfaktorProZehntausend: 30,
    kvStatusImAlter: "pflicht",
    depotKostenPaJahr: 0.003,
    vergleichsmodus: "gleicher_nettoaufwand",
    sparerpauschbetrag: 0,
    inflationPaJahr: 0.02,
    zulagenZuflussVerzoegerungJahre: 1,
    erstattungReinvestieren: false,
    ...over,
  };
}

describe("baueAvdVerlauf", () => {
  const ergebnis = simuliereAvd(eingabe());

  it("liefert einen Punkt je Jahr", () => {
    // Ohne diese Vorprüfung wären alle Schleifen unten still leer und grün.
    const punkte = baueAvdVerlauf(ergebnis, 0.02, false);
    expect(punkte).toHaveLength(ergebnis.jahre.length);
    expect(punkte.length).toBeGreaterThan(20);
    expect(punkte[0].jahr).toBe(ergebnis.jahre[0].jahr);
  });

  it("die Oberkante des Stapels ist das Gesamtkapital", () => {
    for (const p of baueAvdVerlauf(ergebnis, 0.02, false)) {
      // 1 € Spielraum: Jeder Anteil wird einzeln gerundet.
      expect(Math.abs(p.gefoerdert + p.ungefoerdert - p.avd)).toBeLessThanOrEqual(1);
    }
  });

  it("auch im Real-Modus, und zwar gegen die Realzahl der Engine", () => {
    /*
     * Der Grund für den Exponenten `i + 1`. Mit einem eigenen Deflator
     * stimmte die Summe der Anteile nicht mehr mit `kapitalGesamtReal`
     * überein, und die Grafik hätte eine andere Zahl gezeigt als die Kacheln.
     */
    const punkte = baueAvdVerlauf(ergebnis, 0.02, true);
    punkte.forEach((p, i) => {
      expect(Math.abs(p.gefoerdert + p.ungefoerdert - p.avd)).toBeLessThanOrEqual(1);
      expect(p.avd).toBe(Math.round(ergebnis.jahre[i].kapitalGesamtReal));
    });
  });

  it("der Abstand der beiden Beitragslinien ist die Förderung", () => {
    const punkte = baueAvdVerlauf(ergebnis, 0.02, false);
    const letzter = punkte[punkte.length - 1];
    const abstand = letzter.eingeflossen - letzter.aufwandNetto;

    const zugeflossen = ergebnis.jahre.reduce((s, j) => s + j.zulageZugeflossen, 0);
    const erstattung = ergebnis.jahre.reduce(
      (s, j) => s + (j.eigenbeitrag - j.nettoAufwand),
      0,
    );
    expect(abstand).toBe(Math.round(zugeflossen + erstattung));

    /*
     * Und die Gegenprobe zur Engine: Mehr als die gesamte Förderung kann der
     * Abstand nicht sein. Weniger schon - die Zulage des letzten Beitragsjahrs
     * wird erst danach gutgeschrieben (`zulagenZuflussVerzoegerungJahre`) und
     * steckt deshalb weder im Kapital noch in dieser Linie.
     */
    expect(abstand).toBeLessThanOrEqual(Math.round(ergebnis.summeFoerderung) + 1);
    expect(abstand).toBeGreaterThan(0);
  });

  /**
   * Summe der Bruttobeiträge – die Linie, die früher allein im Bild stand.
   */
  const bruttoSumme = (e: ReturnType<typeof simuliereAvd>) =>
    Math.round(e.jahre.reduce((s, j) => s + j.eigenbeitrag, 0));

  it("bei Zulagen liegt die obere Linie über dem Bruttobeitrag", () => {
    /*
     * Der Fehler, der hier beinahe eingebaut wurde. Hieße die obere Linie
     * weiter "Eigenbeiträge" und zeigte Bruttobeiträge, fehlten die Zulagen
     * im Bild vollständig - obwohl sie im Kapital darüber stecken.
     */
    const punkte = baueAvdVerlauf(ergebnis, 0.02, false);
    const letzter = punkte[punkte.length - 1];
    expect(letzter.eingeflossen).toBeGreaterThan(bruttoSumme(ergebnis));
  });

  it("die Günstigerprüfung entscheidet, ob die untere Linie abknickt", () => {
    /*
     * Beim Schreiben dieses Tests aufgefallen und wert, festgehalten zu
     * werden: Mit zwei Kindern gewinnt die Zulage die Günstigerprüfung, eine
     * **zusätzliche** Steuererstattung gibt es dann nicht
     * (`nettoAufwand === eigenbeitrag`). Die untere Linie deckt sich in
     * diesem Fall mit dem Bruttobeitrag - das ist richtig und kein Fehler der
     * Grafik. Die ganze Förderung steckt dort oben, in der Zulagenlinie.
     *
     * Ohne Kinder und bei höherem Einkommen kippt es: Dann trägt der
     * Sonderausgabenabzug, und der Aufwand liegt unter dem Beitrag.
     */
    const mitKindern = baueAvdVerlauf(ergebnis, 0.02, false);
    expect(mitKindern[mitKindern.length - 1].aufwandNetto).toBe(bruttoSumme(ergebnis));

    const ohneKinder = simuliereAvd(
      eingabe({ kinder: 0, zvEJahr: 90000, eigenbeitragMonatlich: 300 }),
    );
    const punkte = baueAvdVerlauf(ohneKinder, 0.02, false);
    const letzter = punkte[punkte.length - 1];
    expect(letzter.aufwandNetto).toBeLessThan(bruttoSumme(ohneKinder));
    expect(letzter.eingeflossen).toBeGreaterThan(letzter.aufwandNetto);
  });

  it("der Real-Modus wertet auch die Beitragslinien ab", () => {
    /*
     * Vorher blieb die Beitragslinie im Real-Modus nominal. Sie lag damit
     * neben realen Kapitalkurven, ohne dass das irgendwo stand - ein
     * Vergleich, der nicht trägt.
     */
    const nominal = baueAvdVerlauf(ergebnis, 0.02, false);
    const real = baueAvdVerlauf(ergebnis, 0.02, true);
    const n = nominal[nominal.length - 1];
    const r = real[real.length - 1];

    expect(r.eingeflossen).toBeLessThan(n.eingeflossen);
    expect(r.aufwandNetto).toBeLessThan(n.aufwandNetto);

    // Ohne Inflation darf sich dagegen nichts unterscheiden.
    const ohne = baueAvdVerlauf(ergebnis, 0, true);
    expect(ohne[ohne.length - 1].eingeflossen).toBe(n.eingeflossen);
  });

  it("die Vergleichslinie folgt dem gewählten Partner", () => {
    /*
     * `depot` heißt die Reihe immer, abgebildet wird aber der aktive
     * Vergleichspartner. Zeigte sie still das freie Depot, stünde im Diagramm
     * eine andere Gegenseite als in den Kacheln.
     */
    const mitRiester = simuliereAvd(
      eingabe({
        vergleichspartner: "riester_alt",
        riester: {
          beitragspflEinnahmenVorjahr: 45000,
          kinderGeborenVor2008: 0,
          effektivkostenPaJahr: 0.02, // Versicherungsmantel
          renditeBruttoPaJahr: 0.03, // garantiebedingt niedriger
        },
      }),
    );
    expect(mitRiester.riesterAlt).toBeDefined();
    const punkte = baueAvdVerlauf(mitRiester, 0.02, false);
    punkte.forEach((p, i) => {
      expect(p.depot).toBe(Math.round(mitRiester.riesterAlt!.kapitalProJahr[i]));
    });
  });
});
