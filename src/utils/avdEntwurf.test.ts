// Gespeicherte Faelle und Entwuerfe von vor der Einstiegsleiste kennen
// `hatRiesterBestand` nicht. Ohne die Ableitung stuende ein Riester-Fall beim
// Oeffnen auf "kein Bestand" - und verloere damit seinen Vergleichspartner.
import { describe, expect, it } from 'vitest';
import { ergaenzeFehlendes } from './avdEntwurf';

type Stand = { vergleichspartner?: string; hatRiesterBestand?: boolean; sonstiges?: number };
const defaults: Stand = { vergleichspartner: 'depot', hatRiesterBestand: false, sonstiges: 1 };

describe('Alte Entwuerfe und gespeicherte Faelle', () => {
  it('leitet den Riester-Bestand aus dem Vergleichspartner ab', () => {
    const geladen = ergaenzeFehlendes<Stand>({ vergleichspartner: 'riester_alt' }, defaults);
    expect(geladen.hatRiesterBestand).toBe(true);
    expect(geladen.vergleichspartner).toBe('riester_alt');
  });

  it('laesst einen Fall ohne Riester auf "nein"', () => {
    expect(ergaenzeFehlendes<Stand>({ vergleichspartner: 'depot' }, defaults).hatRiesterBestand)
      .toBe(false);
  });

  it('respektiert eine ausdrueckliche Angabe', () => {
    const neu = { vergleichspartner: 'depot', hatRiesterBestand: true };
    expect(ergaenzeFehlendes<Stand>(neu, defaults).hatRiesterBestand).toBe(true);
  });

  it('laesst alle uebrigen Werte unberuehrt', () => {
    expect(ergaenzeFehlendes<Stand>({ sonstiges: 42 }, defaults).sonstiges).toBe(42);
    expect(ergaenzeFehlendes<Stand>({}, defaults).sonstiges).toBe(1);
  });
});
