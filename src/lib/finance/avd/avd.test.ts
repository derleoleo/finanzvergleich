// Testfälle aus altersvorsorgedepot-rechner-spec.md (Abschnitt 8) und
// riester-vs-avd-vergleichsmodul.md (Abschnitt 2.3, 7).
// Alle Sollwerte wurden vor der Implementierung unabhängig nachgerechnet.

import { describe, expect, it } from 'vitest';
import {
  estGrundtarif2026,
  estGrundtarifRoh2026,
  estTarif2026,
  steuerentlastung,
} from './tarif';
import {
  berechneZulagen,
  berechneZulagenRiesterAlt,
  guenstigerpruefung,
} from './zulagen';
import { GESETZ, ertragsanteilFuer, basiszinsFuer } from './config';
import { sockelbetragsSchwelle } from './riester';
import { besteOption, zillmerungsverlust } from './optionen';
import {
  pruefeEingabe,
  simuliereAvd,
  foerderquotenKurve,
  deflatorFuer,
  type AvdEingabe,
} from './simulation';

const zulage = (p: Parameters<typeof berechneZulagen>[0]) =>
  berechneZulagen(p).zulageGesamt;

describe('ESt-Tarif 2026 (§ 32a EStG)', () => {
  it('Grundfreibetrag: bis 12.348 € keine Steuer', () => {
    expect(estGrundtarif2026(12348)).toBe(0);
    expect(estGrundtarif2026(12349)).toBe(0); // erste Cent-Beträge runden auf 0 ab
  });

  it('Stetigkeit Zone 2 → 3 bei 17.799 €', () => {
    expect(estGrundtarifRoh2026(17799)).toBeCloseTo(1034.87, 2);
  });

  it('Stetigkeit Zone 3 → 4 bei 69.878 € (Sprung < 10 Cent)', () => {
    const z3 = estGrundtarifRoh2026(69878);
    const z4 = 0.42 * 69878 - 11135.63;
    expect(Math.abs(z3 - z4)).toBeLessThan(0.1);
    expect(estGrundtarif2026(69878)).toBe(18213);
  });

  it('Stetigkeit Zone 4 → 5 bei 277.825 €', () => {
    expect(0.42 * 277825 - 11135.63).toBeCloseTo(0.45 * 277825 - 19470.38, 6);
    expect(estGrundtarif2026(277825)).toBe(105550);
  });

  it('Referenzwerte der Spezifikation', () => {
    expect(estGrundtarif2026(20000)).toBe(1570);
    expect(estGrundtarif2026(19460)).toBe(1437);
    expect(estGrundtarif2026(60000)).toBe(14233);
    expect(estGrundtarif2026(57660)).toBe(13339);
    expect(estGrundtarif2026(100000)).toBe(30864);
    expect(estGrundtarif2026(97660)).toBe(29881);
  });

  it('Splitting verdoppelt die Steuer des halben zvE', () => {
    expect(estTarif2026(120000, true)).toBe(2 * estGrundtarif2026(60000));
    expect(estTarif2026(24696, true)).toBe(0); // doppelter Grundfreibetrag
  });

  it('steuerentlastung ist nie negativ', () => {
    expect(steuerentlastung(10000, 2000, false)).toBe(0);
  });
});

describe('Zulagen neu – 8.1 der Spezifikation', () => {
  it('T1: E = 119 € → keine Zulage (§ 86, harte Schwelle)', () => {
    expect(zulage({ eigenbeitrag: 119 })).toBe(0);
    expect(berechneZulagen({ eigenbeitrag: 119 }).mindestbeitragErfuellt).toBe(false);
  });

  it('T2–T6: Grundzulagen-Staffel', () => {
    expect(zulage({ eigenbeitrag: 120 })).toBe(60);
    expect(zulage({ eigenbeitrag: 350 })).toBe(175);
    expect(zulage({ eigenbeitrag: 360 })).toBe(180);
    expect(zulage({ eigenbeitrag: 1200 })).toBe(390);
    expect(zulage({ eigenbeitrag: 1800 })).toBe(540);
  });

  it('T7: Beiträge über 1.800 € erhöhen die Zulage nicht', () => {
    expect(zulage({ eigenbeitrag: 3600 })).toBe(540);
    expect(zulage({ eigenbeitrag: GESETZ.EINZAHLUNG_MAX })).toBe(540);
  });

  it('T9: 300 € mit 2 Kindern → 750 € (Förderquote 250 %)', () => {
    expect(zulage({ eigenbeitrag: 300, kinder: 2 })).toBe(750);
  });

  it('T10: 2.400 € mit 2 Kindern → 1.140 €', () => {
    expect(zulage({ eigenbeitrag: 2400, kinder: 2 })).toBe(1140);
  });

  it('T11/T12: Berufseinsteigerbonus nur unter 25', () => {
    expect(zulage({ eigenbeitrag: 1200, alterZuBeitragsjahresbeginn: 24 })).toBe(590);
    expect(zulage({ eigenbeitrag: 1200, alterZuBeitragsjahresbeginn: 25 })).toBe(390);
    expect(
      zulage({ eigenbeitrag: 1200, alterZuBeitragsjahresbeginn: 24, bebBereitsGenutzt: true })
    ).toBe(390);
  });

  it('T13–T15: mittelbar berechtigter Ehegatte', () => {
    const m = (eigen: number, ehegatte: number) =>
      zulage({
        eigenbeitrag: eigen,
        berechtigung: 'mittelbar',
        eigenbeitragEhegatteUnmittelbar: ehegatte,
      });
    expect(m(120, 1800)).toBe(175); // Deckel § 84 S. 3
    expect(m(120, 350)).toBe(175); // Deckel exakt erreicht
    expect(m(120, 300)).toBe(150); // Deckel greift noch nicht
    expect(m(100, 1800)).toBe(0); // § 79 S. 2 Nr. 4: eigener Beitrag < 120 €
  });

  it('mittelbar Berechtigte bekommen keinen Berufseinsteigerbonus', () => {
    const r = berechneZulagen({
      eigenbeitrag: 120,
      berechtigung: 'mittelbar',
      eigenbeitragEhegatteUnmittelbar: 1800,
      alterZuBeitragsjahresbeginn: 22,
    });
    expect(r.berufseinsteigerbonus).toBe(0);
  });

  it('ohne Berechtigung gibt es nichts', () => {
    expect(zulage({ eigenbeitrag: 1800, kinder: 2, berechtigung: 'keine' })).toBe(0);
  });

  it('Flag: Kinderzulage alternativ mit Beitragsverbrauch', () => {
    const flags = {
      kinderzulageProKindUnabhaengig: false,
      kinderzulageErhoehtSaVolumen: true,
      ungefoerderterTeilBesteuerung: 'ertragsanteil' as const,
    };
    // 300 € Beitrag, 2 Kinder: unabhängig 600 €, mit Verbrauch nur 300 €
    expect(berechneZulagen({ eigenbeitrag: 300, kinder: 2, flags }).kinderzulage).toBe(300);
    expect(berechneZulagen({ eigenbeitrag: 300, kinder: 2 }).kinderzulage).toBe(600);
  });
});

describe('Günstigerprüfung – 8.2 der Spezifikation', () => {
  const pruefe = (zvE: number, eigenbeitrag: number, kinder = 0) => {
    const z = berechneZulagen({ eigenbeitrag, kinder });
    return {
      z: z.zulageGesamt,
      ...guenstigerpruefung({
        eigenbeitrag,
        zulageGesamt: z.zulageGesamt,
        zulageOhneKinder: z.grundzulage + z.berufseinsteigerbonus,
        zvE,
      }),
    };
  };

  it('T16: zvE 60.000 €, Beitrag 1.800 € → 894 € Entlastung, 354 € Erstattung', () => {
    const r = pruefe(60000, 1800);
    expect(r.sonderausgabenVolumen).toBe(2340);
    expect(r.steuerentlastung).toBe(894);
    expect(r.zusaetzlicheErstattung).toBe(354);
    expect(r.ergebnis).toBe('sonderausgabenabzug');
    expect(r.gesamtfoerderung).toBe(894);
    expect(r.foerderquote).toBeCloseTo(0.497, 3);
  });

  it('T17: zvE 20.000 €, Beitrag 360 € → Zulage bleibt (S < Z)', () => {
    const r = pruefe(20000, 360);
    expect(r.sonderausgabenVolumen).toBe(540);
    expect(r.steuerentlastung).toBe(133);
    expect(r.ergebnis).toBe('zulage');
    expect(r.zusaetzlicheErstattung).toBe(0);
    expect(r.gesamtfoerderung).toBe(180);
    expect(r.foerderquote).toBeCloseTo(0.5, 6);
  });

  it('T18: zvE 100.000 €, Beitrag 1.800 € → 983 € Entlastung, 443 € Erstattung', () => {
    const r = pruefe(100000, 1800);
    expect(r.steuerentlastung).toBe(983);
    expect(r.zusaetzlicheErstattung).toBe(443);
  });

  it('T18b: zvE 48.000 €, Beitrag 1.200 € → 543 € Entlastung, 153 € Erstattung', () => {
    const r = pruefe(48000, 1200);
    expect(r.sonderausgabenVolumen).toBe(1590);
    expect(r.steuerentlastung).toBe(543);
    expect(r.zusaetzlicheErstattung).toBe(153);
  });

  it('Ehegatten-Erhöhung um 120 € (§ 10a Abs. 3 n.F.)', () => {
    const r = guenstigerpruefung({
      eigenbeitrag: 1920,
      zulageGesamt: 540,
      zvE: 60000,
      ehegatteMittelbarBerechtigt: true,
    });
    expect(r.sonderausgabenVolumen).toBe(1920 + 540);
  });

  it('Flag: Kinderzulage erhöht das SA-Volumen (Gesetzeswortlaut) oder nicht (BMF-FAQ)', () => {
    const basis = { eigenbeitrag: 1800, zulageGesamt: 1140, zulageOhneKinder: 540, zvE: 60000 };
    expect(guenstigerpruefung(basis).sonderausgabenVolumen).toBe(2940);
    expect(
      guenstigerpruefung({
        ...basis,
        flags: {
          kinderzulageProKindUnabhaengig: true,
          kinderzulageErhoehtSaVolumen: false,
          ungefoerderterTeilBesteuerung: 'ertragsanteil',
        },
      }).sonderausgabenVolumen
    ).toBe(2340);
  });
});

describe('Riester alt (Bestandsverträge) – Modul 2', () => {
  const alt = (
    beitragspflEinnahmenVorjahr: number,
    eigenbeitrag: number,
    kinderGeborenAb2008 = 0,
    kinderGeborenVor2008 = 0
  ) =>
    berechneZulagenRiesterAlt({
      eigenbeitrag,
      beitragspflEinnahmenVorjahr,
      kinderGeborenAb2008,
      kinderGeborenVor2008,
    });

  it('T21/T22: volle alte Zulage bei erfülltem Mindesteigenbeitrag', () => {
    expect(alt(40000, 1425).zulage).toBe(175);
    expect(alt(40000, 825, 2).zulage).toBe(775);
  });

  it('T23/T24: Sockelbetrag 60 € löst bei kleinen Einkommen die volle Zulage aus', () => {
    expect(alt(5000, 60, 2).zulage).toBe(775);
    expect(alt(5000, 120, 2).zulage).toBe(775);
    // neu dagegen: 60 € → gar nichts, 120 € → 300 €
    expect(zulage({ eigenbeitrag: 60, kinder: 2 })).toBe(0);
    expect(zulage({ eigenbeitrag: 120, kinder: 2 })).toBe(300);
  });

  it('anteilige Kürzung bei Unterschreiten des Mindesteigenbeitrags', () => {
    const r = alt(70000, 1800);
    expect(r.mindesteigenbeitrag).toBe(1925);
    expect(Math.round(r.zulage)).toBe(164);
  });

  it('R3: Kinder vor 2008 bringen nur 185 € statt 300 €', () => {
    const r = alt(45000, 1800, 0, 2);
    expect(r.zulagenanspruch).toBe(545);
    expect(r.mindesteigenbeitrag).toBe(1255);
    expect(r.zulage).toBe(545);
  });

  it('SA-Volumen alt ist bei 2.100 € gedeckelt und rechnet mit dem Anspruch', () => {
    expect(alt(45000, 900, 2).sonderausgabenVolumen).toBe(1675);
    expect(alt(45000, 1800, 2).sonderausgabenVolumen).toBe(2100);
  });

  it('Vergleichstabelle 2.3 – alle sieben Zeilen', () => {
    const zeilen: [number, number, number, number, number, number, number][] = [
      // Einkommen, Kinder, Beitrag, Zulage alt, Zulage neu, SA alt, SA neu
      [45000, 0, 1800, 175, 540, 1975, 2340],
      [45000, 2, 1800, 775, 1140, 2100, 2940],
      [45000, 2, 900, 680, 915, 1675, 1815],
      [30000, 2, 600, 775, 840, 1375, 1440],
      [70000, 0, 1800, 164, 540, 1975, 2340],
      [20000, 3, 300, 1075, 1050, 1375, 1350],
      [12000, 2, 120, 775, 300, 895, 420],
    ];
    for (const [eink, kinder, beitrag, zAlt, zNeu, saAlt, saNeu] of zeilen) {
      const a = alt(eink, beitrag, kinder);
      expect(Math.round(a.zulage)).toBe(zAlt);
      expect(a.sonderausgabenVolumen).toBe(saAlt);
      const n = zulage({ eigenbeitrag: beitrag, kinder });
      expect(n).toBe(zNeu);
      expect(Math.min(beitrag, 1800) + n).toBe(saNeu);
    }
  });

  it('R5/R6: Break-even bei 20.000 € und 3 Kindern liegt zwischen 300 und 360 €', () => {
    expect(alt(20000, 300, 3).zulage).toBe(1075);
    expect(zulage({ eigenbeitrag: 300, kinder: 3 })).toBe(1050); // alt besser
    expect(zulage({ eigenbeitrag: 360, kinder: 3 })).toBe(1080); // neu besser
  });

  it('Sockelbetrags-Schwellen: E ≤ 25 × (Anspruch + 60)', () => {
    expect(25 * (175 + 60)).toBe(5875);
    expect(25 * (475 + 60)).toBe(13375);
    expect(25 * (775 + 60)).toBe(20875);
    expect(25 * (1075 + 60)).toBe(28375);
  });
});

describe('Konstanten und Tabellen', () => {
  it('Kleinbetragsrente: 1,5 % der Bezugsgröße = 59,33 €', () => {
    expect(
      GESETZ.BEZUGSGROESSE_MONAT_2026 * GESETZ.KLEINBETRAGSRENTE_ANTEIL_BEZUGSGROESSE
    ).toBeCloseTo(59.325, 3);
  });

  it('Ertragsanteil nach Alter (§ 22 Nr. 1 S. 3a bb)', () => {
    expect(ertragsanteilFuer(65)).toBe(0.18);
    expect(ertragsanteilFuer(67)).toBe(0.17);
    expect(ertragsanteilFuer(70)).toBe(0.15);
    expect(ertragsanteilFuer(50)).toBe(0.22);
    expect(ertragsanteilFuer(80)).toBe(0.11);
  });

  it('Basiszins ist ein Jahres-Lookup, keine Konstante', () => {
    expect(basiszinsFuer(2025)).toBe(0.0253);
    expect(basiszinsFuer(2026)).toBe(0.032);
  });
});

// ---------------------------------------------------------------------------

function eingabe(over: Partial<AvdEingabe> = {}): AvdEingabe {
  return {
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
    steuersatzImAlter: 0.22,
    effektivkostenPaJahr: 0.005,
    fixkostenProJahr: 0,
    renditeBruttoPaJahr: 0.07,
    auszahlform: 'auszahlplan',
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
    ...over,
  };
}

describe('AVD-Simulation', () => {
  it('Ansparphase: Beitragssumme, Zulagen und Kapitalaufbau sind konsistent', () => {
    const r = simuliereAvd(eingabe());
    expect(r.jahreBisAuszahlung).toBe(30); // 2027 mit 37 bis 67
    expect(r.summeEigenbeitraege).toBeCloseTo(150 * 12 * 30, 6);
    // 1.800 €/Jahr → volle Grundzulage 540 €
    expect(r.summeZulagen).toBeCloseTo(540 * 30, 6);
    expect(r.endkapitalNominal).toBeGreaterThan(r.summeEigenbeitraege);
    expect(r.endkapitalReal).toBeLessThan(r.endkapitalNominal);
  });

  it('geförderter und ungeförderter Anteil werden getrennt geführt', () => {
    const r = simuliereAvd(eingabe({ eigenbeitragMonatlich: 300 })); // 3.600 €/Jahr
    expect(r.ungefoerderterKapitalanteil).toBeGreaterThan(0);
    expect(r.gefoerderterKapitalanteil + r.ungefoerderterKapitalanteil).toBeCloseTo(
      r.endkapitalNominal,
      6
    );
    // Nur 1.800 € pro Jahr sind gefördert → Zulage bleibt bei 540 €
    expect(r.summeZulagen).toBeCloseTo(540 * r.jahreBisAuszahlung, 6);
    expect(r.hinweise.some((h) => h.art === 'warnung')).toBe(true);
  });

  it('ohne ungeförderten Anteil bleibt der ungeförderte Topf leer', () => {
    const r = simuliereAvd(eingabe());
    expect(r.ungefoerderterKapitalanteil).toBe(0);
  });

  it('Zulagenverzögerung mindert das Endkapital', () => {
    const ohne = simuliereAvd(eingabe({ zulagenZuflussVerzoegerungJahre: 0 }));
    const mit = simuliereAvd(eingabe({ zulagenZuflussVerzoegerungJahre: 2 }));
    expect(mit.endkapitalNominal).toBeLessThan(ohne.endkapitalNominal);
    expect(mit.summeZulagen).toBeCloseTo(ohne.summeZulagen, 6);
  });

  it('Beitragsdynamik erhöht die Beitragssumme', () => {
    const ohne = simuliereAvd(eingabe());
    const mit = simuliereAvd(eingabe({ beitragsdynamikPaJahr: 0.03 }));
    expect(mit.summeEigenbeitraege).toBeGreaterThan(ohne.summeEigenbeitraege);
  });

  it('Kinder erhöhen die Förderquote deutlich', () => {
    const ohne = simuliereAvd(eingabe({ eigenbeitragMonatlich: 25 }));
    const mit = simuliereAvd(eingabe({ eigenbeitragMonatlich: 25, kinder: 2 }));
    // 300 € Beitrag → 150 € Zulage; bei zvE 48.000 kommt über die
    // Günstigerprüfung noch etwas Erstattung dazu
    expect(ohne.foerderquoteGesamt).toBeGreaterThanOrEqual(0.5);
    expect(ohne.foerderquoteGesamt).toBeLessThan(0.55);
    expect(mit.foerderquoteGesamt).toBeGreaterThan(2); // 750 € auf 300 € Beitrag
  });

  it('Vergleichsdepot zahlt Vorabpauschale und Verkaufssteuer', () => {
    const r = simuliereAvd(eingabe());
    expect(r.depot.summeVorabpauschaleSteuer).toBeGreaterThan(0);
    expect(r.depot.steuerBeimVerkauf).toBeGreaterThan(0);
    expect(r.depot.endkapitalNetto).toBeLessThan(r.depot.endkapitalVorSteuer);
  });

  it('gleicher Netto-Aufwand: Depot bekommt weniger als der Bruttobeitrag', () => {
    const netto = simuliereAvd(eingabe());
    const brutto = simuliereAvd(eingabe({ vergleichsmodus: 'gleicher_bruttobeitrag' }));
    expect(netto.depot.eingezahlt).toBeLessThan(brutto.depot.eingezahlt);
    expect(netto.depot.eingezahlt).toBeCloseTo(
      netto.summeEigenbeitraege - netto.summeSteuererstattung,
      6
    );
  });

  it('ohne Förderberechtigung schlägt das freie Depot das AVD', () => {
    const r = simuliereAvd(eingabe({ berechtigung: 'keine' }));
    expect(r.summeZulagen).toBe(0);
    expect(r.summeSteuererstattung).toBe(0);
    // Volle nachgelagerte Besteuerung ohne Förderung, dazu höhere Kosten
    expect(r.vorteilGegenDepot).toBeLessThan(0);
  });

  it('Vergleich läuft auf beiden Seiten nach Steuern', () => {
    const r = simuliereAvd(eingabe());
    expect(r.endkapitalNachSteuer).toBeLessThan(r.endkapitalNominal);
    expect(r.vorteilGegenDepot).toBeCloseTo(
      r.endkapitalNachSteuer - r.depot.endkapitalNetto,
      6
    );
    // Mit voller Förderung gewinnt das AVD deutlich
    expect(r.vorteilGegenDepot).toBeGreaterThan(0);
  });
});

describe('Auszahlphase', () => {
  it('Auszahlplan: gesetzliche Mindestrate = 0,8 × Kapital / Restmonate', () => {
    // T19: 200.000 €, Beginn 67, Ende 85 → 216 Monate
    const r = simuliereAvd(eingabe());
    const kapital = r.endkapitalNominal;
    const erwartet = (0.8 * kapital) / 216;
    expect(r.auszahlung.gesetzlicheMindestrate).toBeCloseTo(erwartet, 6);
  });

  it('T19/T20: Mindestratenformel isoliert', () => {
    expect((0.8 * 200000) / 216).toBeCloseTo(740.74, 2);
    expect((0.8 * 180000) / 180).toBeCloseTo(800, 6);
  });

  it('Leibrente nutzt den Rentenfaktor', () => {
    const r = simuliereAvd(eingabe({ auszahlform: 'leibrente' }));
    expect(r.auszahlung.monatsrenteBrutto).toBeCloseTo(
      (r.endkapitalNominal / 10000) * 30,
      6
    );
    expect(r.auszahlung.gesetzlicheMindestrate).toBeUndefined();
  });

  it('geförderte Leistung wird voll nachgelagert besteuert', () => {
    const r = simuliereAvd(eingabe({ auszahlform: 'leibrente', steuersatzImAlter: 0.25 }));
    // Nur geförderter Topf → Steuer ≈ 25 % abzüglich Werbungskostenpauschale
    const erwartet = r.auszahlung.monatsrenteBrutto * 0.25 - (102 * 0.25) / 12;
    expect(r.auszahlung.steuerProMonat).toBeCloseTo(erwartet, 4);
  });

  it('Teilkapitalauszahlung ist steuerpflichtig und auf 30 % begrenzt', () => {
    const r = simuliereAvd(eingabe({ teilkapitalAnteil: 0.3 }));
    expect(r.auszahlung.teilkapital).toBeCloseTo(r.endkapitalNominal * 0.3, 6);
    expect(r.auszahlung.teilkapitalSteuer).toBeGreaterThan(0);
    const zuViel = simuliereAvd(eingabe({ teilkapitalAnteil: 0.5 }));
    expect(zuViel.auszahlung.teilkapital).toBeCloseTo(zuViel.endkapitalNominal * 0.3, 6);
  });

  it('freiwillig gesetzlich Versicherte zahlen KV/PV, Pflichtversicherte nicht', () => {
    const pflicht = simuliereAvd(eingabe({ kvStatusImAlter: 'pflicht' }));
    const freiwillig = simuliereAvd(eingabe({ kvStatusImAlter: 'freiwillig' }));
    expect(pflicht.auszahlung.kvBeitrag).toBe(0);
    expect(freiwillig.auszahlung.kvBeitrag).toBeGreaterThan(0);
    expect(freiwillig.auszahlung.monatsrenteNetto).toBeLessThan(
      pflicht.auszahlung.monatsrenteNetto
    );
  });
});

describe('Validierung (Abschnitt 9)', () => {
  it('Einzahlung über 6.840 € ist ein Fehler', () => {
    const h = pruefeEingabe(eingabe({ eigenbeitragMonatlich: 600 }));
    expect(h.some((x) => x.art === 'fehler' && x.text.includes('6840'))).toBe(true);
  });

  it('Auszahlungsbeginn außerhalb 65–70 ist ein Fehler', () => {
    expect(pruefeEingabe(eingabe({ auszahlungsbeginnAlter: 62 })).some((x) => x.art === 'fehler')).toBe(true);
    expect(pruefeEingabe(eingabe({ auszahlungsbeginnAlter: 71 })).some((x) => x.art === 'fehler')).toBe(true);
    expect(pruefeEingabe(eingabe({ auszahlungsbeginnAlter: 65 })).some((x) => x.art === 'fehler')).toBe(false);
  });

  it('Auszahlplan vor 85 ist ein Fehler', () => {
    const h = pruefeEingabe(eingabe({ auszahlform: 'auszahlplan', auszahlplanEndalter: 80 }));
    expect(h.some((x) => x.art === 'fehler')).toBe(true);
  });

  it('Beitrag unter 120 € warnt vor dem Zulagenverlust', () => {
    const h = pruefeEingabe(eingabe({ eigenbeitragMonatlich: 5 }));
    expect(h.some((x) => x.art === 'warnung' && x.text.includes('120'))).toBe(true);
  });
});

describe('Randfälle (über die UI erreichbar)', () => {
  it('mittelbar Berechtigte bekommen die Zulage, aber keinen eigenen SA-Abzug', () => {
    // § 10a Abs. 3: Der Abzug läuft über den unmittelbar berechtigten Ehegatten
    const g = guenstigerpruefung({
      eigenbeitrag: 1800,
      zulageGesamt: 175,
      berechtigung: 'mittelbar',
      zvE: 48000,
    });
    expect(g.sonderausgabenVolumen).toBe(0);
    expect(g.steuerentlastung).toBe(0);
    expect(g.zusaetzlicheErstattung).toBe(0);
    expect(g.gesamtfoerderung).toBe(175); // Zulage fließt weiterhin
  });

  it('ohne Berechtigung gibt es weder Zulage noch Abzug', () => {
    const g = guenstigerpruefung({
      eigenbeitrag: 1800,
      zulageGesamt: 0,
      berechtigung: 'keine',
      zvE: 100000,
    });
    expect(g.gesamtfoerderung).toBe(0);
    expect(g.steuerentlastung).toBe(0);
  });

  it('Inflation ≤ −100 % erzeugt kein Infinity', () => {
    expect(deflatorFuer(-1, 30)).toBe(1);
    expect(deflatorFuer(-2, 30)).toBe(1);
    expect(deflatorFuer(0.02, 10)).toBeCloseTo(Math.pow(1.02, 10), 10);
    const r = simuliereAvd(eingabe({ inflationPaJahr: -1 }));
    expect(Number.isFinite(r.endkapitalReal)).toBe(true);
    expect(Number.isFinite(r.endkapitalNachSteuerReal)).toBe(true);
    expect(r.jahre.every((j) => Number.isFinite(j.kapitalGesamtReal))).toBe(true);
  });

  it('kein Ansparzeitraum mehr: Fehlerhinweis statt stiller Ein-Jahres-Rechnung', () => {
    // 2027 minus Geburtsjahr 1951 = Alter 76, Auszahlung mit 67
    const h = pruefeEingabe(eingabe({ geburtsjahr: 1951 }));
    expect(h.some((x) => x.art === 'fehler' && x.text.includes('Beitragsjahr'))).toBe(true);
    const ok = pruefeEingabe(eingabe({ geburtsjahr: 1990 }));
    expect(ok.some((x) => x.art === 'fehler')).toBe(false);
  });

  it('Rente 0 löst keinen Kleinbetragsrenten-Hinweis aus', () => {
    const r = simuliereAvd(
      eingabe({ auszahlform: 'leibrente', rentenfaktorProZehntausend: 0 })
    );
    expect(r.auszahlung.monatsrenteBrutto).toBe(0);
    expect(r.auszahlung.kleinbetragsrenteMoeglich).toBe(false);
  });

  it('Beitrag 0 liefert durchgehend endliche Werte', () => {
    const r = simuliereAvd(eingabe({ eigenbeitragMonatlich: 0 }));
    for (const v of [
      r.endkapitalNominal, r.endkapitalNachSteuer, r.foerderquoteGesamt,
      r.auszahlung.monatsrenteBrutto, r.auszahlung.monatsrenteNetto,
      r.depot.monatsentnahmeVergleich, r.vorteilGegenDepot,
    ]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it('negative Rendite und Kosten über der Rendite bleiben rechenbar', () => {
    for (const e of [
      eingabe({ renditeBruttoPaJahr: -0.02 }),
      eingabe({ effektivkostenPaJahr: 0.1 }),
      eingabe({ fixkostenProJahr: 5000 }),
    ]) {
      const r = simuliereAvd(e);
      expect(Number.isFinite(r.endkapitalNominal)).toBe(true);
      expect(r.endkapitalNominal).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.auszahlung.monatsrenteBrutto)).toBe(true);
    }
  });

  it('negativer Steuersatz im Alter wird auf 0 geklemmt', () => {
    const r = simuliereAvd(eingabe({ steuersatzImAlter: -0.1 }));
    expect(r.endkapitalNachSteuer).toBeCloseTo(r.endkapitalNominal, 6);
  });
});

describe('Vergleich gegen Riester-Bestandsvertrag', () => {
  const mitRiester = (over: Partial<AvdEingabe> = {}, riesterOver = {}) =>
    simuliereAvd(
      eingabe({
        vergleichspartner: 'riester_alt',
        riester: {
          beitragspflEinnahmenVorjahr: 45000,
          kinderGeborenVor2008: 0,
          effektivkostenPaJahr: 0.02, // Versicherungsmantel
          renditeBruttoPaJahr: 0.03, // garantiebedingt niedriger
          ...riesterOver,
        },
        ...over,
      })
    );

  it('rechnet beide Seiten und weist den Vorteil gegen Riester aus', () => {
    const r = mitRiester();
    expect(r.riesterAlt).toBeDefined();
    expect(r.vorteilGegenVergleich).toBeCloseTo(
      r.endkapitalNachSteuer - r.riesterAlt!.endkapitalNachSteuer,
      6
    );
    // Der Depot-Vergleich bleibt zusätzlich verfügbar
    expect(r.vorteilGegenDepot).toBeCloseTo(
      r.endkapitalNachSteuer - r.depot.endkapitalNetto,
      6
    );
  });

  it('ohne Riester-Parameter bleibt es beim Depot-Vergleich', () => {
    const r = simuliereAvd(eingabe());
    expect(r.riesterAlt).toBeUndefined();
    expect(r.vorteilGegenVergleich).toBeCloseTo(r.vorteilGegenDepot, 6);
  });

  it('45.000 € Einkommen, 1.800 € Beitrag: alt 175 €, neu 540 €', () => {
    const r = mitRiester();
    expect(r.riesterAlt!.zulageJahr1).toBe(175);
    expect(r.jahre[0].zulage).toBe(540);
    expect(r.riesterAlt!.gekuerztJahr1).toBe(false);
  });

  it('2 Kinder ab 2008: alt 775 €, neu 1.140 €', () => {
    const r = mitRiester({ kinder: 2 });
    expect(r.riesterAlt!.zulageJahr1).toBe(775);
    expect(r.jahre[0].zulage).toBe(1140);
  });

  it('Kinder vor 2008 bringen alt nur 185 € statt 300 €', () => {
    const r = mitRiester({ kinder: 2 }, { kinderGeborenVor2008: 2 });
    expect(r.riesterAlt!.zulagenanspruchJahr1).toBe(545); // 175 + 2 × 185
    expect(r.jahre[0].zulage).toBe(1140); // neu unverändert
  });

  it('anteilige Kürzung bei zu kleinem Beitrag (70.000 € Einkommen)', () => {
    const r = mitRiester({}, { beitragspflEinnahmenVorjahr: 70000 });
    expect(r.riesterAlt!.mindesteigenbeitragJahr1).toBe(1925);
    expect(Math.round(r.riesterAlt!.zulageJahr1)).toBe(164);
    expect(r.riesterAlt!.gekuerztJahr1).toBe(true);
  });

  it('niedriges Einkommen + Kinder + Sockelbeitrag: alt schlägt neu, mit Warnung', () => {
    // 12.000 € Einkommen, 2 Kinder, 120 €/Jahr → alt 775 €, neu 300 €
    const r = mitRiester(
      { kinder: 2, eigenbeitragMonatlich: 10 },
      { beitragspflEinnahmenVorjahr: 12000 }
    );
    expect(r.riesterAlt!.zulageJahr1).toBe(775);
    expect(r.jahre[0].zulage).toBe(300);
    expect(r.riesterAlt!.summeFoerderung).toBeGreaterThan(r.summeFoerderung);
    expect(
      r.hinweise.some((h) => h.art === 'warnung' && h.text.includes('alte Riester'))
    ).toBe(true);
  });

  it('Kopplungs- und Steuerhinweise erscheinen im Riester-Modus', () => {
    const r = mitRiester();
    expect(r.hinweise.some((h) => h.text.includes('unwiderruflich'))).toBe(true);
    expect(r.hinweise.some((h) => h.text.includes('§ 22 Nr. 5'))).toBe(true);
    // im Depot-Modus nicht
    expect(simuliereAvd(eingabe()).hinweise.some((h) => h.text.includes('unwiderruflich'))).toBe(false);
  });

  it('höhere Kosten und niedrigere Rendite lassen den Altvertrag zurückfallen', () => {
    const teuer = mitRiester();
    const guenstig = mitRiester({}, { effektivkostenPaJahr: 0.004, renditeBruttoPaJahr: 0.07 });
    expect(guenstig.riesterAlt!.endkapitalNominal).toBeGreaterThan(
      teuer.riesterAlt!.endkapitalNominal
    );
    expect(teuer.vorteilGegenVergleich).toBeGreaterThan(guenstig.vorteilGegenVergleich);
  });

  it('Sockelbetrags-Schwelle nach Kinderzahl', () => {
    expect(sockelbetragsSchwelle(0, 0)).toBe(5875);
    expect(sockelbetragsSchwelle(1, 0)).toBe(13375);
    expect(sockelbetragsSchwelle(2, 0)).toBe(20875);
    expect(sockelbetragsSchwelle(0, 2)).toBe(25 * (175 + 370 + 60));
  });
});

describe('Förderquoten-Kurve', () => {
  const kurve = foerderquotenKurve({
    kinder: 0,
    zvE: 48000,
    splitting: false,
    berechtigung: 'unmittelbar',
    schritt: 60,
  });

  it('Grenzförderquote fällt über den Beitrag und wird oberhalb 1.800 € zu 0', () => {
    const bei360 = kurve.find((p) => p.beitrag === 360)!;
    const bei1200 = kurve.find((p) => p.beitrag === 1200)!;
    const bei2400 = kurve.find((p) => p.beitrag === 2400)!;
    expect(bei360.grenzfoerderquote).toBeGreaterThan(bei1200.grenzfoerderquote);
    expect(bei2400.grenzfoerderquote).toBe(0);
  });

  it('mit Kindern ist die Förderquote bei kleinen Beiträgen extrem hoch', () => {
    const mitKindern = foerderquotenKurve({
      kinder: 2,
      zvE: 48000,
      splitting: false,
      berechtigung: 'unmittelbar',
      schritt: 60,
    });
    const bei300 = mitKindern.find((p) => p.beitrag === 300)!;
    expect(bei300.foerderquote).toBeGreaterThan(2);
  });
});

describe('Vier Handlungsoptionen (A–D)', () => {
  const bestand = {
    aktuellerVertragswert: 20000,
    summeBeitraegeUndZulagenBisher: 24000,
    garantiertesKapitalZuRentenbeginn: 0,
    wechselgebuehr: 150,
    ruhendStellenKostenProJahr: 0,
    fruehesterZugriffAlter: 62,
  };
  const mitOptionen = (over: Partial<AvdEingabe> = {}, bestandOver = {}) =>
    simuliereAvd(
      eingabe({
        vergleichspartner: 'riester_alt',
        riester: {
          beitragspflEinnahmenVorjahr: 45000,
          kinderGeborenVor2008: 0,
          effektivkostenPaJahr: 0.02,
          renditeBruttoPaJahr: 0.03,
        },
        bestandsvertrag: { ...bestand, ...bestandOver },
        ...over,
      })
    );

  it('liefert genau vier Optionen mit stabilen IDs', () => {
    const o = mitOptionen().handlungsoptionen!;
    expect(o.map((x) => x.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('nur A nutzt die alte Förderung, B–D die neue', () => {
    const o = mitOptionen().handlungsoptionen!;
    expect(o[0].foerderregime).toBe('alt');
    expect(o.slice(1).every((x) => x.foerderregime === 'neu')).toBe(true);
    // Bei 1.800 € Beitrag und 45.000 € Einkommen: alt 175 €, neu 540 € + Erstattung
    expect(o[1].summeFoerderung).toBeGreaterThan(o[0].summeFoerderung);
  });

  it('B kostet nichts und behält den frühen Zugriff des Altvertrags', () => {
    const o = mitOptionen().handlungsoptionen!;
    const b = o.find((x) => x.id === 'B')!;
    expect(b.einmalkosten).toBe(0);
    expect(b.fruehesterZugriffAlter).toBe(62);
    // gleiches Produkt wie A → gleiche Rendite, nur mehr Förderung
    expect(b.endkapitalNominal).toBeGreaterThan(o[0].endkapitalNominal);
  });

  it('D trägt die Wechselgebühr und verliert die Beitragsgarantie', () => {
    const o = mitOptionen({}, { garantiertesKapitalZuRentenbeginn: 60000 }).handlungsoptionen!;
    const d = o.find((x) => x.id === 'D')!;
    expect(d.einmalkosten).toBe(150);
    expect(d.garantiertMindestens).toBe(0);
    expect(o.find((x) => x.id === 'A')!.garantiertMindestens).toBe(60000);
    expect(d.fruehesterZugriffAlter).toBe(65); // AVD frühestens 65
  });

  it('nur A ist umkehrbar', () => {
    const o = mitOptionen().handlungsoptionen!;
    expect(o.filter((x) => x.umkehrbar).map((x) => x.id)).toEqual(['A']);
  });

  it('Garantie greift als Untergrenze bei A/B/C', () => {
    const o = mitOptionen(
      { renditeBruttoPaJahr: 0.07 },
      { garantiertesKapitalZuRentenbeginn: 500000 }
    ).handlungsoptionen!;
    for (const id of ['A', 'B']) {
      expect(o.find((x) => x.id === id)!.endkapitalNominal).toBeGreaterThanOrEqual(500000);
    }
    // D kennt keine Garantie
    expect(o.find((x) => x.id === 'D')!.endkapitalNominal).toBeLessThan(500000);
  });

  it('teurer Altvertrag mit langer Restlaufzeit: D schlägt B', () => {
    const o = mitOptionen({ geburtsjahr: 1997 }).handlungsoptionen!; // 30 Jahre alt
    const b = o.find((x) => x.id === 'B')!;
    const d = o.find((x) => x.id === 'D')!;
    expect(d.endkapitalNachSteuer).toBeGreaterThan(b.endkapitalNachSteuer);
    expect(besteOption(o).id).toBe('D');
  });

  it('günstiger Altvertrag mit guter Rendite: B schlägt D', () => {
    const o = mitOptionen({
      riester: {
        beitragspflEinnahmenVorjahr: 45000,
        kinderGeborenVor2008: 0,
        effektivkostenPaJahr: 0.003,
        renditeBruttoPaJahr: 0.07,
      },
    }).handlungsoptionen!;
    const b = o.find((x) => x.id === 'B')!;
    const d = o.find((x) => x.id === 'D')!;
    expect(b.endkapitalNachSteuer).toBeGreaterThan(d.endkapitalNachSteuer);
  });

  it('C summiert ruhenden Altvertrag und neues AVD', () => {
    const o = mitOptionen().handlungsoptionen!;
    const c = o.find((x) => x.id === 'C')!;
    // Beiträge fließen nur ins neue AVD
    expect(c.summeEigenbeitraege).toBeCloseTo(
      o.find((x) => x.id === 'D')!.summeEigenbeitraege,
      6
    );
    expect(c.endkapitalNominal).toBeGreaterThan(0);
  });

  it('laufende Kosten eines ruhenden Vertrags mindern Option C', () => {
    const ohne = mitOptionen().handlungsoptionen!.find((x) => x.id === 'C')!;
    const mit = mitOptionen({}, { ruhendStellenKostenProJahr: 200 })
      .handlungsoptionen!.find((x) => x.id === 'C')!;
    expect(mit.endkapitalNominal).toBeLessThan(ohne.endkapitalNominal);
  });

  it('Zillmerungsverlust ist sunk cost, kein Wechselargument', () => {
    expect(zillmerungsverlust(bestand)).toBe(4000);
    expect(zillmerungsverlust({ ...bestand, aktuellerVertragswert: 30000 })).toBe(0);
  });

  it('ohne Bestandsvertragsdaten gibt es keine Optionsmatrix', () => {
    expect(simuliereAvd(eingabe()).handlungsoptionen).toBeUndefined();
    expect(
      simuliereAvd(
        eingabe({
          vergleichspartner: 'riester_alt',
          riester: {
            beitragspflEinnahmenVorjahr: 45000,
            kinderGeborenVor2008: 0,
            effektivkostenPaJahr: 0.02,
            renditeBruttoPaJahr: 0.03,
          },
        })
      ).handlungsoptionen
    ).toBeUndefined();
  });

  it('warnt bei fehlendem Vertragswert und frühem Zugriff des Altvertrags', () => {
    const r = mitOptionen({}, { aktuellerVertragswert: 0 });
    expect(r.hinweise.some((h) => h.text.includes('Standmitteilung'))).toBe(true);
    expect(r.hinweise.some((h) => h.text.includes('Optionen C und D'))).toBe(true);
  });
});
