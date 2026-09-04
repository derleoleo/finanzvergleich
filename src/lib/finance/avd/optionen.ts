// src/lib/finance/avd/optionen.ts
// Die vier Handlungsoptionen bei einem bestehenden Riester-Vertrag.
//
// Kernidee der Wechselentscheidung: Förderregime und Produktmantel sind
// UNABHÄNGIG wählbar. Genau daraus ergeben sich vier Optionen:
//
//   A  Altvertrag unverändert        Förderung alt   Mantel Riester
//   B  nur Fördersystematik wechseln Förderung neu   Mantel Riester
//   C  Altvertrag ruhend + neues AVD Förderung neu   beides parallel
//   D  Kapital ins AVD übertragen    Förderung neu   Mantel AVD
//
// Rechtsgrundlagen: § 52 Abs. 50a S. 1 EStG (Bestandsschutz), S. 4
// (unwiderrufliche Erklärung), § 1 Abs. 1 Nr. 10a/10b AltZertG (ruhend
// stellen / übertragen), § 3 Nr. 55c EStG (steuerneutrale Übertragung).
//
// Option B ist die am meisten unterschätzte: Sie kostet nichts, ändert das
// Produkt nicht, lässt Garantien unangetastet und hebt trotzdem die Förderung.

import { calculateMonthlyReturn } from '@/components/shared/TaxCalculations';
import { berechneZulagen, berechneZulagenRiesterAlt, guenstigerpruefung } from './zulagen';
import { steuerentlastung, type SteuerZuschlaege } from './tarif';
import { GESETZ } from './config';

export type OptionId = 'A' | 'B' | 'C' | 'D';

export type BestandsvertragEingabe = {
  /** Aktueller Vertragswert = Übertragungswert laut Standmitteilung. */
  aktuellerVertragswert: number;
  /** Bisher gezahlte Eigenbeiträge + Zulagen (für den Ausweis des Zillmerungsverlusts). */
  summeBeitraegeUndZulagenBisher: number;
  /** Garantiertes Kapital zu Rentenbeginn laut Standmitteilung (0 = unbekannt). */
  garantiertesKapitalZuRentenbeginn: number;
  /** Gebühr des abgebenden Anbieters, § 1 Abs. 1 S. 3 AltZertG: max. 150 €. */
  wechselgebuehr: number;
  /** Laufende Kosten eines beitragsfrei gestellten Altvertrags (€/Jahr). */
  ruhendStellenKostenProJahr: number;
  /** Frühester Auszahlungsbeginn des Altvertrags: 60 (Abschluss bis 2011) oder 62. */
  fruehesterZugriffAlter: number;
};

export type OptionsErgebnis = {
  id: OptionId;
  bezeichnung: string;
  kurzbeschreibung: string;
  foerderregime: 'alt' | 'neu';
  summeEigenbeitraege: number;
  summeFoerderung: number;
  endkapitalNominal: number;
  endkapitalNachSteuer: number;
  /** Einmalige Kosten zum Wechselzeitpunkt (Gebühren). */
  einmalkosten: number;
  /** Garantiertes Mindestkapital zu Rentenbeginn; 0, wenn keine Garantie besteht. */
  garantiertMindestens: number;
  fruehesterZugriffAlter: number;
  umkehrbar: boolean;
  kapitalProJahr: number[];
};

type Gemeinsam = {
  jahre: number;
  eigenbeitragMonatlichStart: number;
  beitragsdynamikPaJahr: number;
  kinderGesamt: number;
  kinderGeborenVor2008: number;
  alterBeiStart: number;
  zvEJahr: number;
  splitting: boolean;
  zuschlaege: SteuerZuschlaege;
  steuersatzImAlter: number;
  zulagenZuflussVerzoegerungJahre: 0 | 1 | 2;
  erstattungReinvestieren: boolean;
  /** Altvertrag: Rendite und Kosten (garantiebedingt meist niedriger). */
  altRenditePaJahr: number;
  altKostenPaJahr: number;
  /** AVD: Rendite und Kosten. */
  avdRenditePaJahr: number;
  avdKostenPaJahr: number;
  bestand: BestandsvertragEingabe;
};

/**
 * Fortschreibung eines Vertrags über die Restlaufzeit.
 * `foerderregime` steuert die Zulagenberechnung, `startkapital` das
 * übertragene bzw. bereits vorhandene Kapital.
 */
function schreibeFort(
  g: Gemeinsam,
  opts: {
    foerderregime: 'alt' | 'neu';
    startkapital: number;
    renditePaJahr: number;
    kostenPaJahr: number;
    /** false = beitragsfrei gestellt, es fließen keine neuen Beiträge. */
    beitraegeFliessen: boolean;
    fixkostenProJahr?: number;
  }
): {
  endkapital: number;
  summeEigen: number;
  summeFoerderung: number;
  kapitalProJahr: number[];
} {
  const jahre = Math.max(1, Math.round(g.jahre));
  const rMonat = calculateMonthlyReturn(
    ((opts.renditePaJahr || 0) - (opts.kostenPaJahr || 0)) * 100
  );
  const kinderVor2008 = Math.max(0, Math.min(g.kinderGeborenVor2008, g.kinderGesamt));
  const kinderAb2008 = Math.max(0, g.kinderGesamt - kinderVor2008);

  let kapital = Math.max(0, opts.startkapital);
  let beitragMonatlich = opts.beitraegeFliessen
    ? Math.max(0, g.eigenbeitragMonatlichStart)
    : 0;
  let summeEigen = 0;
  let summeFoerderung = 0;
  const zulagenEingang: number[] = new Array(jahre + 3).fill(0);
  const kapitalProJahr: number[] = [];

  for (let t = 0; t < jahre; t++) {
    if (t > 0 && opts.beitraegeFliessen) {
      beitragMonatlich *= 1 + (g.beitragsdynamikPaJahr || 0);
    }
    const eigenbeitrag = beitragMonatlich * 12;

    let zulage = 0;
    let erstattung = 0;
    if (eigenbeitrag > 0) {
      if (opts.foerderregime === 'alt') {
        const z = berechneZulagenRiesterAlt({
          eigenbeitrag,
          beitragspflEinnahmenVorjahr: g.zvEJahr,
          kinderGeborenAb2008: kinderAb2008,
          kinderGeborenVor2008: kinderVor2008,
          alterZuBeitragsjahresbeginn: g.alterBeiStart + t,
          bebBereitsGenutzt: t > 0,
        });
        zulage = z.zulage;
        erstattung = Math.max(
          0,
          steuerentlastung(g.zvEJahr, z.sonderausgabenVolumen, g.splitting, g.zuschlaege) -
            z.zulage
        );
      } else {
        const z = berechneZulagen({
          eigenbeitrag,
          kinder: g.kinderGesamt,
          alterZuBeitragsjahresbeginn: g.alterBeiStart + t,
          bebBereitsGenutzt: t > 0,
        });
        const gp = guenstigerpruefung({
          eigenbeitrag,
          zulageGesamt: z.zulageGesamt,
          zulageOhneKinder: z.grundzulage + z.berufseinsteigerbonus,
          zvE: g.zvEJahr,
          splitting: g.splitting,
          zuschlaege: g.zuschlaege,
        });
        zulage = z.zulageGesamt;
        erstattung = gp.zusaetzlicheErstattung;
      }
    }

    const zielJahr = t + (g.zulagenZuflussVerzoegerungJahre ?? 1);
    if (zielJahr < zulagenEingang.length) zulagenEingang[zielJahr] += zulage;

    kapital += zulagenEingang[t];
    if (g.erstattungReinvestieren) kapital += erstattung;

    for (let m = 1; m <= 12; m++) {
      kapital = kapital * (1 + rMonat) + eigenbeitrag / 12;
    }
    if (opts.fixkostenProJahr && opts.fixkostenProJahr > 0) {
      kapital = Math.max(0, kapital - opts.fixkostenProJahr);
    }

    summeEigen += eigenbeitrag;
    summeFoerderung += zulage + erstattung;
    kapitalProJahr.push(kapital);
  }

  for (let t = jahre; t < zulagenEingang.length; t++) kapital += zulagenEingang[t];

  return { endkapital: kapital, summeEigen, summeFoerderung, kapitalProJahr };
}

/**
 * Berechnet alle vier Handlungsoptionen über dieselbe Restlaufzeit.
 * Alle Endkapitalien sind nach nachgelagerter Besteuerung vergleichbar,
 * weil beide Produktwelten identisch besteuert werden (§ 22 Nr. 5 EStG).
 */
export function berechneHandlungsoptionen(g: Gemeinsam): OptionsErgebnis[] {
  const s = Math.max(0, g.steuersatzImAlter || 0);
  const b = g.bestand;
  const nachSteuer = (k: number) => k * (1 - s);
  const garantie = Math.max(0, b.garantiertesKapitalZuRentenbeginn || 0);

  // A – alles bleibt, alte Förderung
  const a = schreibeFort(g, {
    foerderregime: 'alt',
    startkapital: b.aktuellerVertragswert,
    renditePaJahr: g.altRenditePaJahr,
    kostenPaJahr: g.altKostenPaJahr,
    beitraegeFliessen: true,
  });

  // B – gleiches Produkt, neue Förderung. Kein Übertragungsverlust,
  // keine Gebühr, Garantien bleiben (§ 52 Abs. 50a S. 4).
  const bOpt = schreibeFort(g, {
    foerderregime: 'neu',
    startkapital: b.aktuellerVertragswert,
    renditePaJahr: g.altRenditePaJahr,
    kostenPaJahr: g.altKostenPaJahr,
    beitraegeFliessen: true,
  });

  // C – Altvertrag beitragsfrei weiterlaufen lassen, Beiträge ins neue AVD
  const cRuhend = schreibeFort(g, {
    foerderregime: 'neu',
    startkapital: b.aktuellerVertragswert,
    renditePaJahr: g.altRenditePaJahr,
    kostenPaJahr: g.altKostenPaJahr,
    beitraegeFliessen: false,
    fixkostenProJahr: b.ruhendStellenKostenProJahr,
  });
  const cNeu = schreibeFort(g, {
    foerderregime: 'neu',
    startkapital: 0,
    renditePaJahr: g.avdRenditePaJahr,
    kostenPaJahr: g.avdKostenPaJahr,
    beitraegeFliessen: true,
  });

  // D – Übertragung ins AVD. Steuerneutral (§ 3 Nr. 55c EStG), aber die
  // Beitragsgarantie des Altvertrags entfällt ersatzlos.
  const uebertragen = Math.max(0, b.aktuellerVertragswert - b.wechselgebuehr);
  const d = schreibeFort(g, {
    foerderregime: 'neu',
    startkapital: uebertragen,
    renditePaJahr: g.avdRenditePaJahr,
    kostenPaJahr: g.avdKostenPaJahr,
    beitraegeFliessen: true,
  });

  const avdZugriff = GESETZ.AUSZAHLUNG_ALTER_MIN;

  return [
    {
      id: 'A',
      bezeichnung: 'Unverändert weiterführen',
      kurzbeschreibung: 'Alte Förderung, Altvertrag bleibt wie er ist.',
      foerderregime: 'alt',
      summeEigenbeitraege: a.summeEigen,
      summeFoerderung: a.summeFoerderung,
      endkapitalNominal: Math.max(a.endkapital, garantie),
      endkapitalNachSteuer: nachSteuer(Math.max(a.endkapital, garantie)),
      einmalkosten: 0,
      garantiertMindestens: garantie,
      fruehesterZugriffAlter: b.fruehesterZugriffAlter,
      umkehrbar: true,
      kapitalProJahr: a.kapitalProJahr,
    },
    {
      id: 'B',
      bezeichnung: 'Nur Förderung wechseln',
      kurzbeschreibung:
        'Altvertrag bleibt samt Garantien, es gilt die neue Fördersystematik. Kostet nichts.',
      foerderregime: 'neu',
      summeEigenbeitraege: bOpt.summeEigen,
      summeFoerderung: bOpt.summeFoerderung,
      endkapitalNominal: Math.max(bOpt.endkapital, garantie),
      endkapitalNachSteuer: nachSteuer(Math.max(bOpt.endkapital, garantie)),
      einmalkosten: 0,
      garantiertMindestens: garantie,
      fruehesterZugriffAlter: b.fruehesterZugriffAlter,
      umkehrbar: false,
      kapitalProJahr: bOpt.kapitalProJahr,
    },
    {
      id: 'C',
      bezeichnung: 'Ruhen lassen + neues AVD',
      kurzbeschreibung:
        'Altvertrag beitragsfrei stellen, neue Beiträge fließen ins Altersvorsorgedepot.',
      foerderregime: 'neu',
      summeEigenbeitraege: cNeu.summeEigen,
      summeFoerderung: cNeu.summeFoerderung,
      endkapitalNominal: Math.max(cRuhend.endkapital, garantie) + cNeu.endkapital,
      endkapitalNachSteuer: nachSteuer(
        Math.max(cRuhend.endkapital, garantie) + cNeu.endkapital
      ),
      einmalkosten: 0,
      garantiertMindestens: garantie,
      fruehesterZugriffAlter: Math.min(b.fruehesterZugriffAlter, avdZugriff),
      umkehrbar: false,
      kapitalProJahr: cRuhend.kapitalProJahr.map(
        (k, i) => k + (cNeu.kapitalProJahr[i] ?? 0)
      ),
    },
    {
      id: 'D',
      bezeichnung: 'Ins AVD übertragen',
      kurzbeschreibung:
        'Kapital steuerneutral übertragen. Höhere Renditechance, aber die Beitragsgarantie entfällt.',
      foerderregime: 'neu',
      summeEigenbeitraege: d.summeEigen,
      summeFoerderung: d.summeFoerderung,
      endkapitalNominal: d.endkapital,
      endkapitalNachSteuer: nachSteuer(d.endkapital),
      einmalkosten: b.wechselgebuehr,
      garantiertMindestens: 0, // AVD kennt keine Beitragsgarantie
      fruehesterZugriffAlter: avdZugriff,
      umkehrbar: false,
      kapitalProJahr: d.kapitalProJahr,
    },
  ];
}

/**
 * Bereits eingetretener Zillmerungsverlust: Der Übertragungswert liegt bei
 * gezillmerten Versicherungsverträgen regelmäßig unter der Summe aus
 * Beiträgen und Zulagen. Wichtig: Dieser Verlust ist gegenüber ALLEN vier
 * Optionen bereits eingetreten (sunk cost) – er ist kein Argument gegen
 * einen Wechsel, wohl aber ein Indikator für die Qualität des Altvertrags.
 * Was bei einer Übertragung tatsächlich verloren geht, ist die
 * Beitragsgarantie zu Rentenbeginn plus die Wechselgebühr.
 */
export function zillmerungsverlust(b: BestandsvertragEingabe): number {
  return Math.max(
    0,
    (b.summeBeitraegeUndZulagenBisher || 0) - (b.aktuellerVertragswert || 0)
  );
}

/** Die beste Option nach Endkapital nach Steuern. */
export function besteOption(optionen: OptionsErgebnis[]): OptionsErgebnis {
  return optionen.reduce((best, o) =>
    o.endkapitalNachSteuer > best.endkapitalNachSteuer ? o : best
  );
}
