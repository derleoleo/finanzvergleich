// Die Zahlen im Riester-Beitrag gegen die Engine.
//
// Gleiches Muster wie ratgeber-zahlen.test.ts: Die Tabellen werden aus der
// Markdown-Datei gelesen und nachgerechnet. Ein Fachbeitrag, den der eigene
// Rechner nicht mehr bestaetigt, ist schlimmer als kein Beitrag - und bei
// einer Erklaerung, die unwiderruflich ist, waere eine falsche Zahl im Text
// besonders teuer.

import { describe, expect, it } from 'vitest';
import { berechneZulagen, berechneZulagenRiesterAlt, RIESTER_ALT } from './zulagen';
import ROH from '../../../../ratgeber/riester-bestand-wechseln-oder-behalten.md?raw';

// Unter Windows kommen die Quellen mit CRLF aus Git; geprueft wird der
// Text, den auch `beitragLesen` sieht.
const TEXT = ROH.replace(/\r\n?/g, '\n');

const ALTER = 40;

/** "1.800 €" -> 1800, "+365 €" -> 365 */
function euro(zelle: string): number {
  return Number(
    zelle.replace(/\./g, '').replace(/\s*€/, '').replace('+', '').replace(',', '.').trim(),
  );
}

/**
 * Datenzeilen der **ersten** Tabelle nach `nachTitel`.
 *
 * Nur bis zur ersten Lücke: Der Beitrag enthält zwei Tabellen mit je fünf
 * Spalten kurz hintereinander, und ohne diese Grenze zöge die eine die Zeilen
 * der anderen mit herein.
 */
function tabelle(nachTitel: string, spalten: number): string[][] {
  const ab = TEXT.indexOf(nachTitel);
  expect(ab, `Abschnitt "${nachTitel}" fehlt`).toBeGreaterThan(-1);
  const daten: string[][] = [];
  let begonnen = false;
  for (const zeile of TEXT.slice(ab).split('\n')) {
    if (!zeile.trim().startsWith('|')) {
      if (begonnen) break;
      continue;
    }
    begonnen = true;
    const zellen = zeile.split('|').slice(1, -1).map((c: string) => c.trim());
    if (zellen.length === spalten && /\d/.test(zellen[0]) && !zellen[0].includes('---')) {
      daten.push(zellen);
    }
  }
  expect(daten.length).toBeGreaterThan(1);
  return daten;
}

const zulageAlt = (beitrag: number, eink: number, kinder: number, vor2008 = 0) =>
  berechneZulagenRiesterAlt({
    eigenbeitrag: beitrag,
    beitragspflEinnahmenVorjahr: eink,
    kinderGeborenAb2008: kinder,
    kinderGeborenVor2008: vor2008,
    alterZuBeitragsjahresbeginn: ALTER,
  });

const zulageNeu = (beitrag: number, kinder: number) =>
  berechneZulagen({
    eigenbeitrag: beitrag,
    kinder,
    alterZuBeitragsjahresbeginn: ALTER,
  }).zulageGesamt;

describe('Ratgeber: Riester-Bestand', () => {
  it('die Tabelle zu Option B stimmt mit der Engine überein', () => {
    const zeilen = tabelle('## Was Option B bringt', 6);
    expect(zeilen).toHaveLength(5);
    for (const [einkZ, kinderZ, beitragZ, altZ, neuZ, diffZ] of zeilen) {
      const eink = euro(einkZ);
      const kinder = Number(kinderZ);
      const beitrag = euro(beitragZ);
      const alt = zulageAlt(beitrag, eink, kinder).zulage;
      const neu = zulageNeu(beitrag, kinder);
      expect(Math.round(alt), `alt bei ${eink}/${kinder}/${beitrag}`).toBe(euro(altZ));
      expect(Math.round(neu), `neu bei ${eink}/${kinder}/${beitrag}`).toBe(euro(neuZ));
      expect(Math.round(neu - alt), `Unterschied bei ${eink}`).toBe(euro(diffZ));
    }
  });

  it('die Sockelzone ist nachgerechnet', () => {
    // Bis zu welchem Vorjahreseinkommen loesen 60 EUR die volle alte Zulage
    // aus? Das ist die einzige Zone, in der das alte Recht gewinnt.
    const zeilen = tabelle('## Wann die alte Förderung gewinnt', 2);
    expect(zeilen).toHaveLength(4);
    for (const [kinderZ, grenzeZ] of zeilen) {
      const kinder = Number(kinderZ);
      const grenze = euro(grenzeZ);
      const drunter = zulageAlt(RIESTER_ALT.SOCKELBETRAG, grenze, kinder);
      const drueber = zulageAlt(RIESTER_ALT.SOCKELBETRAG, grenze + 100, kinder);
      expect(drunter.zulage, `${kinder} Kinder bei ${grenze} €`).toBeCloseTo(
        drunter.zulagenanspruch,
        6,
      );
      expect(drueber.zulage, `${kinder} Kinder knapp darüber`).toBeLessThan(
        drueber.zulagenanspruch,
      );
    }
  });

  it('die beiden Schadensfälle stimmen', () => {
    const zeilen = tabelle('Zwei Fälle, in denen der Wechsel', 5);
    expect(zeilen).toHaveLength(2);
    for (const [einkZ, kinderZ, beitragZ, altZ, neuZ] of zeilen) {
      const eink = euro(einkZ);
      const kinder = Number(kinderZ);
      const beitrag = euro(beitragZ);
      const alt = zulageAlt(beitrag, eink, kinder).zulage;
      const neu = zulageNeu(beitrag, kinder);
      expect(Math.round(alt)).toBe(euro(altZ));
      expect(Math.round(neu)).toBe(euro(neuZ));
      // Der Punkt dieser Tabelle: Hier ist die alte Foerderung hoeher.
      expect(alt, `alt muss bei ${eink}/${kinder} höher sein`).toBeGreaterThan(neu);
    }
  });

  it('die Break-even-Tabelle stimmt', () => {
    const zeilen = tabelle('Ab welchem Jahresbeitrag die neue Zulage', 5);
    expect(zeilen).toHaveLength(4);
    for (const zeile of zeilen) {
      const eink = euro(zeile[0]);
      for (let kinder = 0; kinder <= 3; kinder++) {
        const behauptet = euro(zeile[kinder + 1]);
        // Bei dem genannten Beitrag muss die neue Zulage mindestens
        // gleichziehen - und knapp darunter noch nicht.
        expect(
          zulageNeu(behauptet, kinder),
          `${eink} €, ${kinder} Kinder, bei ${behauptet} €`,
        ).toBeGreaterThanOrEqual(zulageAlt(behauptet, eink, kinder).zulage - 1e-9);
        if (behauptet > 70) {
          const davor = behauptet - 10;
          expect(
            zulageNeu(davor, kinder),
            `${eink} €, ${kinder} Kinder, schon bei ${davor} €`,
          ).toBeLessThan(zulageAlt(davor, eink, kinder).zulage);
        }
      }
    }
  });

  it('die Angaben zu Kindern vor 2008 und zum Mindesteigenbeitrag stimmen', () => {
    const vor = zulageAlt(1800, 45000, 0, 2);
    expect(vor.zulagenanspruch).toBe(545);
    expect(TEXT).toContain('545 € statt');
    expect(TEXT).toContain('185 € statt 300 €');

    // Die 70.000-EUR-Zeile lebt vom Mindesteigenbeitrag - die Zahl steht im
    // Fliesstext und muss mitgezogen werden, wenn sich die Norm aendert.
    const hoch = zulageAlt(1800, 70000, 0);
    expect(Math.round(hoch.mindesteigenbeitrag)).toBe(1925);
    expect(TEXT).toContain('1.925 €');
  });

  it('die normfixierten Werte im Text entsprechen der Engine', () => {
    expect(RIESTER_ALT.GRUNDZULAGE).toBe(175);
    expect(RIESTER_ALT.SOCKELBETRAG).toBe(60);
    expect(RIESTER_ALT.MEB_SATZ).toBe(0.04);
    expect(RIESTER_ALT.KZ_VOR_2008).toBe(185);
    expect(TEXT).toContain('starren **175 €**');
    expect(TEXT).toContain('Sockelbetrag von 60 €');
    expect(TEXT).toContain('4 % der Vorjahreseinnahmen');
  });

  it('nennt die vier Stufen der Kopplungsfalle', () => {
    // Der gefaehrlichste Teil des Beitrags. Faellt eine Fundstelle weg,
    // fehlt dem Leser die Grundlage fuer eine unwiderrufliche Erklaerung.
    for (const norm of [
      '§ 52 Abs. 50a S. 4 EStG',
      '§ 90 Abs. 2 EStG n.F.',
      '§ 93 Abs. 1 EStG',
      '§ 3 Nr. 55c EStG',
      '§ 61 VVG',
    ]) {
      expect(TEXT, `Fundstelle ${norm} fehlt`).toContain(norm);
    }
  });
});
