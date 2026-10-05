import { describe, expect, it } from 'vitest';
import {
  eingabenLesen,
  reihenGruppenLesen,
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

  it('nimmt die Beschriftungen der Fassung, wenn sie welche mitbringt', () => {
    // Im AVD heisst die zweite Kurve immer `depot`, auch wenn sie eine
    // Fondspolice abbildet. Ohne mitgelieferte Namen stuende "Depot" darueber.
    const r = reihenLesen({
      punkte: mitAlter,
      beschriftungen: {
        avd: 'Altersvorsorgedepot (vor Steuern)',
        depot: 'Fondspolice (vor Steuern)',
      },
      hinweis: 'Nominale Werte vor der abschließenden Besteuerung.',
    })!;
    expect(r.beschriften('depot')).toBe('Fondspolice (vor Steuern)');
    expect(r.hinweis).toContain('Nominale Werte');
  });

  it('faellt fuer unbenannte Schluessel auf die allgemeine Zuordnung zurueck', () => {
    const r = reihenLesen({ punkte: mitAlter, beschriftungen: { depot: 'Fondspolice' } })!;
    expect(r.beschriften('avd')).toBe('Altersvorsorgedepot');
  });

  it('liest alte Fassungen weiter, die nur ein Array gespeichert haben', () => {
    const r = reihenLesen(mitAlter)!;
    expect(r.beschriften('depot')).toBe('Depot');
    expect(r.hinweis).toBeUndefined();
  });

  it('liest mehrere Reihenblöcke einer Fassung', () => {
    // Das AVD speichert Hauptverlauf und Strategien getrennt: Sie rechnen
    // auf verschiedenen Annahmen und gehören nicht in ein Diagramm.
    const gruppen = reihenGruppenLesen([
      { titel: 'Verlauf', punkte: mitAlter },
      {
        titel: 'Strategien im Vergleich',
        punkte: [
          { jahr: 1, alter: 38, nur_avd: 1200, kombination: 1180 },
          { jahr: 2, alter: 39, nur_avd: 2500, kombination: 2460 },
        ],
        beschriftungen: { nur_avd: 'Alles ins Altersvorsorgedepot' },
        hinweis: 'ohne Beitragsdynamik',
      },
    ]);
    expect(gruppen).toHaveLength(2);
    expect(gruppen[0].titel).toBe('Verlauf');
    expect(gruppen[1].beschriften('nur_avd')).toBe('Alles ins Altersvorsorgedepot');
    expect(gruppen[1].hinweis).toBe('ohne Beitragsdynamik');
  });

  it('liest alte Fassungen als einzelnen Block', () => {
    expect(reihenGruppenLesen(mitAlter)).toHaveLength(1);
    expect(reihenGruppenLesen({ punkte: mitAlter })).toHaveLength(1);
    expect(reihenGruppenLesen(null)).toHaveLength(0);
  });

  it('lässt unbrauchbare Blöcke weg, statt alles zu verwerfen', () => {
    const gruppen = reihenGruppenLesen([
      { titel: 'Gut', punkte: mitAlter },
      { titel: 'Kaputt', punkte: [{ nur_zahlen: 1 }] },
    ]);
    expect(gruppen).toHaveLength(1);
    expect(gruppen[0].titel).toBe('Gut');
  });

  it('verkraftet leere und fehlerhafte Eingaben', () => {
    expect(reihenLesen([])).toBeNull();
    expect(reihenLesen(null)).toBeNull();
    expect(reihenLesen('keine Reihe')).toBeNull();
    expect(reihenLesen({ punkte: [] })).toBeNull();
    expect(reihenLesen({ punkte: 'kaputt' })).toBeNull();
  });
});

describe('Eingaben einer gespeicherten Fassung', () => {
  it('bereitet Zahlen, Texte und Schalter lesbar auf', () => {
    const e = Object.fromEntries(
      eingabenLesen({
        name: 'Musterfall',
        end_age: 85,
        monthly_contribution: 150,
        soliBeruecksichtigen: true,
        splitting: false,
      })
    );
    expect(e.name).toBe('Musterfall');
    expect(e.end_age).toBe('85 Jahre');
    expect(e.monthly_contribution).toBe('150 €');
    expect(e.soliBeruecksichtigen).toBe('ja');
    expect(e.splitting).toBe('nein');
  });

  it('laesst Leeres und Verschachteltes weg', () => {
    const k = eingabenLesen({
      leer: '',
      nichts: null,
      fehlt: undefined,
      fonds: [{ allocation_eur: 100 }],
      bestandsvertrag: { kosten: 1 },
      beitrag: 80,
    }).map(([s]) => s);
    expect(k).toEqual(['beitrag']);
  });

  it('setzt Jahreszahlen, Alter und Dezimalquoten richtig', () => {
    const e = Object.fromEntries(
      eingabenLesen({
        geburtsjahr: 1985,
        auszahlplanEndalter: 85,
        effektivkostenPaJahr: 0.005,
        kirchensteuersatz: 0.09,
        kinder: 2,
      })
    );
    // Vorher stand hier "1.985 €", "85 €" und "0 €"
    expect(e.geburtsjahr).toBe('1985');
    expect(e.auszahlplanEndalter).toBe('85 Jahre');
    expect(e.effektivkostenPaJahr).toBe('0,50 %');
    expect(e.kirchensteuersatz).toBe('9,00 %');
    expect(e.kinder).toBe('2');
  });

  it('schreibt Auswahlwerte aus', () => {
    const e = Object.fromEntries(
      eingabenLesen({
        auszahlform: 'auszahlplan',
        berechtigung: 'unmittelbar',
        kvStatusImAlter: 'pflicht',
        vergleichspartner: 'fonds_lv',
      })
    );
    expect(e.auszahlform).toBe('Auszahlplan');
    expect(e.berechtigung).toBe('unmittelbar zulageberechtigt');
    expect(e.kvStatusImAlter).toBe('pflichtversichert');
    expect(e.vergleichspartner).toBe('Fondspolice');
  });

  it('verkraftet fehlende Eingaben', () => {
    expect(eingabenLesen(null)).toEqual([]);
    expect(eingabenLesen('kaputt')).toEqual([]);
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

  it('zeigt auch Textwerte, statt sie zu verschlucken', () => {
    // `vergleich_name` lag im Datensatz und wurde nie angezeigt (Audit A05).
    const k = Object.fromEntries(
      kennzahlenLesen({
        endkapital_nach_steuer: 1000,
        vergleich_name: 'Fondspolice',
        auszahlform: 'leibrente',
      })
    );
    expect(k.vergleich_name).toBe('Fondspolice');
    expect(formatiereKennzahl('auszahlform', 'leibrente')).toBe('Leibrente');
  });

  it('setzt die Auszahlungsergebnisse als Betraege', () => {
    expect(formatiereKennzahl('monatsrente_netto', 412)).toBe('412 €');
    expect(formatiereKennzahl('teilkapital_steuer', 1250)).toBe('1.250 €');
  });

  it('stellt die Monatsrente vor ihre Bestandteile', () => {
    const sortiert = sortiereKennzahlen([
      ['auszahlung_steuer_monat', 40],
      ['monatsrente_netto', 412],
      ['teilkapital', 5000],
    ]).map(([s]) => s);
    expect(sortiert[0]).toBe('monatsrente_netto');
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
