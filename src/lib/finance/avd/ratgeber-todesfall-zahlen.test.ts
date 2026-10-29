// Die Zahlen im Todesfall-Beitrag gegen die Engine.
//
// Gleiches Muster wie die beiden anderen Ratgeber-Tests: Die Tabellen werden
// aus der Markdown-Datei gelesen und nachgerechnet. Hier besonders wichtig,
// weil der Beitrag einer verbreiteten Vertriebsaussage widerspricht ("im
// Todesfall ist der gefoerderte Vertrag schlecht") - eine falsche Zahl waere
// doppelt teuer.

import { describe, expect, it } from 'vitest';
import { simuliereAvd, type AvdEingabe } from './simulation';
import { berechneTodesfallSzenarien, type TodesfallSzenario } from './todesfall';
import ROH from '../../../../ratgeber/was-im-todesfall-bleibt-altersvorsorgedepot.md?raw';

// Unter Windows kommen die Quellen mit CRLF aus Git; geprueft wird der
// Text, den auch `beitragLesen` sieht.
const TEXT = ROH.replace(/\r\n?/g, '\n');

const GARANTIE = 10;

const BASIS = {
  geburtsjahr: 1990,
  beitragsjahrStart: 2027,
  auszahlungsbeginnAlter: 67,
  berechtigung: 'unmittelbar',
  splitting: false,
  kinder: 2,
  ehegatteMittelbarBerechtigt: false,
  eigenbeitragMonatlich: 150,
  beitragsdynamikPaJahr: 0,
  zvEJahr: 48000,
  kirchensteuersatz: 0,
  soliBeruecksichtigen: false,
  steuersatzImAlter: 0.3,
  effektivkostenPaJahr: 0.005,
  fixkostenProJahr: 0,
  renditeBruttoPaJahr: 0.07,
  auszahlform: 'leibrente',
  teilkapitalAnteil: 0,
  auszahlplanEndalter: 85,
  rentenfaktorProZehntausend: 30,
  kvStatusImAlter: 'pflicht',
  depotKostenPaJahr: 0.003,
  vergleichsmodus: 'gleicher_nettoaufwand',
  sparerpauschbetrag: 0,
  inflationPaJahr: 0.02,
  zulagenZuflussVerzoegerungJahre: 1,
  erstattungReinvestieren: false,
  vergleichspartner: 'fonds_lv',
  fondsLv: {
    renditeBruttoPaJahr: 0.07,
    terPaJahr: 0.003,
    kostenart: 'prozent',
    abschlusskostenGesamt: 0,
    verwaltungProMonat: 0,
    effektivkostenPaJahr: 0.012,
  },
} as AvdEingabe;

function szenarien(auszahlform: 'leibrente' | 'auszahlplan'): Map<number, TodesfallSzenario> {
  const e = { ...BASIS, auszahlform } as AvdEingabe;
  const alter = [50, 60, 67, 75, 80];
  const liste = berechneTodesfallSzenarien({
    basis: e,
    ergebnis: simuliereAvd(e),
    alter,
    rentengarantiezeitJahre: GARANTIE,
  });
  return new Map(liste.map((s) => [s.alter, s]));
}

const RENTE = szenarien('leibrente');
const PLAN = szenarien('auszahlplan');

/** "57.223 €" -> 57223, "**0 €**" -> 0 */
function euro(zelle: string): number {
  return Number(zelle.replace(/\*/g, '').replace(/\./g, '').replace(/\s*€/, '').trim());
}

/** Datenzeilen der ersten Tabelle nach `nachTitel` mit `spalten` Spalten. */
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
    if (zellen.length === spalten && /^\**\d/.test(zellen[0]) && !zellen[0].includes('---')) {
      daten.push(zellen);
    }
  }
  expect(daten.length, `Tabelle nach "${nachTitel}"`).toBeGreaterThan(1);
  return daten;
}

describe('Ratgeber: Was im Todesfall bleibt', () => {
  it('die Ansparphase stimmt bis auf den Euro', () => {
    const zeilen = tabelle('## In der Ansparphase liegt der geförderte Vertrag vorn', 7);
    expect(zeilen).toHaveLength(2);
    for (const [alterZ, kapZ, rueckZ, steuerZ, erbenZ, policeZ, depotZ] of zeilen) {
      const s = RENTE.get(Number(alterZ))!;
      expect(s.phase, `Alter ${alterZ}`).toBe('anspar');
      expect(Math.round(s.sonstige.kapitalGesamt)).toBe(euro(kapZ));
      expect(Math.round(s.sonstige.rueckforderung)).toBe(euro(rueckZ));
      expect(Math.round(s.sonstige.steuer)).toBe(euro(steuerZ));
      expect(Math.round(s.sonstige.verfuegbar)).toBe(euro(erbenZ));
      expect(Math.round(s.fondsLv!.verfuegbar)).toBe(euro(policeZ));
      expect(Math.round(s.freiesDepot!.verfuegbar)).toBe(euro(depotZ));
    }
  });

  it('die Kernaussage der Ansparphase trägt: der Vertrag liegt vorn', () => {
    // Das ist der Satz, der einer verbreiteten Vertriebsaussage widerspricht.
    // Faellt er, ist der halbe Beitrag falsch.
    for (const alter of [50, 60]) {
      const s = RENTE.get(alter)!;
      expect(s.sonstige.verfuegbar, `Alter ${alter} gegen Police`).toBeGreaterThan(
        s.fondsLv!.verfuegbar,
      );
      expect(s.sonstige.verfuegbar, `Alter ${alter} gegen Depot`).toBeGreaterThan(
        s.freiesDepot!.verfuegbar,
      );
    }
    expect(TEXT).toContain('liegt der geförderte Vertrag vorn');
  });

  it('die Übertragung auf den Ehegatten bleibt in der Ansparphase ungeschmälert', () => {
    for (const alter of [50, 60]) {
      const s = RENTE.get(alter)!;
      expect(s.ehegatte.rueckforderung).toBe(0);
      expect(s.ehegatte.steuer).toBe(0);
      expect(s.ehegatte.verfuegbar).toBeCloseTo(s.sonstige.kapitalGesamt, 6);
    }
    expect(TEXT).toContain('57.223 € bzw. 148.805 €');
  });

  it('die Leibrenten-Tabelle stimmt, einschließlich der Null', () => {
    const zeilen = tabelle('## Mit dem Rentenbeginn kippt es', 4);
    expect(zeilen).toHaveLength(3);
    for (const [alterZ, erbenZ, policeZ, depotZ] of zeilen) {
      const s = RENTE.get(Number(alterZ))!;
      expect(Math.round(s.sonstige.verfuegbar), `an Erben mit ${alterZ}`).toBe(euro(erbenZ));
      expect(Math.round(s.fondsLv!.verfuegbar), `Police mit ${alterZ}`).toBe(euro(policeZ));
      expect(Math.round(s.freiesDepot!.verfuegbar), `Depot mit ${alterZ}`).toBe(euro(depotZ));
    }
    // Mit 80 ist Schluss - auch fuer den Ehegatten.
    const spaet = RENTE.get(80)!;
    expect(spaet.phase).toBe('nach_plan_ende');
    expect(spaet.sonstige.verfuegbar).toBe(0);
    expect(spaet.ehegatte.verfuegbar).toBe(0);
  });

  it('das verrentete Kapital und die Monatsrente stimmen', () => {
    const s = RENTE.get(67)!;
    expect(Math.round(s.verrentetesKapital!)).toBe(258521);
    expect(TEXT).toContain('258.521 €');
    const r = simuliereAvd(BASIS);
    expect(Math.round(r.auszahlung.monatsrenteBrutto)).toBe(776);
    expect(TEXT).toContain('776 € Monatsrente brutto');
  });

  it('die Gegenüberstellung von Leibrente und Auszahlplan stimmt', () => {
    // Der eigentliche Befund des Beitrags: Die Auszahlform bewegt mehr als
    // die Produktwahl.
    const zeilen = tabelle('## Die Stellschraube, die niemand nennt', 4);
    expect(zeilen).toHaveLength(3);
    for (const [alterZ, renteZ, planZ, ehegatteZ] of zeilen) {
      const alter = Number(alterZ);
      const rente = RENTE.get(alter)!;
      const plan = PLAN.get(alter)!;
      expect(Math.round(rente.sonstige.verfuegbar), `Leibrente mit ${alter}`).toBe(euro(renteZ));
      expect(Math.round(plan.sonstige.verfuegbar), `Auszahlplan mit ${alter}`).toBe(euro(planZ));
      expect(Math.round(plan.ehegatte.verfuegbar), `Ehegatte mit ${alter}`).toBe(euro(ehegatteZ));
      // Und die Richtung der Aussage.
      expect(plan.sonstige.verfuegbar).toBeGreaterThan(rente.sonstige.verfuegbar);
    }
  });

  it('nennt die Fundstellen, auf die sich der Leser stützen soll', () => {
    for (const norm of [
      '§ 93 Abs. 1 S. 1 EStG',
      '§ 93 Abs. 1 S. 4 Buchst. c EStG',
      '§ 22 Nr. 5 S. 3 EStG',
      '§ 61 VVG',
    ]) {
      expect(TEXT, `Fundstelle ${norm} fehlt`).toContain(norm);
    }
  });

  it('benennt die drei Annahmen, die das Ergebnis tragen', () => {
    // Faellt eine davon weg, steht im Beitrag eine Zahl ohne Grundlage.
    expect(TEXT).toContain('Erbschaftsteuer ist nicht abgebildet');
    expect(TEXT).toContain('Rentenphase das\n  Fondsguthaben erhält');
    expect(TEXT).toContain('bleibt nach dem Rentenbeginn liegen');
    // Und die Hinweise der Engine sagen dasselbe.
    const texte = RENTE.get(80)!.hinweise.map((h) => h.text).join(' ');
    expect(texte).toContain('Erbschaftsteuer');
    expect(texte).toContain('Fondsguthaben erhält');
    expect(texte).toContain('liegen bleibt');
  });
});
