// Die Auszahlphase zeigte immer das freie Depot - auch wenn oben die
// Fondspolice oder der Riester-Bestand gewaehlt war. Der Grund lag in der
// Engine: Fuer die beiden anderen Seiten gab es gar keine Monatsleistung.
import { describe, expect, it } from 'vitest';
import { simuliereAvd, type AvdEingabe } from './simulation';

const GRUND = {
  geburtsjahr: 1990, beitragsjahrStart: 2027, auszahlungsbeginnAlter: 67,
  berechtigung: 'unmittelbar', splitting: false, kinder: 0,
  ehegatteMittelbarBerechtigt: false, eigenbeitragMonatlich: 150,
  beitragsdynamikPaJahr: 0, zvEJahr: 48000, kirchensteuersatz: 0,
  soliBeruecksichtigen: false, steuersatzImAlter: 0.3, effektivkostenPaJahr: 0.005,
  fixkostenProJahr: 0, renditeBruttoPaJahr: 0.07, auszahlform: 'auszahlplan',
  teilkapitalAnteil: 0, auszahlplanEndalter: 85, rentenfaktorProZehntausend: 30,
  kvStatusImAlter: 'pflicht', depotKostenPaJahr: 0.003,
  vergleichsmodus: 'gleicher_nettoaufwand', sparerpauschbetrag: 0,
  inflationPaJahr: 0.02, zulagenZuflussVerzoegerungJahre: 1,
  erstattungReinvestieren: false,
} as AvdEingabe;

const MIT_LV = {
  ...GRUND, vergleichspartner: 'fonds_lv',
  fondsLv: { renditeBruttoPaJahr: 0.07, terPaJahr: 0.003, kostenart: 'prozent',
    abschlusskostenGesamt: 0, verwaltungProMonat: 0, effektivkostenPaJahr: 0.012 },
} as AvdEingabe;

const MIT_RIESTER = {
  ...GRUND, vergleichspartner: 'riester_alt',
  riester: { beitragspflEinnahmenVorjahr: 48000, kinderGeborenVor2008: 0,
    effektivkostenPaJahr: 0.02, renditeBruttoPaJahr: 0.03 },
} as AvdEingabe;

describe('Monatsleistung der Gegenseite', () => {
  it('folgt dem gewählten Vergleichspartner', () => {
    expect(simuliereAvd(GRUND).vergleichAuszahlung.partner).toBe('depot');
    expect(simuliereAvd(MIT_LV).vergleichAuszahlung.partner).toBe('fonds_lv');
    expect(simuliereAvd(MIT_RIESTER).vergleichAuszahlung.partner).toBe('riester_alt');
  });

  it('nennt jede Seite beim Namen', () => {
    expect(simuliereAvd(GRUND).vergleichAuszahlung.name).toBe('Freies Depot');
    expect(simuliereAvd(MIT_LV).vergleichAuszahlung.name).toBe('Fondspolice');
    expect(simuliereAvd(MIT_RIESTER).vergleichAuszahlung.name).toBe('Riester-Bestandsvertrag');
  });

  it('liefert für jede Seite eine Leistung über null', () => {
    for (const e of [GRUND, MIT_LV, MIT_RIESTER]) {
      expect(simuliereAvd(e).vergleichAuszahlung.monatlichNetto).toBeGreaterThan(0);
    }
  });

  it('lässt die Depotzahlen unveraendert', () => {
    // Gegenprobe: Der bisherige Weg darf sich nicht verschoben haben.
    const r = simuliereAvd(GRUND);
    expect(r.vergleichAuszahlung.monatlichNetto).toBe(r.depot.monatsentnahmeNetto);
    expect(r.vergleichAuszahlung.monatlichBrutto).toBe(r.depot.monatsentnahmeBrutto);
    expect(r.vergleichAuszahlung.steuerAuszahlphase).toBe(r.depot.steuerAuszahlphase);
  });

  it('weist die Abgeltungsteuer nur beim Depot aus', () => {
    // Police und Riester-Kapital sind zu Rentenbeginn bereits versteuert -
    // dort waere eine zweite Steuerzeile falsch.
    expect(simuliereAvd(GRUND).vergleichAuszahlung.steuerAuszahlphase).toBeDefined();
    expect(simuliereAvd(MIT_LV).vergleichAuszahlung.steuerAuszahlphase).toBeUndefined();
    expect(simuliereAvd(MIT_RIESTER).vergleichAuszahlung.steuerAuszahlphase).toBeUndefined();
    for (const e of [MIT_LV, MIT_RIESTER]) {
      const v = simuliereAvd(e).vergleichAuszahlung;
      expect(v.monatlichBrutto).toBe(v.monatlichNetto);
    }
  });

  it('folgt der Auszahlform des Altersvorsorgedepots', () => {
    // Leibrente: dieselbe Formel wie beim AVD, nur anderes Kapital.
    const rente = { ...MIT_LV, auszahlform: 'leibrente' } as AvdEingabe;
    const r = simuliereAvd(rente);
    const erwartet = (r.fondsLv!.endkapitalNachSteuer / 10000) * 30;
    expect(r.vergleichAuszahlung.monatlichNetto).toBeCloseTo(erwartet, 6);
    expect(r.vergleichAuszahlung.annahme).toContain('Leibrente');

    expect(simuliereAvd(MIT_LV).vergleichAuszahlung.annahme).toContain('Auszahlplan');
  });

  it('nennt die Annahme, statt sie zu verschweigen', () => {
    for (const e of [GRUND, MIT_LV, MIT_RIESTER]) {
      expect(simuliereAvd(e).vergleichAuszahlung.annahme.length).toBeGreaterThan(40);
    }
  });
});
