// src/lib/finance/avd/riester.ts
// Vergleichsrechnung Altersvorsorgedepot gegen einen Riester-Bestandsvertrag
// (Förderregime "alt", §§ 10a, 84, 85, 86 EStG in der bis 31.12.2026
// geltenden Fassung, § 52 Abs. 50a S. 1 EStG).
//
// Fachlicher Kern: Steuerlich ändert sich beim Wechsel NICHTS – beide Seiten
// werden in der Auszahlphase voll nachgelagert besteuert (§ 22 Nr. 5 S. 1),
// beide haben keine Teilfreistellung, beide sind in der Ansparphase steuerfrei.
// Der Unterschied liegt allein in (1) der Förderhöhe, (2) den Produktkosten
// und (3) dem Renditepotenzial (Beitragsgarantie begrenzt die Aktienquote).

import { calculateMonthlyReturn } from '@/components/shared/TaxCalculations';
import { berechneZulagenRiesterAlt, RIESTER_ALT } from './zulagen';
import { steuerentlastung, type SteuerZuschlaege } from './tarif';

export type RiesterAltEingabeVergleich = {
  /** Beitragspflichtige Einnahmen des Vorjahres – Basis des Mindesteigenbeitrags (§ 86 a.F.). */
  beitragspflEinnahmenVorjahr: number;
  /** Kinder, die vor dem 01.01.2008 geboren sind – nur 185 € statt 300 € Zulage. */
  kinderGeborenVor2008: number;
  /** Effektivkosten des Altvertrags p.a. (Versicherungsmantel typisch 1,5–2,5 %). */
  effektivkostenPaJahr: number;
  /** Rendite des Altvertrags p.a. – garantiebedingt meist niedriger als im Depot. */
  renditeBruttoPaJahr: number;
};

export type RiesterAltErgebnis = {
  summeEigenbeitraege: number;
  summeZulagen: number;
  summeSteuererstattung: number;
  summeFoerderung: number;
  foerderquoteGesamt: number;
  /** Zulagenanspruch und Mindesteigenbeitrag des ersten Jahres (für die Anzeige). */
  zulagenanspruchJahr1: number;
  mindesteigenbeitragJahr1: number;
  zulageJahr1: number;
  /** true, wenn der Eigenbeitrag den Mindesteigenbeitrag unterschreitet → anteilige Kürzung. */
  gekuerztJahr1: boolean;
  endkapitalNominal: number;
  endkapitalNachSteuer: number;
  kapitalProJahr: number[];
};

/**
 * Ansparphase eines Riester-Bestandsvertrags über denselben Zeitraum und mit
 * demselben Eigenbeitrag wie das AVD. Anders als neu gilt:
 * - starre Grundzulage 175 €, Kinderzulage 300 € (ab 2008) bzw. 185 € (davor)
 * - Mindesteigenbeitrag 4 % der Vorjahreseinnahmen, gedeckelt bei 2.100 €,
 *   abzüglich Zulagenanspruch, mindestens Sockelbetrag 60 €
 * - bei Unterschreiten anteilige Kürzung der Zulage (keine harte Schwelle)
 * - Sonderausgaben-Höchstbetrag 2.100 € INKLUSIVE Zulagen
 */
export function simuliereRiesterAlt(args: {
  jahre: number;
  eigenbeitragMonatlichStart: number;
  beitragsdynamikPaJahr: number;
  kinderGesamt: number;
  alterBeiStart: number;
  zvEJahr: number;
  splitting: boolean;
  zuschlaege: SteuerZuschlaege;
  steuersatzImAlter: number;
  fixkostenProJahr: number;
  zulagenZuflussVerzoegerungJahre: 0 | 1 | 2;
  erstattungReinvestieren: boolean;
  riester: RiesterAltEingabeVergleich;
}): RiesterAltErgebnis {
  const r = args.riester;
  const jahre = Math.max(1, Math.round(args.jahre));
  const kinderVor2008 = Math.max(
    0,
    Math.min(Math.floor(r.kinderGeborenVor2008 || 0), args.kinderGesamt)
  );
  const kinderAb2008 = Math.max(0, args.kinderGesamt - kinderVor2008);

  const rMonat = calculateMonthlyReturn(
    ((r.renditeBruttoPaJahr || 0) - (r.effektivkostenPaJahr || 0)) * 100
  );

  let kapital = 0;
  let beitragMonatlich = Math.max(0, args.eigenbeitragMonatlichStart || 0);
  let summeEigen = 0;
  let summeZulagen = 0;
  let summeErstattung = 0;
  const zulagenEingang: number[] = new Array(jahre + 3).fill(0);
  const kapitalProJahr: number[] = [];

  let zulagenanspruchJahr1 = 0;
  let mindesteigenbeitragJahr1 = 0;
  let zulageJahr1 = 0;
  let gekuerztJahr1 = false;

  for (let t = 0; t < jahre; t++) {
    if (t > 0) beitragMonatlich *= 1 + (args.beitragsdynamikPaJahr || 0);
    const eigenbeitrag = beitragMonatlich * 12;

    const z = berechneZulagenRiesterAlt({
      eigenbeitrag,
      beitragspflEinnahmenVorjahr: r.beitragspflEinnahmenVorjahr,
      kinderGeborenAb2008: kinderAb2008,
      kinderGeborenVor2008: kinderVor2008,
      alterZuBeitragsjahresbeginn: args.alterBeiStart + t,
      bebBereitsGenutzt: t > 0,
    });

    // Günstigerprüfung wie im neuen Recht (§ 10a Abs. 2), nur mit dem
    // alten Höchstbetrag von 2.100 € inklusive Zulagen
    const entlastung = steuerentlastung(
      args.zvEJahr,
      z.sonderausgabenVolumen,
      args.splitting,
      args.zuschlaege
    );
    const erstattung = Math.max(0, entlastung - z.zulage);

    if (t === 0) {
      zulagenanspruchJahr1 = z.zulagenanspruch;
      mindesteigenbeitragJahr1 = z.mindesteigenbeitrag;
      zulageJahr1 = z.zulage;
      gekuerztJahr1 = z.zulage < z.zulagenanspruch - 0.005;
    }

    const zielJahr = t + (args.zulagenZuflussVerzoegerungJahre ?? 1);
    if (zielJahr < zulagenEingang.length) zulagenEingang[zielJahr] += z.zulage;

    kapital += zulagenEingang[t];
    if (args.erstattungReinvestieren) kapital += erstattung;

    for (let m = 1; m <= 12; m++) {
      kapital = kapital * (1 + rMonat) + eigenbeitrag / 12;
    }
    if (args.fixkostenProJahr > 0) {
      kapital = Math.max(0, kapital - args.fixkostenProJahr);
    }

    summeEigen += eigenbeitrag;
    summeZulagen += z.zulage;
    summeErstattung += erstattung;
    kapitalProJahr.push(kapital);
  }

  for (let t = jahre; t < zulagenEingang.length; t++) kapital += zulagenEingang[t];

  const summeFoerderung = summeZulagen + summeErstattung;
  // Identische Besteuerung wie beim AVD: 100 % nachgelagert (§ 22 Nr. 5 S. 1).
  // Riester-Altverträge kennen keinen ungeförderten Teil in diesem Sinne –
  // die Förderung ist über den Mindesteigenbeitrag gedeckelt, der Rest bleibt
  // gefördertes Altersvorsorgevermögen.
  const s = Math.max(0, args.steuersatzImAlter || 0);

  return {
    summeEigenbeitraege: summeEigen,
    summeZulagen,
    summeSteuererstattung: summeErstattung,
    summeFoerderung,
    foerderquoteGesamt: summeEigen > 0 ? summeFoerderung / summeEigen : 0,
    zulagenanspruchJahr1,
    mindesteigenbeitragJahr1,
    zulageJahr1,
    gekuerztJahr1,
    endkapitalNominal: kapital,
    endkapitalNachSteuer: kapital * (1 - s),
    kapitalProJahr,
  };
}

/**
 * Schwelle, unterhalb derer der Sockelbetrag von 60 € die volle alte Zulage
 * auslöst: E ≤ 25 × (Zulagenanspruch + 60). In diesem Bereich kann die alte
 * Förderung höher sein als die neue – der einzige Fall, in dem ein Wechsel
 * der Fördersystematik schadet.
 */
export function sockelbetragsSchwelle(kinderAb2008: number, kinderVor2008: number): number {
  const anspruch =
    RIESTER_ALT.GRUNDZULAGE +
    RIESTER_ALT.KZ_AB_2008 * Math.max(0, kinderAb2008) +
    RIESTER_ALT.KZ_VOR_2008 * Math.max(0, kinderVor2008);
  return 25 * (anspruch + RIESTER_ALT.SOCKELBETRAG);
}
