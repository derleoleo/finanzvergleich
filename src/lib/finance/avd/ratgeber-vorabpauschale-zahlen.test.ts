// Die Zahlen im Beitrag zur Vorabpauschale gegen die Engine.
//
// Gleiches Muster wie ratgeber-zahlen.test.ts. Besonders hier: Der Beitrag
// steht und fällt mit einer Behauptung, die auf den Cent stimmen muss —
// die vorab abgeführte Steuer mindert die Steuer beim Verkauf um genau
// denselben Betrag. Stimmt das nicht mehr, ist die Kernaussage falsch und
// nicht nur eine Zahl schief.

import { describe, expect, it } from "vitest";
import { simuliereAvd, type AvdEingabe } from "./simulation";
import { DEPOT_STEUER, basiszinsFuer } from "./config";
import TEXT from "../../../../ratgeber/vorabpauschale-was-sie-wirklich-kostet.md?raw";

/** Der Fall, den der Beitrag in der Rechengrundlage nennt. */
const FALL: AvdEingabe = {
  geburtsjahr: 1990,
  beitragsjahrStart: 2027,
  auszahlungsbeginnAlter: 67,
  berechtigung: "unmittelbar",
  splitting: false,
  kinder: 2,
  ehegatteMittelbarBerechtigt: false,
  eigenbeitragMonatlich: 150,
  beitragsdynamikPaJahr: 0,
  zvEJahr: 45000,
  kirchensteuersatz: 0,
  soliBeruecksichtigen: true,
  steuersatzImAlter: 0.25,
  effektivkostenPaJahr: 0.005,
  fixkostenProJahr: 0,
  renditeBruttoPaJahr: 0.07,
  auszahlform: "leibrente",
  teilkapitalAnteil: 0,
  auszahlplanEndalter: 85,
  rentenfaktorProZehntausend: 30,
  rentengarantiezeitJahre: 10,
  kvStatusImAlter: "pflicht",
  depotKostenPaJahr: 0.003,
  vergleichsmodus: "gleicher_nettoaufwand",
  inflationPaJahr: 0.02,
  zulagenZuflussVerzoegerungJahre: 1,
  erstattungReinvestieren: true,
  sparerpauschbetrag: 0,
};

const ERGEBNIS = simuliereAvd(FALL);
const JAHRE = ERGEBNIS.jahre as unknown as Record<string, number>[];

/** "153.896 €" -> 153896 */
function euro(zelle: string): number {
  return Number(zelle.replace(/\./g, "").replace(/\s*€/, "").replace(",", ".").trim());
}

/** Datenzeilen der ersten Tabelle nach `nachTitel`. */
function tabelle(nachTitel: string, spalten: number, mindestens: number): string[][] {
  const ab = TEXT.indexOf(nachTitel);
  expect(ab, `Abschnitt "${nachTitel}" fehlt im Beitrag`).toBeGreaterThan(-1);
  const zeilen = TEXT.slice(ab).split("\n");
  const start = zeilen.findIndex((z: string) => z.trim().startsWith("|"));
  expect(start, `keine Tabelle nach "${nachTitel}"`).toBeGreaterThan(-1);
  const bis = zeilen.slice(start).findIndex((z: string) => !z.trim().startsWith("|"));
  const daten = zeilen
    .slice(start, bis < 0 ? undefined : start + bis)
    .map((z: string) => z.split("|").slice(1, -1).map((c: string) => c.trim()))
    .filter((c: string[]) => c.length === spalten && /^\d/.test(c[0]) && !c[0].includes("---"));
  expect(daten.length, `Tabelle nach "${nachTitel}" zu kurz`).toBeGreaterThanOrEqual(mindestens);
  return daten;
}

/** Die im Jahr versteuerte Vorabpauschale: Zuwachs des Einstands ohne Einzahlung. */
function vorabpauschaleJeJahr(): { jahr: number; betrag: number; steuer: number }[] {
  const aus: { jahr: number; betrag: number; steuer: number }[] = [];
  let voriger = 0;
  for (const z of JAHRE) {
    const betrag = z.depotEinstand - voriger - z.nettoAufwand;
    voriger = z.depotEinstand;
    const steuer =
      Math.max(0, betrag) *
      (1 - DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS) *
      DEPOT_STEUER.ABGELTUNGSTEUER *
      (1 + DEPOT_STEUER.SOLI_ZUSCHLAG);
    aus.push({ jahr: z.jahr, betrag, steuer });
  }
  return aus;
}

describe("Ratgeber: Vorabpauschale", () => {
  it("der Jahresverlauf stimmt mit der Engine ueberein", () => {
    const zeilen = tabelle("## Was zahlt ein Sparplan über 30 Jahre?", 5, 6);
    const jeJahr = vorabpauschaleJeJahr();
    for (const [jahrZelle, alterZelle, wertZelle, einstandZelle, vpZelle] of zeilen) {
      const jahr = Number(jahrZelle);
      const zeile = JAHRE.find((z) => z.jahr === jahr);
      expect(zeile, `Jahr ${jahr} fehlt in der Simulation`).toBeDefined();
      expect(zeile!.alter, `Alter in ${jahr}`).toBe(Number(alterZelle));
      expect(Math.round(zeile!.depotKapital), `Depotwert in ${jahr}`).toBe(euro(wertZelle));
      expect(Math.round(zeile!.depotEinstand), `Einstand in ${jahr}`).toBe(euro(einstandZelle));
      const vp = jeJahr.find((v) => v.jahr === jahr);
      expect(Math.round(vp!.betrag), `Vorabpauschale in ${jahr}`).toBe(euro(vpZelle));
    }
  });

  it("die Eckwerte des Depots stehen so im Beitrag", () => {
    const d = ERGEBNIS.depot;
    expect(Math.round(d.eingezahlt)).toBe(54000);
    expect(Math.round(d.endkapitalVorSteuer)).toBe(153896);
    expect(Math.round(d.steuerBeimVerkauf)).toBe(11850);
    expect(Math.round(d.summeVorabpauschaleSteuer)).toBe(6593);
    for (const zahl of ["6.593 €", "153.896 €", "11.850 €", "89.710 €", "35.710 €", "64.186 €"]) {
      expect(TEXT, `Zahl ${zahl} fehlt im Beitrag`).toContain(zahl);
    }
  });

  it("die versteuerten Vorabpauschalen erhoehen den Einstand um 35.710 €", () => {
    const letzte = JAHRE[JAHRE.length - 1];
    const eingezahlt = JAHRE.reduce((s, z) => s + z.nettoAufwand, 0);
    expect(Math.round(eingezahlt)).toBe(54000);
    expect(Math.round(letzte.depotEinstand - eingezahlt)).toBe(35710);
    // Und der Gewinn beim Verkauf rechnet gegen den Einstand, nicht gegen die
    // Einzahlungen - das ist der Grund fuer den naechsten Test.
    expect(Math.round(ERGEBNIS.depot.endkapitalVorSteuer - letzte.depotEinstand)).toBe(64186);
  });

  it("die Vorauszahlung hebt sich beim Verkauf genau auf", () => {
    // Die Kernaussage des Beitrags. Ohne die Vorabpauschale waere der Einstand
    // nur die Einzahlung; die Steuer beim Verkauf laege dann um genau den
    // vorab abgefuehrten Betrag hoeher.
    const d = ERGEBNIS.depot;
    const satz =
      (1 - DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS) *
      DEPOT_STEUER.ABGELTUNGSTEUER *
      (1 + DEPOT_STEUER.SOLI_ZUSCHLAG);
    const ohneGutschrift = (d.endkapitalVorSteuer - d.eingezahlt) * satz;
    expect(Math.round(ohneGutschrift)).toBe(18443);
    // Auf den Euro: Vorauszahlung = Ersparnis beim Verkauf.
    expect(Math.round(ohneGutschrift - d.steuerBeimVerkauf)).toBe(
      Math.round(d.summeVorabpauschaleSteuer),
    );
    expect(TEXT).toContain("18.443 €");
    expect(TEXT).toContain("Exakt derselbe Betrag");
  });

  it("der entgangene Zinseszins betraegt 5.523 €", () => {
    // Der eigentliche Preis - aufgezinst mit der Nettorendite des Depots.
    const rNetto = FALL.renditeBruttoPaJahr - FALL.depotKostenPaJahr;
    const letztesJahr = JAHRE[JAHRE.length - 1].jahr;
    const entgangen = vorabpauschaleJeJahr().reduce(
      (s, v) => s + v.steuer * (Math.pow(1 + rNetto, letztesJahr - v.jahr) - 1),
      0,
    );
    expect(Math.round(entgangen)).toBe(5523);
    expect(TEXT).toContain("5.523 €");
    // Die Verhaeltniszahlen, mit denen der Beitrag arbeitet.
    expect((entgangen / ERGEBNIS.depot.endkapitalVorSteuer) * 100).toBeCloseTo(3.6, 1);
    expect((entgangen / ERGEBNIS.depot.summeVorabpauschaleSteuer) * 100).toBeCloseTo(83.8, 1);
  });

  it("nennt die Normen und den unterstellten Basiszins", () => {
    // Zeilenumbrueche zusammenfalten: Eine Fundstelle darf im Fliesstext
    // umgebrochen werden, ohne dass dieser Test aus dem falschen Grund faellt.
    const fliesstext = TEXT.replace(/\s+/g, " ");
    for (const norm of ["§ 18 Abs. 1 InvStG", "§ 18 Abs. 4 InvStG", "§ 20 Abs. 1 InvStG"]) {
      expect(fliesstext, `Fundstelle ${norm} fehlt`).toContain(norm);
    }
    // Der Basiszins ab 2027 ist eine Fortschreibung, keine Festsetzung - der
    // Beitrag muss den Wert nennen, mit dem gerechnet wurde.
    expect(basiszinsFuer(2026)).toBe(0.032);
    expect(basiszinsFuer(2040)).toBe(0.032);
    expect(TEXT).toContain("3,20 %");
    expect(TEXT).toContain("2,53 %");
    expect(DEPOT_STEUER.VORABPAUSCHALE_FAKTOR).toBe(0.7);
    expect(DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS).toBe(0.3);
  });
});
