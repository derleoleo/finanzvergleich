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
import {
  berechneZulagen,
  berechneZulagenRiesterAlt,
  guenstigerpruefung,
  kinderKohortenImJahr,
  RIESTER_ALT,
  type Berechtigung,
} from './zulagen';
import { steuerentlastung, type SteuerZuschlaege } from './tarif';
import type { RechtsFlags } from './config';

export type RiesterAltEingabeVergleich = {
  /** Beitragspflichtige Einnahmen des Vorjahres – Basis des Mindesteigenbeitrags (§ 86 a.F.). */
  beitragspflEinnahmenVorjahr: number;
  /** Kinder, die vor dem 01.01.2008 geboren sind – nur 185 € statt 300 € Zulage. */
  kinderGeborenVor2008: number;
  /** Effektivkosten des Altvertrags p.a. (Versicherungsmantel typisch 1,5–2,5 %). */
  effektivkostenPaJahr: number;
  /** Rendite des Altvertrags p.a. – garantiebedingt meist niedriger als im Depot. */
  renditeBruttoPaJahr: number;
  /**
   * Nach welcher Fördersystematik der Bestandsvertrag rechnet.
   *
   * Ein Bestandsvertrag kann die Systematik wechseln, ohne das Produkt zu
   * wechseln (§ 52 Abs. 50a S. 4 EStG) – das ist Option B der Wechselanalyse
   * und die am häufigsten übersehene Möglichkeit: Sie kostet nichts, lässt
   * Garantien unangetastet und hebt trotzdem die Förderung.
   *
   * Vorgabe `'alt'`: Ohne ausdrückliche Erklärung bleibt es beim
   * Bestandsschutz (§ 52 Abs. 50a S. 1). Damit rechnen auch alle vor dieser
   * Erweiterung gespeicherten Fälle unverändert weiter.
   */
  foerderregime?: 'alt' | 'neu';
};

export type RiesterAltErgebnis = {
  /** Nach welcher Systematik gerechnet wurde – gehört in jede Anzeige. */
  foerderregime: 'alt' | 'neu';
  summeEigenbeitraege: number;
  summeZulagen: number;
  summeSteuererstattung: number;
  summeFoerderung: number;
  foerderquoteGesamt: number;
  /** Zulagenanspruch und Mindesteigenbeitrag des ersten Jahres (für die Anzeige). */
  zulagenanspruchJahr1: number;
  /**
   * Mindesteigenbeitrag des ersten Jahres.
   *
   * Nur im alten Recht eine Größe (§ 86 Abs. 1 a.F.). Unter `'neu'` steht
   * hier 0 – nicht der alte Wert, der dort nichts bedeuten würde.
   */
  mindesteigenbeitragJahr1: number;
  zulageJahr1: number;
  /**
   * true, wenn der Eigenbeitrag den Mindesteigenbeitrag unterschreitet →
   * anteilige Kürzung. Unter `'neu'` immer false: Die neue Staffel kennt
   * keine Kürzung, nur einen harten Mindestbeitrag.
   */
  gekuerztJahr1: boolean;
  endkapitalNominal: number;
  endkapitalNachSteuer: number;
  kapitalProJahr: number[];
  /**
   * Bis zum Ende des jeweiligen Jahres erhaltene Foerderung (Zulagen und
   * Steuererstattung). Genau dieser Betrag ist im Todesfall zurueckzuzahlen,
   * wenn das Kapital nicht auf einen Vertrag des Ehegatten geht
   * (§ 93 Abs. 1 EStG).
   */
  foerderungKumuliertProJahr: number[];
  /** Bis zum Ende des Jahres eingezahlte Eigenbeitraege - Grundlage der Ertragsbesteuerung. */
  eigenbeitraegeKumuliertProJahr: number[];
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
  /** Erstes Beitragsjahr als Kalenderjahr - nur fuer das Ende des Kindergelds. */
  beitragsjahrStart: number;
  /** Letztes Jahr mit Kindergeld, je Kind (Audit C01). */
  kinderKindergeldBisJahr?: number[];
  alterBeiStart: number;
  zvEJahr: number;
  splitting: boolean;
  zuschlaege: SteuerZuschlaege;
  steuersatzImAlter: number;
  fixkostenProJahr: number;
  zulagenZuflussVerzoegerungJahre: 0 | 1 | 2;
  erstattungReinvestieren: boolean;
  /**
   * Förderberechtigung, Ehegattenbeitrag und Rechtsannahmen.
   *
   * Der alte Zweig braucht sie nicht, der neue sehr wohl. In `optionen.ts`
   * fehlen sie im Neu-Zweig – dort rechnet die Fördersystematik immer
   * „unmittelbar" mit Standardannahmen. Dieser Fehler wird hier nicht
   * mitkopiert.
   */
  berechtigung?: Berechtigung;
  eigenbeitragEhegatteUnmittelbar?: number;
  ehegatteMittelbarBerechtigt?: boolean;
  flags?: RechtsFlags;
  riester: RiesterAltEingabeVergleich;
}): RiesterAltErgebnis {
  const r = args.riester;
  const regime = r.foerderregime ?? 'alt';
  const jahre = Math.max(1, Math.round(args.jahre));

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
  const foerderungKumuliertProJahr: number[] = [];
  const eigenbeitraegeKumuliertProJahr: number[] = [];

  let zulagenanspruchJahr1 = 0;
  let mindesteigenbeitragJahr1 = 0;
  let zulageJahr1 = 0;
  let gekuerztJahr1 = false;

  for (let t = 0; t < jahre; t++) {
    if (t > 0) beitragMonatlich *= 1 + (args.beitragsdynamikPaJahr || 0);
    const eigenbeitrag = beitragMonatlich * 12;

    // Die Kinderzulage endet mit dem Kindergeld, auch im alten Recht (C01).
    const kinder = kinderKohortenImJahr(
      args.kinderGesamt,
      r.kinderGeborenVor2008,
      args.kinderKindergeldBisJahr,
      args.beitragsjahrStart + t
    );

    let zulage: number;
    let erstattung: number;

    if (regime === 'alt') {
      const z = berechneZulagenRiesterAlt({
        eigenbeitrag,
        beitragspflEinnahmenVorjahr: r.beitragspflEinnahmenVorjahr,
        kinderGeborenAb2008: kinder.ab2008,
        kinderGeborenVor2008: kinder.vor2008,
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
      zulage = z.zulage;
      erstattung = Math.max(0, entlastung - z.zulage);

      if (t === 0) {
        zulagenanspruchJahr1 = z.zulagenanspruch;
        mindesteigenbeitragJahr1 = z.mindesteigenbeitrag;
        zulageJahr1 = z.zulage;
        gekuerztJahr1 = z.zulage < z.zulagenanspruch - 0.005;
      }
    } else {
      /*
       * Fördersystematik gewechselt, Vertrag behalten (§ 52 Abs. 50a S. 4).
       * Gerechnet wird wie beim Altersvorsorgedepot - gestaffelte
       * Grundzulage, Kinderzulage ohne Jahrgangsunterschied, Höchstbetrag
       * 1.800 € zuzüglich Zulage. Nur Kosten und Rendite bleiben die des
       * Altvertrags; genau das ist der Witz dieser Option.
       */
      const z = berechneZulagen({
        eigenbeitrag,
        kinder: kinder.ab2008 + kinder.vor2008,
        alterZuBeitragsjahresbeginn: args.alterBeiStart + t,
        bebBereitsGenutzt: t > 0,
        berechtigung: args.berechtigung,
        eigenbeitragEhegatteUnmittelbar: args.eigenbeitragEhegatteUnmittelbar,
        flags: args.flags,
      });
      const g = guenstigerpruefung({
        eigenbeitrag,
        zulageGesamt: z.zulageGesamt,
        berechtigung: args.berechtigung,
        zvE: args.zvEJahr,
        splitting: args.splitting,
        ehegatteMittelbarBerechtigt: args.ehegatteMittelbarBerechtigt,
        zuschlaege: args.zuschlaege,
        flags: args.flags,
      });
      zulage = z.zulageGesamt;
      erstattung = g.zusaetzlicheErstattung;

      if (t === 0) {
        zulagenanspruchJahr1 = z.zulageGesamt;
        // Es gibt im neuen Recht keinen Mindesteigenbeitrag in diesem Sinn
        // und keine anteilige Kuerzung - hier stehen deshalb keine Werte
        // aus dem alten Recht.
        mindesteigenbeitragJahr1 = 0;
        zulageJahr1 = z.zulageGesamt;
        gekuerztJahr1 = false;
      }
    }

    const zielJahr = t + (args.zulagenZuflussVerzoegerungJahre ?? 1);
    if (zielJahr < zulagenEingang.length) zulagenEingang[zielJahr] += zulage;

    kapital += zulagenEingang[t];
    if (args.erstattungReinvestieren) kapital += erstattung;

    for (let m = 1; m <= 12; m++) {
      kapital = kapital * (1 + rMonat) + eigenbeitrag / 12;
    }
    if (args.fixkostenProJahr > 0) {
      kapital = Math.max(0, kapital - args.fixkostenProJahr);
    }

    summeEigen += eigenbeitrag;
    summeZulagen += zulage;
    summeErstattung += erstattung;
    kapitalProJahr.push(kapital);
    foerderungKumuliertProJahr.push(summeZulagen + summeErstattung);
    eigenbeitraegeKumuliertProJahr.push(summeEigen);
  }

  for (let t = jahre; t < zulagenEingang.length; t++) kapital += zulagenEingang[t];

  const summeFoerderung = summeZulagen + summeErstattung;
  // Identische Besteuerung wie beim AVD: 100 % nachgelagert (§ 22 Nr. 5 S. 1).
  // Riester-Altverträge kennen keinen ungeförderten Teil in diesem Sinne –
  // die Förderung ist über den Mindesteigenbeitrag gedeckelt, der Rest bleibt
  // gefördertes Altersvorsorgevermögen.
  const s = Math.max(0, args.steuersatzImAlter || 0);

  return {
    foerderregime: regime,
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
    foerderungKumuliertProJahr,
    eigenbeitraegeKumuliertProJahr,
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
