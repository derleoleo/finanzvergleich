// Der Block wird gerendert statt angeklickt: Die Rechnerseite liegt hinter
// Anmeldung und Bezahlschranke, eine Browserprobe braeuchte echte
// Zugangsdaten. renderToStaticMarkup laeuft ohne DOM und prueft genau das,
// worauf es ankommt - dass jede Spalte ihr Gesamtkapital nennt und dass der
// Hinweis erscheint, wenn aus dem gefoerderten Vertrag nichts mehr kommt.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HinterbliebeneVergleich from './HinterbliebeneVergleich';
import { simuliereAvd, type AvdEingabe } from '@/lib/finance/avd/simulation';
import { berechneTodesfallSzenarien } from '@/lib/finance/avd/todesfall';

const BASIS: AvdEingabe = {
  geburtsjahr: 1990,
  beitragsjahrStart: 2027,
  auszahlungsbeginnAlter: 67,
  berechtigung: 'unmittelbar',
  splitting: false,
  kinder: 0,
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
};

const markup = (alter: number[], garantie: number) =>
  renderToStaticMarkup(
    <HinterbliebeneVergleich
      szenarien={berechneTodesfallSzenarien({
        basis: BASIS,
        ergebnis: simuliereAvd(BASIS),
        alter,
        rentengarantiezeitJahre: garantie,
      })}
    />,
  );

describe('Vergleich der Hinterbliebenenleistung', () => {
  it('nennt für jede Spalte das Gesamtkapital', () => {
    const html = markup([50], 10);
    expect(html).toContain('Altersvorsorgedepot, an sonstige Erben');
    expect(html).toContain('auf einen Vertrag des Ehegatten');
    expect(html).toContain('Fondspolice');
    expect(html).toContain('Freies Depot');
    // Das war der Auftrag: Gesamtkapital, nicht nur das Verfuegbare.
    expect((html.match(/Gesamtkapital/g) ?? []).length).toBe(4);
  });

  it('warnt, sobald der geförderte Vertrag leer ist und freies Kapital bleibt', () => {
    const danach = markup([80], 10);
    expect(danach).toContain('Rentengarantiezeit ist abgelaufen');
    expect(danach).toContain('nach Ablauf der Rentengarantiezeit');

    // Innerhalb der Garantiezeit darf die Warnung nicht stehen.
    const innerhalb = markup([70], 10);
    expect(innerhalb).not.toContain('Rentengarantiezeit ist abgelaufen');
  });

  it('zeichnet den leeren Vertrag als leeren Balken', () => {
    const html = markup([80], 10);
    // Zwei gefoerderte Zeilen auf null -> graue Balken ohne Breite.
    expect((html.match(/width:0%/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('bg-slate-200');
    // und die freien Spalten stehen voll da.
    expect(html).toContain('bg-blue-600');
  });

  it('rendert nichts ohne Szenarien', () => {
    expect(renderToStaticMarkup(<HinterbliebeneVergleich szenarien={[]} />)).toBe('');
  });
});
