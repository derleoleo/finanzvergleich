// Die Zahlen im Beitrag zur Begruendungspflicht gegen die Engine.
//
// Besonderheit dieses Beitrags: Seine Tabelle zeigt, was die sechs offenen
// Rechtsfragen im selben Fall ausmachen. Jede Zeile braucht einen anderen
// Fall, weil ein Schalter nur dort wirkt, wo die Frage ueberhaupt auftritt -
// bei 1.800 EUR Jahresbeitrag ist die Kinderzulage ausgeschoepft, und die
// Frage nach dem Beitragsverbrauch stellt sich gar nicht.
//
// Der Test ist zugleich eine Klammer um RECHTS_FLAGS_DEFAULT: Kommt ein Flag
// hinzu oder faellt eines weg, muss der Beitrag mit.

import { describe, expect, it } from 'vitest';
import { simuliereAvd, type AvdEingabe } from './simulation';
import { berechneTodesfallSzenarien } from './todesfall';
import { RECHTS_FLAGS_DEFAULT, type RechtsFlags } from './config';
import { guenstigerpruefung } from './zulagen';
import { RECHTSSTAND } from '../modell';
import ROH from '../../../../ratgeber/begruendungspflicht-paragraf-61-vvg.md?raw';

// Unter Windows kommen die Quellen mit CRLF aus Git; geprueft wird der
// Text, den auch `beitragLesen` sieht.
const TEXT = ROH.replace(/\r\n?/g, '\n');

const GRUND = {
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
} as AvdEingabe;

function lauf(over: Partial<AvdEingabe>, flags: Partial<RechtsFlags>, alter: number) {
  const f = { ...RECHTS_FLAGS_DEFAULT, ...flags };
  const e = { ...GRUND, ...over, flags: f } as AvdEingabe;
  const r = simuliereAvd(e);
  const t = berechneTodesfallSzenarien({
    basis: e,
    ergebnis: r,
    alter: [alter],
    rentengarantiezeitJahre: 10,
    flags: f,
  })[0];
  return {
    kapital: r.gefoerderterKapitalanteil + r.ungefoerderterKapitalanteil,
    netto: r.auszahlung.monatsrenteNetto ?? 0,
    erben: t.sonstige.verfuegbar,
  };
}

/** "25.912 €" / "**25.912 €**" -> 25912 */
function euro(zelle: string): number {
  return Number(zelle.replace(/\*/g, '').replace(/\./g, '').replace(/\s*€.*$/, '').trim());
}

/** Die Zeilen der Tabelle mit den sechs offenen Fragen. */
function tabelle(): string[][] {
  const ab = TEXT.indexOf('| Offene Frage |');
  expect(ab, 'Tabelle der offenen Fragen fehlt').toBeGreaterThan(-1);
  const daten: string[][] = [];
  for (const zeile of TEXT.slice(ab).split('\n')) {
    if (!zeile.trim().startsWith('|')) break;
    const z = zeile.split('|').slice(1, -1).map((c: string) => c.trim());
    if (z.length === 5 && !z[0].includes('---') && !z[0].startsWith('Offene')) daten.push(z);
  }
  return daten;
}

describe('Ratgeber: Begründungspflicht nach § 61 VVG', () => {
  const zeilen = tabelle();

  it('zeigt genau so viele Fragen, wie es Schalter gibt', () => {
    // Die Klammer: Ein neues Flag ohne Zeile im Beitrag faellt hier auf.
    expect(zeilen).toHaveLength(Object.keys(RECHTS_FLAGS_DEFAULT).length);
    expect(zeilen).toHaveLength(6);
  });

  it('Kinderzulage je Kind: 25.912 € Unterschied im selben Fall', () => {
    const klein = { eigenbeitragMonatlich: 25 };
    const a = lauf(klein, {}, 50);
    const b = lauf(klein, { kinderzulageProKindUnabhaengig: false }, 50);
    expect(Math.round(a.kapital)).toBe(euro(zeilen[0][2]));
    expect(Math.round(b.kapital)).toBe(euro(zeilen[0][3]));
    expect(Math.round(a.kapital - b.kapital)).toBe(euro(zeilen[0][4]));
    // Die Aussage des Beitrags: rund ein Viertel des Endkapitals.
    expect((a.kapital - b.kapital) / a.kapital).toBeGreaterThan(0.2);
  });

  it('Sonderausgaben-Volumen: unterschiedlich, ohne dass sich die Auszahlung ändert', () => {
    const gemeinsam = { eigenbeitrag: 1800, zulageGesamt: 1140, zvE: 48000, splitting: false };
    const a = guenstigerpruefung(gemeinsam);
    const b = guenstigerpruefung({
      ...gemeinsam,
      zulageOhneKinder: 540,
      flags: { ...RECHTS_FLAGS_DEFAULT, kinderzulageErhoehtSaVolumen: false },
    });
    expect(a.sonderausgabenVolumen).toBe(euro(zeilen[1][2]));
    expect(b.sonderausgabenVolumen).toBe(euro(zeilen[1][3]));
    // Genau der Punkt des Absatzes darunter: hier aendert sich nichts.
    expect(a.zusaetzlicheErstattung).toBe(b.zusaetzlicheErstattung);
    expect(TEXT).toContain('ändert sich in\ndiesem Fall trotzdem nichts');
  });

  it('ungeförderter Teil: 48 € im Monat', () => {
    const hoch = { eigenbeitragMonatlich: 300 };
    const a = lauf(hoch, {}, 50);
    const b = lauf(hoch, { ungefoerderterTeilBesteuerung: 'voll' as never }, 50);
    expect(Math.round(a.netto)).toBe(euro(zeilen[2][2]));
    expect(Math.round(b.netto)).toBe(euro(zeilen[2][3]));
    expect(Math.round(a.netto - b.netto)).toBe(euro(zeilen[2][4]));
  });

  it('anteilige Rückforderung im Todesfall: 10.633 €', () => {
    const plan = { auszahlform: 'auszahlplan' as const };
    const a = lauf(plan, {}, 75);
    const b = lauf(plan, { todesfallRueckforderungAnteilig: false }, 75);
    expect(Math.round(a.erben)).toBe(euro(zeilen[3][2]));
    expect(Math.round(b.erben)).toBe(euro(zeilen[3][3]));
    expect(Math.round(a.erben - b.erben)).toBe(euro(zeilen[3][4]));
  });

  it('Besteuerung der Erträge und Rückforderung nur zugeflossener Zulagen', () => {
    const a = lauf({}, {}, 50);
    const abgeltung = lauf({}, { todesfallErtraegeBesteuerung: 'abgeltung' }, 50);
    const alle = lauf({}, { todesfallRueckforderungNurZugeflossen: false }, 50);

    expect(Math.round(a.erben)).toBe(euro(zeilen[4][2]));
    expect(Math.round(abgeltung.erben)).toBe(euro(zeilen[4][3]));
    expect(Math.round(Math.abs(a.erben - abgeltung.erben))).toBe(euro(zeilen[4][4]));

    expect(Math.round(a.erben)).toBe(euro(zeilen[5][2]));
    expect(Math.round(alle.erben)).toBe(euro(zeilen[5][3]));
    expect(Math.round(a.erben - alle.erben)).toBe(euro(zeilen[5][4]));
  });

  it('nennt den Rechtsstand, den die gespeicherte Fassung wirklich trägt', () => {
    // Steht im Beitrag ein anderer Rechtsstand als im Stempel, verspricht der
    // Beitrag etwas, das das Produkt nicht haelt.
    expect(TEXT).toContain(RECHTSSTAND);
  });

  it('zitiert die Fundstellen, auf die sich der Leser stützen soll', () => {
    for (const norm of [
      '§ 61 Abs. 1 S. 1 VVG',
      '§ 63 VVG',
      '§ 62 VVG',
      '§ 18 FinVermV',
      '§ 16 FinVermV',
      '§ 34f GewO',
      '§ 199 Abs. 3 S. 1 Nr. 1 BGB',
      '§ 85 Abs. 1 S. 1',
      '§ 93 Abs. 1 S. 1',
    ]) {
      expect(TEXT, `Fundstelle ${norm} fehlt`).toContain(norm);
    }
    // Die drei Kernbegriffe des § 61 Abs. 1 S. 1 im Wortlaut.
    expect(TEXT).toContain('zu befragen');
    expect(TEXT).toContain('zu beraten');
    expect(TEXT).toContain('Gründe für jeden zu einer bestimmten Versicherung erteilten Rat anzugeben');
    // Und der Halbsatz, der die Beweislage dreht.
    expect(TEXT).toContain('nicht zu vertreten hat');
  });

  it('verweist auf die drei anderen Beiträge', () => {
    for (const slug of [
      'grenzfoerderquote-altersvorsorgedepot',
      'riester-bestand-wechseln-oder-behalten',
      'was-im-todesfall-bleibt-altersvorsorgedepot',
    ]) {
      expect(TEXT, `Verweis auf ${slug} fehlt`).toContain(`/ratgeber/${slug}/`);
    }
  });
});
