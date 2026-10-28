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
import { kinderImBeitragsjahr, unbekannteKinder, berechneZulagen, guenstigerpruefung, type Berechtigung } from './zulagen';
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
  /**
   * Letztes Jahr mit Kindergeld, je Kind (Audit C01).
   *
   * Die Kinderzulage haengt an der Kindergeldfestsetzung und endet mit ihr.
   * Fehlt die Angabe fuer ein Kind, zaehlt es weiter mit - dann weist die
   * Simulation darauf hin, statt die Annahme zu verschweigen.
   */
  kinderKindergeldBisJahr?: number[];
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
  /**
   * Rentengarantiezeit der Leibrente in Jahren (0, 10 oder 20 sind ueblich).
   *
   * Sie aendert die laufende Rente hier bewusst nicht - der Rentenfaktor ist
   * eine Eingabe und muss zur gewaehlten Garantiezeit passen. Gebraucht wird
   * sie fuer den Todesfall: Ohne Garantiezeit endet die Leibrente mit dem Tod
   * und den Hinterbliebenen bleibt nichts (siehe todesfall.ts).
   */
  rentengarantiezeitJahre?: number;
  /**
   * Persoenlicher Steuersatz der Hinterbliebenen, als Dezimalanteil.
   *
   * Eine Hinterbliebenenrente versteuert der Empfaenger, nicht der
   * Verstorbene. Ohne Angabe rechnet der Todesfall mit dem Satz des Sparers
   * und sagt das als Annahme - frueher tat er es stillschweigend.
   */
  steuersatzHinterbliebene?: number;
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
  /** Kinder, fuer die in diesem Jahr noch Kindergeld lief (C01). */
  kinderMitZulage: number;
  /**
   * Zulagen, die in diesem Jahr gutgeschrieben wurden - nicht der Anspruch
   * des Jahres. Beides faellt wegen der verzoegerten Gutschrift auseinander.
   * Das Todesfallszenario braucht den Zufluss: Nur gutgeschriebene Zulagen
   * stecken im Kapital, zurueckzuzahlen ist dagegen der Anspruch.
   */
  zulageZugeflossen: number;
  /**
   * Eigene Zahlungen in den gefoerderten Topf in diesem Jahr: Eigenbeitrag bis
   * zum Hoechstbetrag und, falls sie wieder angelegt wird, die
   * Steuererstattung. Grundlage fuer die Ertragsbesteuerung bei schaedlicher
   * Verwendung (§ 22 Nr. 5 S. 3 EStG).
   */
  eigenzahlungGefoerdert: number;
  /**
   * Einstandswert des Vergleichsdepots am Jahresende, einschliesslich der
   * bereits ueber die Vorabpauschale versteuerten Betraege. Ohne diesen Wert
   * liesse sich die Depotsteuer zu einem Zeitpunkt vor dem Laufzeitende nur
   * schaetzen.
   */
  depotEinstand: number;
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
  /**
   * Anteil des gefoerderten Kapitals an der Leistung. Der Todesfall braucht
   * ihn, um die garantierte Restrente mit dem Steuersatz der Hinterbliebenen
   * zu rechnen, ohne die Aufteilung ein zweites Mal herzuleiten.
   */
  anteilGefoerdert: number;
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

/**
 * Monatsleistung des aktiven Vergleichspartners.
 *
 * Die Auszahlphase zeigte bis Oktober 2026 **immer** das freie Depot – auch
 * wenn der Nutzer oben die Fondspolice oder den Riester-Bestand gewählt hatte.
 * Der Grund lag nicht nur in der Oberfläche: Die Engine kannte für die beiden
 * anderen Seiten überhaupt keine Monatsleistung.
 *
 * Gerechnet wird mit **derselben Auszahlform und demselben Horizont** wie beim
 * Altersvorsorgedepot – nur mit dem jeweils eigenen Kapital und der eigenen
 * Rendite. Ein eigener Rechenweg je Partner würde den Unterschied aus dem
 * Rechenweg erzeugen statt aus dem Produkt. Dasselbe Vorgehen wie im Todesfall
 * (`todesfall.ts`, `riesterAltNachBeginn`).
 */
export type VergleichAuszahlung = {
  partner: 'depot' | 'riester_alt' | 'fonds_lv';
  /** Beschriftung der Kachel, z. B. „Fondspolice: Entnahme netto". */
  name: string;
  monatlichBrutto: number;
  monatlichNetto: number;
  /** Nur beim freien Depot: Abgeltungsteuer über die gesamte Auszahlphase. */
  steuerAuszahlphase?: number;
  /** Was dabei unterstellt ist – gehört neben die Zahl, nicht in eine Fußnote. */
  annahme: string;
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
  /** Monatsleistung der Gegenseite – folgt `vergleichspartner`. */
  vergleichAuszahlung: VergleichAuszahlung;
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
  // Audit C01: Ohne Enddatum rechnet die Prognose die Kinderzulage bis zum
  // Auszahlungsbeginn weiter. Das kann richtig sein, ist aber eine Annahme -
  // und sie war bisher nirgends zu lesen.
  const ohneEnde = unbekannteKinder(e.kinder, e.kinderKindergeldBisJahr);
  if (ohneEnde > 0) {
    h.push({
      art: 'warnung',
      text:
        ohneEnde === 1
          ? 'Für ein Kind fehlt das letzte Jahr mit Kindergeld. Dafür wird die Kinderzulage bis zum Auszahlungsbeginn weitergerechnet – das überschätzt die Förderung, wenn die Festsetzung vorher endet (§ 85 EStG).'
          : `Für ${ohneEnde} Kinder fehlt das letzte Jahr mit Kindergeld. Dafür wird die Kinderzulage bis zum Auszahlungsbeginn weitergerechnet – das überschätzt die Förderung, wenn die Festsetzung vorher endet (§ 85 EStG).`,
    });
  }
  const enden = (e.kinderKindergeldBisJahr ?? [])
    .map((j) => Math.floor(Number(j) || 0))
    .filter((j) => j > 0);
  if (enden.length > 0) {
    const letztes = Math.max(...enden);
    const alterBeiStartKinder = e.beitragsjahrStart - e.geburtsjahr;
    const letztesBeitragsjahr =
      e.beitragsjahrStart + (e.auszahlungsbeginnAlter - alterBeiStartKinder) - 1;
    if (letztes < letztesBeitragsjahr) {
      h.push({
        art: 'info',
        text: `Die Kinderzulage endet nach ${letztes}; die Beitragsjahre danach (bis ${letztesBeitragsjahr}) tragen nur noch Grundzulage und Steuervorteil.`,
      });
    }
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

    // Nicht `e.kinder`: Die Kinderzulage endet mit dem Kindergeld (C01).
    const kinderDiesesJahr = kinderImBeitragsjahr(
      e.kinder,
      e.kinderKindergeldBisJahr,
      jahr
    );

    const z = berechneZulagen({
      eigenbeitrag,
      eigenbeitragEhegatteUnmittelbar: e.eigenbeitragEhegatteUnmittelbar,
      kinder: kinderDiesesJahr,
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
      kinderMitZulage: kinderDiesesJahr,
      zulageZugeflossen: zuflussDiesesJahr,
      eigenzahlungGefoerdert:
        eigenGef + (e.erstattungReinvestieren ? g.zusaetzlicheErstattung : 0),
      depotEinstand: depotEingezahlt + depotVersteuerteVorabpauschalen,
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
          beitragsjahrStart: e.beitragsjahrStart,
          kinderKindergeldBisJahr: e.kinderKindergeldBisJahr,
          alterBeiStart,
          zvEJahr: e.zvEJahr,
          splitting: e.splitting,
          zuschlaege,
          steuersatzImAlter: e.steuersatzImAlter,
          fixkostenProJahr: e.fixkostenProJahr,
          zulagenZuflussVerzoegerungJahre: e.zulagenZuflussVerzoegerungJahre,
          erstattungReinvestieren: e.erstattungReinvestieren,
          // Nur unter dem neuen Foerderregime gebraucht - dort rechnet der
          // Altvertrag mit derselben Systematik wie das AVD und braucht
          // deshalb auch dieselben Angaben.
          berechtigung: e.berechtigung,
          eigenbeitragEhegatteUnmittelbar: e.eigenbeitragEhegatteUnmittelbar,
          ehegatteMittelbarBerechtigt: e.ehegatteMittelbarBerechtigt,
          flags,
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
          beitragsjahrStart: e.beitragsjahrStart,
          kinderKindergeldBisJahr: e.kinderKindergeldBisJahr,
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
    // Der Vergleich der Foerderhoehen traegt nur, solange der Altvertrag noch
    // nach altem Recht rechnet. Steht er schon auf der neuen Systematik, waere
    // der Satz schlicht falsch.
    if (
      riesterAlt.foerderregime === 'alt' &&
      riesterAlt.summeFoerderung > summeFoerderung
    ) {
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
    vergleichAuszahlung: vergleichAuszahlungRechnen({ e, depot, riesterAlt, fondsLv }),
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
 * Steuer auf eine laufende Leistung aus dem Vertrag, pro Monat.
 *
 * Eigene Funktion, weil zwei Beteiligte dieselbe Rente versteuern koennen: der
 * Sparer in der Auszahlphase und - innerhalb einer Rentengarantiezeit - die
 * Hinterbliebenen, dann aber mit *ihrem* Steuersatz (siehe todesfall.ts). Zwei
 * Rechenwege fuer dieselbe Frage waeren genau die Doppelung, aus der in diesem
 * Projekt schon mehrere Abweichungen entstanden sind.
 *
 * Der gefoerderte Teil ist voll nachgelagert steuerpflichtig
 * (§ 22 Nr. 5 S. 1 EStG), der ungefoerderte je Flag mit dem Ertragsanteil oder
 * nach dem Halbeinkuenfteverfahren. Der Werbungskosten-Pauschbetrag mindert
 * die Bemessungsgrundlage (§ 9a S. 1 Nr. 3 EStG).
 */
export function steuerAufRente(args: {
  monatsrenteBrutto: number;
  anteilGefoerdert: number;
  steuersatz: number;
  auszahlungsbeginnAlter: number;
  flags?: RechtsFlags;
}): number {
  const flags = args.flags ?? RECHTS_FLAGS_DEFAULT;
  const brutto = Math.max(0, args.monatsrenteBrutto || 0);
  const satz = Math.max(0, args.steuersatz || 0);
  const anteilGef = Math.min(1, Math.max(0, args.anteilGefoerdert));

  const steuerGef = brutto * anteilGef * satz;
  const renteUngef = brutto * (1 - anteilGef);
  const steuerUngef =
    flags.ungefoerderterTeilBesteuerung === 'ertragsanteil'
      ? renteUngef * ertragsanteilFuer(args.auszahlungsbeginnAlter) * satz
      : renteUngef * 0.5 * satz;
  const wkEntlastung =
    (Math.min(GESETZ.WERBUNGSKOSTEN_PAUSCHBETRAG_RENTE, brutto * 12) * satz) / 12;

  return Math.max(0, steuerGef + steuerUngef - wkEntlastung);
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

  const steuerProMonat = steuerAufRente({
    monatsrenteBrutto,
    anteilGefoerdert: anteilGef,
    steuersatz,
    auszahlungsbeginnAlter: e.auszahlungsbeginnAlter,
    flags,
  });

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
    anteilGefoerdert: anteilGef,
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
 * Monatsleistung der Gegenseite, in derselben Auszahlform wie das AVD.
 *
 * Für das freie Depot stehen die Zahlen schon fest. Für die Fondspolice und
 * den Riester-Altvertrag wird dieselbe Form gerechnet, die der Sparer für das
 * Altersvorsorgedepot gewählt hat: Leibrente mit demselben Rentenfaktor oder
 * Auszahlplan bis zum selben Endalter. Unterschiedlich sind nur Kapital und
 * Rendite – also genau das, was der Vergleich zeigen soll.
 *
 * Beide Kapitalien sind an dieser Stelle bereits versteuert (die Police über
 * das Halbeinkünfteverfahren, der Riester-Vertrag nachgelagert), deshalb fällt
 * brutto mit netto zusammen. Beim Depot nicht: Dort entsteht die Steuer erst
 * mit jeder Entnahme.
 */
function vergleichAuszahlungRechnen(args: {
  e: AvdEingabe;
  depot: DepotVergleich;
  riesterAlt?: RiesterAltErgebnis;
  fondsLv?: FondsLvErgebnis;
}): VergleichAuszahlung {
  const { e, depot, riesterAlt, fondsLv } = args;

  /** Dieselbe Auszahlform wie beim AVD, angewandt auf ein fremdes Kapital. */
  const wieDasAvd = (kapital: number, renditePaJahr: number, kostenPaJahr: number) => {
    if (e.auszahlform === 'leibrente') {
      return (Math.max(0, kapital) / 10000) * (e.rentenfaktorProZehntausend || 0);
    }
    const monate = Math.max(
      12,
      Math.round((e.auszahlplanEndalter - e.auszahlungsbeginnAlter) * 12)
    );
    const rMonat = calculateMonthlyReturn((renditePaJahr - kostenPaJahr) * 100);
    return monatlicheEntnahme(Math.max(0, kapital), rMonat, monate);
  };

  const form = e.auszahlform === 'leibrente' ? 'Leibrente' : 'Auszahlplan';

  if (riesterAlt) {
    const betrag = wieDasAvd(
      riesterAlt.endkapitalNachSteuer,
      e.riester?.renditeBruttoPaJahr ?? 0,
      e.riester?.effektivkostenPaJahr ?? 0
    );
    return {
      partner: 'riester_alt',
      name: 'Riester-Bestandsvertrag',
      monatlichBrutto: betrag,
      monatlichNetto: betrag,
      annahme:
        `Gerechnet als ${form} wie das Altersvorsorgedepot. Das Kapital ist ` +
        'nachgelagert versteuert (§ 22 Nr. 5 EStG), die Leistung also netto.',
    };
  }

  if (fondsLv) {
    const betrag = wieDasAvd(
      fondsLv.endkapitalNachSteuer,
      e.fondsLv?.renditeBruttoPaJahr ?? 0,
      e.fondsLv?.terPaJahr ?? 0
    );
    return {
      partner: 'fonds_lv',
      name: 'Fondspolice',
      monatlichBrutto: betrag,
      monatlichNetto: betrag,
      annahme:
        `Gerechnet als ${form} wie das Altersvorsorgedepot, aus dem zu ` +
        'Rentenbeginn bereits versteuerten Kapital. Eine Verrentung über den ' +
        'Ertragsanteil wäre milder.',
    };
  }

  return {
    partner: 'depot',
    name: 'Freies Depot',
    monatlichBrutto: depot.monatsentnahmeBrutto,
    monatlichNetto: depot.monatsentnahmeNetto,
    steuerAuszahlphase: depot.steuerAuszahlphase,
    annahme:
      'Entnahmeplan bis zum selben Endalter. Die Abgeltungsteuer fällt mit ' +
      'jeder Entnahme an, nicht auf einmal – deshalb steht hier brutto neben netto.',
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
