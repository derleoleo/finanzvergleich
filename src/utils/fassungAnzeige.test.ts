import { describe, expect, it } from 'vitest';
import {
  einheitFuer,
  formatiereKennzahl,
  istProzent,
  kennzahlenLesen,
  reihenLesen,
  sortiereKennzahlen,
} from './fassungAnzeige';

describe('Reihen einer gespeicherten Fassung', () => {
  // Alle Rechner speichern Jahr UND Alter. Wurde das Alter wie ein beliebiger
  // Zahlenwert behandelt, erschien es als Kurve im Diagramm und als Betrag in
  // der Tabelle – „Alter: 68 €".
  const mitAlter = [
    { jahr: 1, alter: 38, avd: 1200, depot: 1150 },
    { jahr: 2, alter: 39, avd: 2500, depot: 2380 },
  ];

  it('nimmt das Alter nicht als Linie ins Diagramm', () => {
    const r = reihenLesen(mitAlter)!;
    expect(r.achse).toBe('jahr');
    expect(r.linien).toEqual(['avd', 'depot']);
    expect(r.linien).not.toContain('alter');
  });

  it('behält das Alter als eigene Spalte', () => {
    expect(reihenLesen(mitAlter)!.zeitspalten).toEqual(['alter']);
  });

  it('kommt mit englischen Schlüsseln ebenso zurecht', () => {
    const r = reihenLesen([
      { year: 1, age: 38, lv_net: 1000, fund_net: 1020 },
      { year: 2, age: 39, lv_net: 2100, fund_net: 2150 },
    ])!;
    expect(r.achse).toBe('year');
    expect(r.zeitspalten).toEqual(['age']);
    expect(r.linien).toEqual(['lv_net', 'fund_net']);
  });

  it('liefert nichts, wenn außer Zeitangaben keine Werte da sind', () => {
    expect(reihenLesen([{ jahr: 1, alter: 38 }])).toBeNull();
  });

  it('liefert nichts ohne Zeitachse', () => {
    expect(reihenLesen([{ avd: 100, depot: 90 }])).toBeNull();
  });

  it('verkraftet leere und fehlerhafte Eingaben', () => {
    expect(reihenLesen([])).toBeNull();
    expect(reihenLesen(null)).toBeNull();
    expect(reihenLesen('keine Reihe')).toBeNull();
  });
});

describe('Kennzahlen einer gespeicherten Fassung', () => {
  it('lässt die Felder des Modellstempels weg', () => {
    const k = kennzahlenLesen({
      endkapital_nach_steuer: 1000,
      modell_version: '2026-10-04',
      bewertet_am: '2026-10-04',
      rechtsstand: 'x',
      alter_bei_auszahlung: 67,
    });
    expect(k.map(([s]) => s)).toEqual(['endkapital_nach_steuer']);
  });

  it('erkennt Prozentwerte, damit sie nicht als Euro erscheinen', () => {
    expect(istProzent('li_riy_percent')).toBe(true);
    expect(istProzent('break_even_rendite')).toBe(true);
    expect(istProzent('endkapital_nach_steuer')).toBe(false);
  });

  it('setzt Altersangaben nicht als Geldbetrag', () => {
    expect(einheitFuer('end_age')).toBe('alter');
    expect(einheitFuer('current_age')).toBe('alter');
    expect(formatiereKennzahl('end_age', 85)).toBe('85 Jahre');
  });

  it('unterscheidet Zeitraeume von Betraegen trotz aehnlicher Namen', () => {
    // "month" im Namen heisst nicht Monate: Das sind Betraege.
    expect(einheitFuer('monthly_gap')).toBe('euro');
    expect(einheitFuer('monatsbeitrag')).toBe('euro');
    expect(einheitFuer('admin_costs_monthly_eur')).toBe('euro');
    // Das hier dagegen ist eine Anzahl
    expect(einheitFuer('entnahmemonate')).toBe('monate');
    expect(formatiereKennzahl('entnahmemonate', 240)).toBe('240 Monate');
    expect(formatiereKennzahl('years_to_retirement', 1)).toBe('1 Jahr');
  });

  it('setzt unbekannte Kennzahlen als Euro', () => {
    expect(formatiereKennzahl('endkapital_nach_steuer', 161223)).toBe('161.223 €');
  });

  it('stellt das Ergebnis vor seine Bestandteile', () => {
    const sortiert = sortiereKennzahlen([
      ['li_fund_costs', 5],
      ['endkapital_nach_steuer', 100],
      ['total_contributions', 50],
    ]);
    expect(sortiert[0][0]).toBe('endkapital_nach_steuer');
  });
});
