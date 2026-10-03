// src/lib/finance/avd/simulation.ts
// Anspar- und Auszahlphase des Altersvorsorgedepots plus Vergleichsrechnung
// gegen ein freies ETF-Depot.
//
// Zentrale Modellregeln:
// - Gefördertes und ungefördertes Kapital werden über die gesamte Ansparphase
//   GETRENNT geführt (inkl. anteiliger Erträge). Ohne diese Trennung ist die
//   Auszahlbesteuerung nicht darstellbar (§ 22 Nr. 5 EStG).
// - In der Ansparphase gibt es KEINE laufende Besteuerung: keine
//   Abgeltungsteuer, keine Vorabpauschale, keine Steuer bei Fondswechsel.
// - Zulagen fließen verzögert zu (Dauerzulageantrag, Gutschrift der ZfA
//   regelmäßig im Folgejahr) und werden erst ab dann verzinst.
// - Die Steuererstattung aus der Günstigerprüfung fließt dem Sparer zu und
//   wird nur bei ausdrücklicher Option mit angelegt.

import { calculateMonthlyReturn } from '@/components/shared/TaxCalculations';
import {
  ANNAHMEN,
  DEPOT_STEUER,
  GESETZ,
  RECHTS_FLAGS_DEFAULT,
  basiszinsFuer,
  ertragsanteilFuer,
  type RechtsFlags,
} from './config';
import { berechneZulagen, guenstigerpruefung, type Berechtigung } from './zulagen';
import {
  simuliereRiesterAlt,
  sockelbetragsSchwelle,
  type RiesterAltEingabeVergleich,
  type RiesterAltErgebnis,
} from './riester';
import {
  berechneHandlungsoptionen,
  type BestandsvertragEingabe,
  type OptionsErgebnis,
} from './optionen';
import { simuliereFondsLv, type FondsLvErgebnis } from './fondslv';
import type { SteuerZuschlaege } from './tarif';

/** Parameter der Fondspolice im AVD-Vergleich. Raten als Dezimal. */
export type FondsLvVergleich = {
  renditeBruttoPaJahr: number;
  terPaJahr: number;
  kostenart: 'eur' | 'prozent';
  abschlusskostenGesamt: number;
  verwaltungProMonat: number;
  effektivkostenPaJahr: number;
};

export type AvdEingabe = {
  // Person
  geburtsjahr: number;
  beitragsjahrStart: number;
  auszahlungsbeginnAlter: number;
  berechtigung: Berechtigung;

  // Familie
  splitting: boolean;
  kinder: number;
  ehegatteMittelbarBerechtigt: boolean;
  eigenbeitragEhegatteUnmittelbar?: number;

  // Beiträge
  eigenbeitragMonatlich: number;
  beitragsdynamikPaJahr: number;

  // Steuern
  zvEJahr: number;
  kirchensteuersatz: number;
  soliBeruecksichtigen: boolean;
  steuersatzImAlter: number;

  // Produkt
  effektivkostenPaJahr: number;
  fixkostenProJahr: number;
  renditeBruttoPaJahr: number;

  // Auszahlung
  auszahlform: 'leibrente' | 'auszahlplan';
  teilkapitalAnteil: number;
  auszahlplanEndalter: number;
  rentenfaktorProZehntausend: number;
  kvStatusImAlter: 'pflicht' | 'freiwillig' | 'privat';

  // Vergleich
  /** Womit wird das AVD verglichen? Default: freies Depot. */
  vergleichspartner?: 'depot' | 'riester_alt' | 'fonds_lv';
  depotKostenPaJahr: number;
  vergleichsmodus: 'gleicher_nettoaufwand' | 'gleicher_bruttobeitrag';
  sparerpauschbetrag?: number;
  /** Nur bei vergleichspartner === 'riester_alt'. */
  riester?: RiesterAltEingabeVergleich;
  /**
   * Fondsgebundene Lebensversicherung – Vergleichspartner und zugleich
   * möglicher Zweitvertrag der Kombinationsstrategie. Immer vollständig
   * belegt, auch wenn gerade nicht gewählt: Der Entwurf im localStorage wird
   * flach über die Vorgaben gelegt, eine Teilbelegung ginge dabei verloren.
   */
  fondsLv?: FondsLvVergleich;
  /**
   * Bestandsvertragsdaten fuer die Vier-Optionen-Matrix (A-D).
   * Gesetzt nur, wenn die Wechselanalyse in den Voreinstellungen aktiv ist.
   */
  bestandsvertrag?: BestandsvertragEingabe;

  // Modell
  inflationPaJahr: number;
  zulagenZuflussVerzoegerungJahre: 0 | 1 | 2;
  erstattungReinvestieren: boolean;
  flags?: RechtsFlags;
};

export type JahresZeile = {
  jahr: number;
  alter: number;
  eigenbeitrag: number;
  eigenbeitragGefoerdert: number;
  eigenbeitragUngefoerdert: number;
  zulage: number;
  steuererstattung: number;
  foerderquote: number;
  nettoAufwand: number;
  kapitalGefoerdert: number;
  kapitalUngefoerdert: number;
  kapitalGesamt: number;
  kapitalGesamtReal: number;
  depotKapital: number;
};

export type AuszahlErgebnis = {
  form: 'leibrente' | 'auszahlplan';
  teilkapital: number;
  teilkapitalSteuer: number;
  monatsrenteBrutto: number;
  monatsrenteNetto: number;
  /** Nur beim Auszahlplan: gesetzliche Mindestrate zu Beginn (§ 1 Abs. 1 Nr. 4b AltZertG). */
  gesetzlicheMindestrate?: number;
  kleinbetragsrenteMoeglich: boolean;
  kvBeitrag: number;
  steuerProMonat: number;
};

export type DepotVergleich = {
  eingezahlt: number;
  endkapitalVorSteuer: number;
  /** Steuer bei vollständigem Verkauf zum Auszahlungsbeginn. */
  steuerBeimVerkauf: number;
  summeVorabpauschaleSteuer: number;
  /**
   * Kapital nach vollständigem Verkauf zum Auszahlungsbeginn. Diese Zahl ist die
   * Vergleichsgröße zum AVD-`endkapitalNachSteuer` – beide unterstellen, dass
   * alles auf einmal zufließt.
   */
  endkapitalNetto: number;
  /**
   * Tragbare Bruttoentnahme pro Monat bis zum Endalter. Gerechnet auf dem
   * Kapital vor Steuern, weil der Entnahmeplan das Depot gerade nicht auf
   * einmal verkauft – die Steuer fällt stattdessen mit jeder Entnahme an.
   */
  monatsentnahmeBrutto: number;
  /** Dieselbe Entnahme nach Abgeltungsteuer – Gegenstück zur Monatsrente netto. */
  monatsentnahmeNetto: number;
  /** Summe der Abgeltungsteuer über die gesamte Auszahlphase. */
  steuerAuszahlphase: number;
};

export type AvdErgebnis = {
  jahre: JahresZeile[];
  jahreBisAuszahlung: number;
  summeEigenbeitraege: number;
  summeZulagen: number;
  summeSteuererstattung: number;
  summeFoerderung: number;
  foerderquoteGesamt: number;
  endkapitalNominal: number;
  endkapitalReal: number;
  /**
   * Endkapital nach nachgelagerter Besteuerung – nur so ist der Vergleich mit
   * dem freien Depot ehrlich, dessen Endkapital ebenfalls nach Steuern steht.
   * Vereinfachung: unterstellt die vollständige Entnahme zum Steuersatz im
   * Alter; bei einer Verrentung verteilt sich die Steuer real über die Jahre.
   */
  endkapitalNachSteuer: number;
  endkapitalNachSteuerReal: number;
  gefoerderterKapitalanteil: number;
  ungefoerderterKapitalanteil: number;
  auszahlung: AuszahlErgebnis;
  depot: DepotVergleich;
  /** Nur gesetzt, wenn gegen einen Riester-Bestandsvertrag verglichen wird. */
  riesterAlt?: RiesterAltErgebnis;
  /** Nur gesetzt, wenn gegen eine Fondspolice verglichen wird. */
  fondsLv?: FondsLvErgebnis;
  /** Vier Handlungsoptionen A-D; nur bei aktiver Wechselanalyse. */
  handlungsoptionen?: OptionsErgebnis[];
  /** Netto-Kapitalvorteil des AVD gegenüber dem freien Depot (beide nach Steuern). */
  vorteilGegenDepot: number;
  /** Vorteil gegenüber dem aktiven Vergleichspartner (Depot oder Riester alt). */
  vorteilGegenVergleich: number;
  hinweise: Hinweis[];
};

export type Hinweis = {
  art: 'fehler' | 'warnung' | 'info';
  text: string;
};

/**
 * Deflator fuer die Realwert-Umrechnung. Guard gegen Inflationsraten <= -100 %,
 * die sonst eine Division durch 0 und damit Infinity erzeugen.
 */
export function deflatorFuer(inflation: number, jahre: number): number {
  const i = Number(inflation) || 0;
  if (i <= -1) return 1;
  return Math.pow(1 + i, jahre);
}

/** Validierungen nach Abschnitt 9 der Spezifikation. */
export function pruefeEingabe(e: AvdEingabe): Hinweis[] {
  const h: Hinweis[] = [];
  const jahresbeitrag = Math.max(0, e.eigenbeitragMonatlich) * 12;

  if (jahresbeitrag > GESETZ.EINZAHLUNG_MAX) {
    h.push({
      art: 'fehler',
      text: `Einzahlung ${Math.round(jahresbeitrag)} € übersteigt den Höchstbetrag von ${GESETZ.EINZAHLUNG_MAX} € pro Jahr (§ 1 Abs. 1 Nr. 5 AltZertG).`,
    });
  }
  if (jahresbeitrag > GESETZ.GEFOERDERTER_EIGENBEITRAG_MAX) {
    h.push({
      art: 'warnung',
      text: `Über ${GESETZ.GEFOERDERTER_EIGENBEITRAG_MAX} € pro Jahr gibt es keine Förderung mehr. Der ungeförderte Teil wird in der Auszahlphase besteuert, ohne die Teilfreistellung eines freien Depots zu bekommen – dieser Anteil gehört eher ins freie Depot.`,
    });
  }
  if (jahresbeitrag > 0 && jahresbeitrag < GESETZ.MINDESTEIGENBEITRAG) {
    h.push({
      art: 'warnung',
      text: `Unter ${GESETZ.MINDESTEIGENBEITRAG} € Eigenbeitrag pro Jahr entfällt jede Zulage (§ 86 EStG).`,
    });
  }
  if (e.kinder > 0 && jahresbeitrag > 0 && jahresbeitrag < 300) {
    h.push({
      art: 'info',
      text: 'Mit Kindern ist die volle Kinderzulage bereits ab 300 € pro Jahr (25 €/Monat) erreicht – der Beitrag liegt darunter.',
    });
  }
  if (
    e.auszahlungsbeginnAlter < GESETZ.AUSZAHLUNG_ALTER_MIN ||
    e.auszahlungsbeginnAlter > GESETZ.AUSZAHLUNG_ALTER_MAX
  ) {
    h.push({
      art: 'fehler',
      text: `Auszahlungsbeginn nur zwischen ${GESETZ.AUSZAHLUNG_ALTER_MIN} und ${GESETZ.AUSZAHLUNG_ALTER_MAX} Jahren zulässig (§ 1 Abs. 1 Nr. 2a AltZertG).`,
    });
  }
  if (
    e.auszahlform === 'auszahlplan' &&
    e.auszahlplanEndalter < GESETZ.AUSZAHLPLAN_ENDALTER_MIN
  ) {
    h.push({
      art: 'fehler',
      text: `Ein Auszahlungsplan muss mindestens bis zum vollendeten ${GESETZ.AUSZAHLPLAN_ENDALTER_MIN}. Lebensjahr laufen (§ 1 Abs. 1 Nr. 4b AltZertG).`,
    });
  }
  if (e.teilkapitalAnteil > GESETZ.TEILKAPITAL_MAX_ANTEIL) {
    h.push({
      art: 'fehler',
      text: `Die Teilkapitalauszahlung ist auf ${GESETZ.TEILKAPITAL_MAX_ANTEIL * 100} % begrenzt (§ 1 Abs. 1 Nr. 4 AltZertG).`,
    });
  }
  const alterBeiStart = e.beitragsjahrStart - e.geburtsjahr;
  if (e.auszahlungsbeginnAlter - alterBeiStart < 1) {
    h.push({
      art: 'fehler',
      text: `Zwischen Beitragsbeginn (Alter ${alterBeiStart}) und Auszahlungsbeginn (Alter ${e.auszahlungsbeginnAlter}) liegt kein volles Beitragsjahr – bitte Geburtsjahr, Startjahr oder Auszahlungsalter prüfen.`,
    });
  }
  if (e.berechtigung === 'mittelbar') {
    h.push({
      art: 'info',
      text: 'Mittelbar Zulageberechtigte erhalten die Zulage, aber keinen eigenen Sonderausgabenabzug – dieser läuft über den unmittelbar berechtigten Ehegatten (§ 10a Abs. 3 EStG).',
    });
  }
  if (e.berechtigung === 'keine') {
    h.push({
      art: 'warnung',
      text: 'Ohne Förderberechtigung gibt es weder Zulagen noch Sonderausgabenabzug – ein freies Depot ist dann in aller Regel die bessere Wahl.',
    });
  }
  return h;
}

/**
 * Vollständige AVD-Simulation: Ansparphase, Auszahlphase und Vergleichsdepot.
 */
export function simuliereAvd(e: AvdEingabe): AvdErgebnis {
  const flags = e.flags ?? RECHTS_FLAGS_DEFAULT;
  const hinweise = pruefeEingabe(e);

  const alterBeiStart = e.beitragsjahrStart - e.geburtsjahr;
  const jahreBisAuszahlung = Math.max(1, Math.round(e.auszahlungsbeginnAlter - alterBeiStart));

  const rNetto = (e.renditeBruttoPaJahr || 0) - (e.effektivkostenPaJahr || 0);
  const rMonat = calculateMonthlyReturn(rNetto * 100);
  const zuschlaege: SteuerZuschlaege = {
    soli: e.soliBeruecksichtigen,
    kirchensteuersatz: e.kirchensteuersatz,
  };

  // Vergleichsdepot: eigene Nettorendite (Depotkosten statt AVD-Effektivkosten)
  const rDepotMonat = calculateMonthlyReturn(
    ((e.renditeBruttoPaJahr || 0) - (e.depotKostenPaJahr || 0)) * 100
  );

  let kapitalGef = 0;
  let kapitalUngef = 0;
  let summeEigen = 0;
  let summeZulagen = 0;
  let summeErstattung = 0;

  // Vergleichsdepot mit Vorabpauschale
  let depotKapital = 0;
  let depotEingezahlt = 0;
  let depotVersteuerteVorabpauschalen = 0;
  let summeVorabSteuer = 0;
  const sparerpauschbetrag = e.sparerpauschbetrag ?? ANNAHMEN.SPARERPAUSCHBETRAG;

  // Zulagen, die in einem künftigen Jahr gutgeschrieben werden
  const zulagenEingang: number[] = new Array(jahreBisAuszahlung + 3).fill(0);

  const jahre: JahresZeile[] = [];
  let beitragMonatlich = Math.max(0, e.eigenbeitragMonatlich || 0);

  for (let t = 0; t < jahreBisAuszahlung; t++) {
    const jahr = e.beitragsjahrStart + t;
    const alter = alterBeiStart + t;
    if (t > 0) beitragMonatlich *= 1 + (e.beitragsdynamikPaJahr || 0);

    const eigenbeitrag = beitragMonatlich * 12;
    const eigenGef = Math.min(eigenbeitrag, GESETZ.GEFOERDERTER_EIGENBEITRAG_MAX);
    const eigenUngef = Math.max(0, eigenbeitrag - GESETZ.GEFOERDERTER_EIGENBEITRAG_MAX);

    const z = berechneZulagen({
      eigenbeitrag,
      eigenbeitragEhegatteUnmittelbar: e.eigenbeitragEhegatteUnmittelbar,
      kinder: e.kinder,
      alterZuBeitragsjahresbeginn: alter,
      bebBereitsGenutzt: t > 0,
      berechtigung: e.berechtigung,
      flags,
    });

    const g = guenstigerpruefung({
      eigenbeitrag,
      zulageGesamt: z.zulageGesamt,
      zulageOhneKinder: z.grundzulage + z.berufseinsteigerbonus,
      berechtigung: e.berechtigung,
      zvE: e.zvEJahr,
      splitting: e.splitting,
      ehegatteMittelbarBerechtigt: e.ehegatteMittelbarBerechtigt,
      zuschlaege,
      flags,
    });

    // Zulage wird verzögert gutgeschrieben (Antrag/Auszahlung durch die ZfA)
    const zielJahr = t + (e.zulagenZuflussVerzoegerungJahre ?? 1);
    if (zielJahr < zulagenEingang.length) zulagenEingang[zielJahr] += z.zulageGesamt;

    // --- Monatliche Fortschreibung ---
    const zuflussDiesesJahr = zulagenEingang[t];
    // Zulage und ggf. reinvestierte Erstattung sind gefördertes Kapital
    kapitalGef += zuflussDiesesJahr;
    if (e.erstattungReinvestieren) kapitalGef += g.zusaetzlicheErstattung;

    for (let m = 1; m <= 12; m++) {
      kapitalGef = kapitalGef * (1 + rMonat) + eigenGef / 12;
      kapitalUngef = kapitalUngef * (1 + rMonat) + eigenUngef / 12;
    }

    // Fixkosten anteilig auf beide Töpfe (nicht in der Rendite verstecken)
    const gesamtVorFix = kapitalGef + kapitalUngef;
    if (gesamtVorFix > 0 && e.fixkostenProJahr > 0) {
      const anteilGef = kapitalGef / gesamtVorFix;
      kapitalGef = Math.max(0, kapitalGef - e.fixkostenProJahr * anteilGef);
      kapitalUngef = Math.max(0, kapitalUngef - e.fixkostenProJahr * (1 - anteilGef));
    }

    // --- Vergleichsdepot ---
    const nettoAufwand = eigenbeitrag - g.zusaetzlicheErstattung;
    // Beide Seiten müssen denselben Betrag aus eigener Tasche kosten.
    // Wird die Erstattung wieder eingezahlt, bleibt der eigene Aufwand der
    // volle Eigenbeitrag – dann bekommt auch das Depot diesen Betrag.
    const eigenerAufwand = e.erstattungReinvestieren ? eigenbeitrag : nettoAufwand;
    const depotBeitrag =
      e.vergleichsmodus === 'gleicher_nettoaufwand' ? eigenerAufwand : eigenbeitrag;
    const depotWertJahresanfang = depotKapital;
    for (let m = 1; m <= 12; m++) {
      depotKapital = depotKapital * (1 + rDepotMonat) + depotBeitrag / 12;
    }
    depotEingezahlt += depotBeitrag;

    // Vorabpauschale (§ 18 InvStG): Basisertrag, gedeckelt auf die Wertsteigerung.
    // Unterjährig gekaufte Anteile zählen nur zeitanteilig: Die Pauschale
    // vermindert sich um ein Zwölftel je vollem Monat vor dem Erwerbsmonat
    // (§ 18 Abs. 4 InvStG). Bei monatlichen Beiträgen macht das einen
    // spürbaren Unterschied gegenüber der reinen Jahresanfangsbetrachtung.
    const wertsteigerung = depotKapital - depotWertJahresanfang - depotBeitrag;
    const basiszinsJahr = basiszinsFuer(jahr) * DEPOT_STEUER.VORABPAUSCHALE_FAKTOR;
    const monatsrate = depotBeitrag / 12;
    let basisertragUnterjaehrig = 0;
    for (let m = 1; m <= 12; m++) {
      basisertragUnterjaehrig += monatsrate * basiszinsJahr * ((13 - m) / 12);
    }
    const basisertrag = depotWertJahresanfang * basiszinsJahr + basisertragUnterjaehrig;
    const vorabpauschale = Math.max(0, Math.min(basisertrag, Math.max(0, wertsteigerung)));
    const vorabStpfl = vorabpauschale * (1 - DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS);
    const vorabSteuer =
      Math.max(0, vorabStpfl - sparerpauschbetrag) *
      DEPOT_STEUER.ABGELTUNGSTEUER *
      (1 + DEPOT_STEUER.SOLI_ZUSCHLAG + (e.kirchensteuersatz || 0));
    depotKapital -= vorabSteuer; // wird dem Depot entnommen
    depotVersteuerteVorabpauschalen += vorabpauschale;
    summeVorabSteuer += vorabSteuer;

    summeEigen += eigenbeitrag;
    summeZulagen += z.zulageGesamt;
    summeErstattung += g.zusaetzlicheErstattung;

    const kapitalGesamt = kapitalGef + kapitalUngef;
    jahre.push({
      jahr,
      alter: alter + 1,
      eigenbeitrag,
      eigenbeitragGefoerdert: eigenGef,
      eigenbeitragUngefoerdert: eigenUngef,
      zulage: z.zulageGesamt,
      steuererstattung: g.zusaetzlicheErstattung,
      foerderquote: g.foerderquote,
      nettoAufwand,
      kapitalGefoerdert: kapitalGef,
      kapitalUngefoerdert: kapitalUngef,
      kapitalGesamt,
      kapitalGesamtReal: kapitalGesamt / deflatorFuer(e.inflationPaJahr, t + 1),
      depotKapital,
    });
  }

  // Noch ausstehende Zulagen zum Auszahlungsbeginn nachtragen
  for (let t = jahreBisAuszahlung; t < zulagenEingang.length; t++) {
    kapitalGef += zulagenEingang[t];
  }

  const endkapital = kapitalGef + kapitalUngef;
  const auszahlung = berechneAuszahlung(e, kapitalGef, kapitalUngef, flags);
  const depot = berechneDepotVergleich(
    e,
    depotKapital,
    depotEingezahlt,
    depotVersteuerteVorabpauschalen,
    summeVorabSteuer,
    sparerpauschbetrag
  );

  if (flags.ungefoerderterTeilBesteuerung === 'ertragsanteil' && kapitalUngef > 0) {
    hinweise.push({
      art: 'info',
      text: 'Der ungeförderte Vertragsteil wird mit dem Ertragsanteil besteuert. Die Detailbehandlung steht unter dem Vorbehalt des BMF-Anwendungsschreibens.',
    });
  }

  const summeFoerderung = summeZulagen + summeErstattung;
  const endkapitalNachSteuer = nachSteuerKapital(e, kapitalGef, kapitalUngef, flags);
  const deflator = deflatorFuer(e.inflationPaJahr, jahreBisAuszahlung);

  // Vergleich gegen einen Riester-Bestandsvertrag (Foerderregime "alt")
  const riesterAlt =
    e.vergleichspartner === 'riester_alt' && e.riester
      ? simuliereRiesterAlt({
          jahre: jahreBisAuszahlung,
          eigenbeitragMonatlichStart: e.eigenbeitragMonatlich,
          beitragsdynamikPaJahr: e.beitragsdynamikPaJahr,
          kinderGesamt: e.kinder,
          alterBeiStart,
          zvEJahr: e.zvEJahr,
          splitting: e.splitting,
          zuschlaege,
          steuersatzImAlter: e.steuersatzImAlter,
          fixkostenProJahr: e.fixkostenProJahr,
          zulagenZuflussVerzoegerungJahre: e.zulagenZuflussVerzoegerungJahre,
          erstattungReinvestieren: e.erstattungReinvestieren,
          riester: e.riester,
        })
      : undefined;

  // Vier Handlungsoptionen A-D (nur mit Bestandsvertragsdaten)
  const handlungsoptionen =
    e.vergleichspartner === 'riester_alt' && e.riester && e.bestandsvertrag
      ? berechneHandlungsoptionen({
          jahre: jahreBisAuszahlung,
          eigenbeitragMonatlichStart: e.eigenbeitragMonatlich,
          beitragsdynamikPaJahr: e.beitragsdynamikPaJahr,
          kinderGesamt: e.kinder,
          kinderGeborenVor2008: e.riester.kinderGeborenVor2008,
          alterBeiStart,
          zvEJahr: e.zvEJahr,
          splitting: e.splitting,
          zuschlaege,
          steuersatzImAlter: e.steuersatzImAlter,
          zulagenZuflussVerzoegerungJahre: e.zulagenZuflussVerzoegerungJahre,
          erstattungReinvestieren: e.erstattungReinvestieren,
          altRenditePaJahr: e.riester.renditeBruttoPaJahr,
          altKostenPaJahr: e.riester.effektivkostenPaJahr,
          avdRenditePaJahr: e.renditeBruttoPaJahr,
          avdKostenPaJahr: e.effektivkostenPaJahr,
          bestand: e.bestandsvertrag,
        })
      : undefined;

  if (handlungsoptionen && e.bestandsvertrag) {
    if (e.bestandsvertrag.aktuellerVertragswert <= 0) {
      hinweise.push({
        art: 'warnung',
        text: 'Ohne den aktuellen Vertragswert aus der Standmitteilung ist der Optionsvergleich wertlos – der Wert darf nicht geschaetzt werden.',
      });
    }
    if (e.bestandsvertrag.fruehesterZugriffAlter < GESETZ.AUSZAHLUNG_ALTER_MIN) {
      hinweise.push({
        art: 'info',
        text: `Der Altvertrag erlaubt den Auszahlungsbeginn bereits ab ${e.bestandsvertrag.fruehesterZugriffAlter}. Das Altersvorsorgedepot erst ab ${GESETZ.AUSZAHLUNG_ALTER_MIN} – bei gewuenschtem frueherem Zugriff scheiden die Optionen C und D aus.`,
      });
    }
  }

  if (riesterAlt) {
    if (riesterAlt.summeFoerderung > summeFoerderung) {
      const schwelle = sockelbetragsSchwelle(
        Math.max(0, e.kinder - (e.riester?.kinderGeborenVor2008 ?? 0)),
        e.riester?.kinderGeborenVor2008 ?? 0
      );
      hinweise.push({
        art: 'warnung',
        text: `Die alte Riester-Foerderung ist hier hoeher als die neue. Das betrifft den Bereich niedriges Einkommen (bis rund ${Math.round(schwelle).toLocaleString('de-DE')} €) plus Kinder plus Beitrag nahe am Sockelbetrag – hier schadet ein Wechsel der Foerdersystematik.`,
      });
    }
    hinweise.push({
      art: 'info',
      text: 'Steuerlich aendert sich beim Wechsel nichts: Beide Vertraege sind in der Ansparphase steuerfrei und werden in der Auszahlphase voll nachgelagert besteuert (§ 22 Nr. 5 EStG), beide ohne Teilfreistellung. Der Unterschied liegt in Foerderhoehe, Kosten und Renditepotenzial.',
    });
    hinweise.push({
      art: 'warnung',
      text: 'Der Wechsel der Foerdersystematik ist unwiderruflich und gilt einheitlich fuer alle Altersvorsorgevertraege des Haushalts, ggf. auch fuer den Ehegatten (§ 52 Abs. 50a EStG). Ein Rueckweg besteht nicht.',
    });
  }

  // Fondspolice als Vergleichspartner: derselbe Beitragsstrom, aber ein
  // Versicherungsmantel mit Halbeinkuenfteverfahren statt nachgelagerter
  // Besteuerung.
  const fondsLv =
    e.vergleichspartner === 'fonds_lv' && e.fondsLv
      ? simuliereFondsLv({
          jahre: jahreBisAuszahlung,
          beitragMonatlich: e.eigenbeitragMonatlich,
          beitragsdynamikPaJahr: e.beitragsdynamikPaJahr,
          renditeBruttoPaJahr: e.fondsLv.renditeBruttoPaJahr,
          terPaJahr: e.fondsLv.terPaJahr,
          kosten:
            e.fondsLv.kostenart === 'eur'
              ? {
                  art: 'eur',
                  abschlusskostenGesamt: e.fondsLv.abschlusskostenGesamt,
                  verwaltungProMonat: e.fondsLv.verwaltungProMonat,
                }
              : { art: 'prozent', effektivkostenPaJahr: e.fondsLv.effektivkostenPaJahr },
          alterBeiAuszahlung: e.auszahlungsbeginnAlter,
          steuersatzImAlter: e.steuersatzImAlter,
          soliBeruecksichtigen: e.soliBeruecksichtigen,
          kirchensteuersatz: e.kirchensteuersatz,
          auszahlplanEndalter: e.auszahlplanEndalter,
        })
      : undefined;
  if (fondsLv) {
    hinweise.push(...fondsLv.hinweise);
    // Der Depotzweig kann den Beitrag um die Steuererstattung mindern, die
    // Police nicht: `simulateLv` nimmt einen gleichmäßigen Beitragsstrom und
    // keine jahresweise schwankende Reihe. Das muss dastehen, sonst vergleicht
    // die Seite unbemerkt unterschiedlich große Einzahlungen.
    if (e.vergleichsmodus === 'gleicher_nettoaufwand') {
      hinweise.push({
        art: 'warnung',
        text:
          'Die Fondspolice wird mit dem vollen Bruttobeitrag gerechnet, nicht mit dem ' +
          'um die Steuererstattung verminderten Nettoaufwand. Für einen Vergleich bei ' +
          'gleichem Eigenaufwand die Vergleichsbasis auf „gleicher Bruttobeitrag" stellen.',
      });
    }
  }

  // Der aktive Vergleichspartner – die Kennzahl darf nicht still aufs Depot
  // zeigen, wenn etwas anderes gewaehlt ist.
  const vergleichNachSteuer = riesterAlt
    ? riesterAlt.endkapitalNachSteuer
    : fondsLv
      ? fondsLv.endkapitalNachSteuer
      : depot.endkapitalNetto;

  return {
    jahre,
    jahreBisAuszahlung,
    summeEigenbeitraege: summeEigen,
    summeZulagen,
    summeSteuererstattung: summeErstattung,
    summeFoerderung,
    foerderquoteGesamt: summeEigen > 0 ? summeFoerderung / summeEigen : 0,
    endkapitalNominal: endkapital,
    endkapitalReal: endkapital / deflator,
    endkapitalNachSteuer,
    endkapitalNachSteuerReal: endkapitalNachSteuer / deflator,
    gefoerderterKapitalanteil: kapitalGef,
    ungefoerderterKapitalanteil: kapitalUngef,
    auszahlung,
    depot,
    riesterAlt,
    fondsLv,
    handlungsoptionen,
    vorteilGegenDepot: endkapitalNachSteuer - depot.endkapitalNetto,
    vorteilGegenVergleich: endkapitalNachSteuer - vergleichNachSteuer,
    hinweise,
  };
}

/**
 * Kapital nach nachgelagerter Besteuerung: Der geförderte Teil ist zu 100 %
 * steuerpflichtig (§ 22 Nr. 5 S. 1 EStG), der ungeförderte Teil nur mit dem
 * Ertragsanteil bzw. zur Hälfte (je nach Flag).
 */
function nachSteuerKapital(
  e: AvdEingabe,
  kapitalGefoerdert: number,
  kapitalUngefoerdert: number,
  flags: RechtsFlags
): number {
  const s = Math.max(0, e.steuersatzImAlter || 0);
  const anteilUngef =
    flags.ungefoerderterTeilBesteuerung === 'ertragsanteil'
      ? ertragsanteilFuer(e.auszahlungsbeginnAlter)
      : 0.5;
  return (
    kapitalGefoerdert * (1 - s) + kapitalUngefoerdert * (1 - anteilUngef * s)
  );
}

/**
 * Auszahlphase. Der geförderte Teil ist voll nachgelagert steuerpflichtig
 * (§ 22 Nr. 5 S. 1 EStG) – ohne Teilfreistellung, ohne Abgeltungsteuer.
 * Der ungeförderte Teil wird je nach Flag mit dem Ertragsanteil oder nach
 * dem Halbeinkünfteverfahren besteuert.
 */
export function berechneAuszahlung(
  e: AvdEingabe,
  kapitalGefoerdert: number,
  kapitalUngefoerdert: number,
  flags: RechtsFlags = RECHTS_FLAGS_DEFAULT
): AuszahlErgebnis {
  const gesamt = kapitalGefoerdert + kapitalUngefoerdert;
  const teilkapitalAnteil = Math.min(
    Math.max(0, e.teilkapitalAnteil || 0),
    GESETZ.TEILKAPITAL_MAX_ANTEIL
  );
  const teilkapital = gesamt * teilkapitalAnteil;
  const restkapital = gesamt - teilkapital;
  const anteilGef = gesamt > 0 ? kapitalGefoerdert / gesamt : 1;
  const steuersatz = Math.max(0, e.steuersatzImAlter || 0);

  // Teilkapitalauszahlung: der geförderte Anteil ist voll steuerpflichtig
  const teilkapitalSteuer = teilkapital * anteilGef * steuersatz;

  let monatsrenteBrutto: number;
  let gesetzlicheMindestrate: number | undefined;

  if (e.auszahlform === 'leibrente') {
    monatsrenteBrutto = (restkapital / 10000) * (e.rentenfaktorProZehntausend || 0);
  } else {
    const monate = Math.max(
      12,
      Math.round((e.auszahlplanEndalter - e.auszahlungsbeginnAlter) * 12)
    );
    gesetzlicheMindestrate =
      (GESETZ.AUSZAHLPLAN_MINDESTRATE_FAKTOR * restkapital) / monate;
    // Entnahme, die das Kapital bis zum Planende gleichmäßig aufbraucht
    const rMonat = calculateMonthlyReturn(
      ((e.renditeBruttoPaJahr || 0) - (e.effektivkostenPaJahr || 0)) * 100
    );
    monatsrenteBrutto = monatlicheEntnahme(restkapital, rMonat, monate);
  }

  // Steuer auf die laufende Leistung
  const renteGef = monatsrenteBrutto * anteilGef;
  const renteUngef = monatsrenteBrutto * (1 - anteilGef);
  const steuerGef = renteGef * steuersatz;
  const steuerUngef =
    flags.ungefoerderterTeilBesteuerung === 'ertragsanteil'
      ? renteUngef * ertragsanteilFuer(e.auszahlungsbeginnAlter) * steuersatz
      : renteUngef * 0.5 * steuersatz;
  // Werbungskosten-Pauschbetrag mindert die Bemessungsgrundlage (§ 9a S. 1 Nr. 3)
  const wkEntlastung =
    (Math.min(GESETZ.WERBUNGSKOSTEN_PAUSCHBETRAG_RENTE, monatsrenteBrutto * 12) *
      steuersatz) /
    12;
  const steuerProMonat = Math.max(0, steuerGef + steuerUngef - wkEntlastung);

  // KV/PV: Pflichtversicherte in der KVdR zahlen auf private Altersvorsorge nichts
  const kvBeitrag =
    e.kvStatusImAlter === 'freiwillig'
      ? monatsrenteBrutto * ANNAHMEN.KV_BEITRAGSSATZ_FREIWILLIG
      : 0;

  const kleinbetragsgrenze =
    GESETZ.BEZUGSGROESSE_MONAT_2026 * GESETZ.KLEINBETRAGSRENTE_ANTEIL_BEZUGSGROESSE;

  return {
    form: e.auszahlform,
    teilkapital,
    teilkapitalSteuer,
    monatsrenteBrutto,
    monatsrenteNetto: Math.max(0, monatsrenteBrutto - steuerProMonat - kvBeitrag),
    gesetzlicheMindestrate,
    kleinbetragsrenteMoeglich:
      monatsrenteBrutto > 0 && monatsrenteBrutto <= kleinbetragsgrenze,
    kvBeitrag,
    steuerProMonat,
  };
}

/**
 * Monatliche Entnahme, die ein Kapital über `monate` gleichmäßig aufbraucht.
 * Wird für beide Seiten verwendet (AVD-Auszahlplan und freies Depot), damit der
 * Vergleich nicht allein aus unterschiedlichen Rechenwegen entsteht.
 */
export function monatlicheEntnahme(kapital: number, rMonat: number, monate: number): number {
  if (monate <= 0) return 0;
  // Die Annuitätenformel gilt auch für negative Zinssätze. Sie dort auf den
  // Nullzinsfall zurückzusetzen, hätte eine zu hohe tragfähige Entnahme
  // ausgewiesen. Nur exakt null (und der Sonderfall −100 %) braucht die
  // einfache Teilung.
  if (Math.abs(rMonat) < 1e-9 || rMonat <= -1) return kapital / monate;
  return (kapital * rMonat) / (1 - Math.pow(1 + rMonat, -monate));
}

/**
 * Auszahlphase des freien Depots (Audit N06). Vorher blieben die Erträge dieser
 * Phase unversteuert, während die AVD-Rente Monat für Monat besteuert wurde –
 * der Vergleich der laufenden Leistung fiel damit zugunsten des Depots aus.
 *
 * Modell: Das Depot wird zum Auszahlungsbeginn nicht verkauft, sondern
 * entnommen. Jede Entnahme realisiert den Gewinn, der anteilig in den
 * verkauften Anteilen steckt; darauf wird Abgeltungsteuer abzüglich
 * Teilfreistellung fällig. Der Einstandswert sinkt im selben Verhältnis mit.
 *
 * Vereinfachungen, bewusst wie im übrigen Modul:
 * - In der Auszahlphase keine Vorabpauschale mehr. Sie ist eine Vorauszahlung
 *   auf genau diese Gewinne und würde die Steuer nur vorziehen, nicht erhöhen.
 * - Keine Verlustverrechnung: Fällt das Depot unter den Einstandswert, ist der
 *   realisierte Gewinn null, aber es entsteht keine Steuererstattung.
 */
function depotAuszahlphase(args: {
  kapital: number;
  einstand: number;
  rMonat: number;
  monate: number;
  /** Steuersatz auf den realisierten Gewinn, Teilfreistellung schon enthalten. */
  steuersatz: number;
  sparerpauschbetrag: number;
}): { brutto: number; nettoDurchschnitt: number; steuerGesamt: number } {
  const { kapital: start, einstand: einstandStart, rMonat, monate, steuersatz } = args;
  const brutto = monatlicheEntnahme(start, rMonat, monate);
  if (!(brutto > 0) || monate <= 0) {
    return { brutto: Math.max(0, brutto), nettoDurchschnitt: 0, steuerGesamt: 0 };
  }

  let kapital = start;
  let einstand = Math.max(0, einstandStart);
  let steuerGesamt = 0;
  // Der Sparerpauschbetrag gilt je Jahr, deshalb wird die Steuer wie in der
  // Ansparphase jahresweise abgerechnet (Vorgabe im Modul: 0 €).
  let gewinnImJahr = 0;

  const abrechnen = () => {
    steuerGesamt += Math.max(0, gewinnImJahr - args.sparerpauschbetrag) * steuersatz;
    gewinnImJahr = 0;
  };

  // Reihenfolge: erst Rendite, dann Entnahme. Die Annuitätenformel in
  // `monatlicheEntnahme` ist nachschüssig; eine vorschüssige Schleife
  // (erst entnehmen, dann verzinsen) trägt dieselbe Rate nicht durch und das
  // Kapital wäre vor der letzten Rate aufgebraucht.
  let ausgezahlt = 0;
  for (let m = 1; m <= monate; m++) {
    kapital *= 1 + rMonat;
    const entnahme = Math.min(brutto, Math.max(0, kapital));
    if (entnahme > 0 && kapital > 0) {
      const anteil = entnahme / kapital;
      gewinnImJahr += Math.max(0, kapital - einstand) * anteil;
      einstand -= einstand * anteil;
      kapital -= entnahme;
      ausgezahlt += entnahme;
    }
    if (m % 12 === 0) abrechnen();
  }
  abrechnen();

  // Ausgewiesen wird, was tatsächlich fließt – nicht die rechnerische Rate.
  // Beides fällt auseinander, sobald das Kapital die letzte Rate nicht mehr
  // trägt.
  const bruttoDurchschnitt = ausgezahlt / monate;

  return {
    brutto: bruttoDurchschnitt,
    nettoDurchschnitt: Math.max(0, bruttoDurchschnitt - steuerGesamt / monate),
    steuerGesamt,
  };
}

/** Freies Depot am Laufzeitende: Verkauf mit Teilfreistellung, abzüglich
 *  bereits über die Vorabpauschale versteuerter Beträge. */
function berechneDepotVergleich(
  e: AvdEingabe,
  endkapital: number,
  eingezahlt: number,
  versteuerteVorabpauschalen: number,
  summeVorabSteuer: number,
  sparerpauschbetrag: number
): DepotVergleich {
  const rohgewinn = Math.max(0, endkapital - eingezahlt);
  const gewinnNachVorab = Math.max(0, rohgewinn - versteuerteVorabpauschalen);
  const stpfl = gewinnNachVorab * (1 - DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS);
  const steuer =
    Math.max(0, stpfl - sparerpauschbetrag) *
    DEPOT_STEUER.ABGELTUNGSTEUER *
    (1 + DEPOT_STEUER.SOLI_ZUSCHLAG + (e.kirchensteuersatz || 0));

  const netto = endkapital - steuer;
  const monate = Math.max(
    12,
    Math.round((e.auszahlplanEndalter - e.auszahlungsbeginnAlter) * 12)
  );

  // Gleiche Entnahmelogik wie beim AVD-Auszahlplan: Das Restkapital bleibt
  // während der Auszahlphase investiert – und wird dort ebenso besteuert.
  const rMonatDepot = calculateMonthlyReturn(
    ((e.renditeBruttoPaJahr || 0) - (e.depotKostenPaJahr || 0)) * 100
  );
  // Bereits über die Vorabpauschale versteuerte Beträge erhöhen den
  // Einstandswert, sie dürfen nicht zweimal belastet werden.
  const auszahlphase = depotAuszahlphase({
    kapital: endkapital,
    einstand: eingezahlt + versteuerteVorabpauschalen,
    rMonat: rMonatDepot,
    monate,
    steuersatz:
      (1 - DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS) *
      DEPOT_STEUER.ABGELTUNGSTEUER *
      (1 + DEPOT_STEUER.SOLI_ZUSCHLAG + (e.kirchensteuersatz || 0)),
    sparerpauschbetrag,
  });

  return {
    eingezahlt,
    endkapitalVorSteuer: endkapital,
    steuerBeimVerkauf: steuer,
    summeVorabpauschaleSteuer: summeVorabSteuer,
    endkapitalNetto: netto,
    monatsentnahmeBrutto: auszahlphase.brutto,
    monatsentnahmeNetto: auszahlphase.nettoDurchschnitt,
    steuerAuszahlphase: auszahlphase.steuerGesamt,
  };
}

/**
 * Grenzförderquote über den Jahresbeitrag – die Kernaussage des Rechners:
 * Wie viel Förderung bringt der jeweils nächste Euro?
 */
export function foerderquotenKurve(args: {
  kinder: number;
  zvE: number;
  splitting: boolean;
  berechtigung: Berechtigung;
  zuschlaege?: SteuerZuschlaege;
  flags?: RechtsFlags;
  maxBeitrag?: number;
  schritt?: number;
}): { beitrag: number; foerderquote: number; grenzfoerderquote: number }[] {
  const max = args.maxBeitrag ?? GESETZ.EINZAHLUNG_MAX;
  const schritt = args.schritt ?? 60;
  const punkte: { beitrag: number; foerderquote: number; grenzfoerderquote: number }[] = [];

  const foerderungBei = (beitrag: number) => {
    const z = berechneZulagen({
      eigenbeitrag: beitrag,
      kinder: args.kinder,
      berechtigung: args.berechtigung,
      flags: args.flags,
    });
    const g = guenstigerpruefung({
      eigenbeitrag: beitrag,
      zulageGesamt: z.zulageGesamt,
      zulageOhneKinder: z.grundzulage + z.berufseinsteigerbonus,
      berechtigung: args.berechtigung,
      zvE: args.zvE,
      splitting: args.splitting,
      zuschlaege: args.zuschlaege,
      flags: args.flags,
    });
    return g.gesamtfoerderung;
  };

  let vorheriger = 0;
  for (let b = schritt; b <= max; b += schritt) {
    const f = foerderungBei(b);
    punkte.push({
      beitrag: b,
      foerderquote: b > 0 ? f / b : 0,
      grenzfoerderquote: (f - vorheriger) / schritt,
    });
    vorheriger = f;
  }
  return punkte;
}
