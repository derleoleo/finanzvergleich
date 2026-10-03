// src/lib/finance/avd/strategien.ts
// Kombinationsstrategie „30 + 1": Ein Teil des Beitrags geht in den
// geförderten Altersvorsorgedepot-Vertrag, der Rest in einen zweiten Vertrag.
//
// Verglichen werden drei Wege bei gleichem Eigenaufwand:
//   X  alles in den AVD
//   Y  alles in den Vergleichspartner
//   Z  Aufteilung – bis zum förderoptimalen Punkt in den AVD, der Rest daneben
//
// Warum ein eigenes Modul und keine Erweiterung von `simuliereAvd`:
// `eigenbeitragMonatlich` ist dort ein einzelner Betrag, und das
// Vergleichsdepot hängt fest im Hauptloop. Eine Aufteilung im Eingabetyp zu
// verankern würde jeden Aufrufer und die bestehenden Tests anfassen. Stattdessen
// wird `simuliereAvd` mehrfach mit unterschiedlichen Beiträgen aufgerufen – so
// laufen X und der AVD-Teil von Z garantiert durch denselben Code, und es
// entsteht kein zweiter Rechenweg für Zulagen, den 1.800-€-Split und den
// verzögerten Zulagenzufluss.
//
// Die Beitragsdynamik bleibt hier bewusst außen vor: Der Aufteilungspunkt ist
// ein fester Betrag im Gesetz und wächst nicht mit dem Beitrag. Alle drei
// Varianten rechnen deshalb mit konstantem Beitrag, damit sie vergleichbar
// bleiben. Die Oberfläche muss das sagen, wenn eine Dynamik eingetragen ist.

import { GESETZ } from './config';
import { deflatorFuer, simuliereAvd, type AvdEingabe, type Hinweis } from './simulation';
import { simuliereFondsLv } from './fondslv';
import { foerderoptimalerAvdBeitrag, type Aufteilungspunkt } from './zulagen';

export type ZweitvertragArt = 'depot' | 'fonds_lv';
export type StrategieId = 'avd_voll' | 'vergleich_voll' | 'kombination';

export type Strategie = {
  id: StrategieId;
  bezeichnung: string;
  /** Aufteilung im Klartext, z. B. „30 €/Monat AVD + 50 €/Monat Fondspolice". */
  aufteilungText: string;
  beitragAvdMonatlich: number;
  beitragZweitMonatlich: number;
  summeEigenbeitraege: number;
  /**
   * Was die Strategie tatsächlich aus eigener Tasche kostet: Beiträge abzüglich
   * der Steuererstattung, die nicht reinvestiert wird. Ohne diese Zahl wäre
   * „gleicher Eigenaufwand" eine Behauptung – die Bruttobeiträge sind zwar
   * gleich, der Nettoaufwand ist es nicht.
   */
  summeNettoaufwand: number;
  summeFoerderung: number;
  endkapitalNachSteuer: number;
  endkapitalNachSteuerReal: number;
  /**
   * Gesetzlich nicht möglich – z. B. weil der Beitrag den Einzahlungsdeckel
   * des geförderten Vertrags übersteigt. Die Zahl bleibt stehen, damit der
   * Abstand sichtbar ist, zählt aber nicht als Sieger.
   */
  unzulaessig?: string;
  /** Kapital am Ende jedes Laufzeitjahres, vor der abschließenden Besteuerung. */
  kapitalProJahr: number[];
};

export type StrategienErgebnis = {
  aufteilungspunkt: Aufteilungspunkt;
  /** Tatsächlich verwendeter Aufteilungsbetrag (Vorschlag oder Eingabe). */
  aufteilungMonatlich: number;
  /** true, wenn der Beitrag den Aufteilungspunkt nicht übersteigt – Z wäre X. */
  kombinationEntfaellt: boolean;
  strategien: Strategie[];
  /** Variante mit dem höchsten Endkapital nach Steuern. */
  beste: StrategieId;
  hinweise: Hinweis[];
};

const eur = (betrag: number) => `${Math.round(betrag).toLocaleString('de-DE')} €`;

/** Elementweise Summe zweier Jahresreihen; fehlende Jahre zählen als 0. */
function addiereReihen(a: number[], b: number[]): number[] {
  const laenge = Math.max(a.length, b.length);
  return Array.from({ length: laenge }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0));
}

function nameZweitvertrag(art: ZweitvertragArt): string {
  return art === 'fonds_lv' ? 'Fondspolice' : 'freies Depot';
}

function nameVergleichspartner(e: AvdEingabe): string {
  if (e.vergleichspartner === 'riester_alt') return 'Riester-Bestandsvertrag';
  if (e.vergleichspartner === 'fonds_lv') return 'Fondspolice';
  return 'freies Depot';
}

export function berechneStrategien(args: {
  basis: AvdEingabe;
  /** Überschreibt den berechneten Punkt. Fehlt er, gilt der Vorschlag. */
  aufteilungMonatlich?: number;
  zweitvertrag: ZweitvertragArt;
}): StrategienErgebnis {
  // Alle drei Wege bekommen denselben Bruttobeitrag. Im Modus „gleicher
  // Netto-Aufwand" erhielte der Vergleichspartner nur den um die Erstattung
  // verminderten Betrag, der Zweitvertrag der Kombination aber den vollen
  // Restbeitrag – dann verglichen die Kacheln unterschiedlich große Budgets.
  const ohneDynamik: AvdEingabe = {
    ...args.basis,
    beitragsdynamikPaJahr: 0,
    vergleichsmodus: 'gleicher_bruttobeitrag',
  };
  const voll = Math.max(0, ohneDynamik.eigenbeitragMonatlich);
  const hinweise: Hinweis[] = [];

  if (args.basis.vergleichsmodus === 'gleicher_nettoaufwand') {
    hinweise.push({
      art: 'info',
      text:
        'Der Strategievergleich rechnet alle drei Wege mit demselben Bruttobeitrag. ' +
        'Nur so sind sie vergleichbar – die Vergleichsbasis „gleicher Netto-Aufwand" ' +
        'aus Abschnitt 3 gilt hier nicht.',
    });
  }

  const aufteilungspunkt = foerderoptimalerAvdBeitrag({
    kinder: ohneDynamik.kinder,
    berechtigung: ohneDynamik.berechtigung,
    eigenbeitragEhegatteUnmittelbar: ohneDynamik.eigenbeitragEhegatteUnmittelbar,
    flags: ohneDynamik.flags,
  });

  const vorschlag = aufteilungspunkt.monatsbeitrag;
  const gewuenscht = args.aufteilungMonatlich ?? vorschlag;
  // Nie mehr in den AVD stecken, als überhaupt gespart wird
  const aufteilung = Math.max(0, Math.min(voll, gewuenscht));
  const rest = Math.max(0, voll - aufteilung);
  const kombinationEntfaellt = rest <= 0;

  if (args.basis.beitragsdynamikPaJahr > 0) {
    hinweise.push({
      art: 'info',
      text:
        'Der Strategievergleich rechnet ohne Beitragsdynamik. Der förderoptimale ' +
        'Betrag ist eine feste Grenze im Gesetz und wächst nicht mit dem Beitrag – ' +
        'mit Dynamik wären die drei Wege nicht mehr vergleichbar.',
    });
  }

  // --- X: alles in den AVD -------------------------------------------------
  const avdVoll = simuliereAvd(ohneDynamik);
  const jahre = avdVoll.jahreBisAuszahlung;
  const deflator = deflatorFuer(ohneDynamik.inflationPaJahr, jahre);
  const real = (wert: number) => wert / deflator;

  // Der geförderte Vertrag nimmt nur begrenzt Geld auf (§ 1 Abs. 1 Nr. 5
  // AltZertG). Darüber ist „alles ins AVD" keine Option mehr, sondern die
  // Aufteilung die einzige Möglichkeit, den vollen Betrag anzulegen.
  const deckelMonatlich = GESETZ.EINZAHLUNG_MAX / 12;
  const ueberEinzahlungsdeckel = voll * 12 > GESETZ.EINZAHLUNG_MAX;
  // Derselbe Deckel gilt für den AVD-Teil der Aufteilung. Ein überschriebener
  // Aufteilungsbetrag darf ihn nicht umgehen – sonst wäre die Kombination
  // wählbar, obwohl der Vertrag das Geld gar nicht annimmt.
  const aufteilungUeberDeckel = aufteilung * 12 > GESETZ.EINZAHLUNG_MAX;
  if (aufteilungUeberDeckel && !ueberEinzahlungsdeckel) {
    hinweise.push({
      art: 'warnung',
      text:
        `Der eingetragene Aufteilungsbetrag übersteigt den Höchstbetrag von ` +
        `${eur(deckelMonatlich)} im Monat (${eur(GESETZ.EINZAHLUNG_MAX)} pro Jahr, ` +
        `§ 1 Abs. 1 Nr. 5 AltZertG).`,
    });
  }
  if (ueberEinzahlungsdeckel) {
    hinweise.push({
      art: 'warnung',
      text:
        `Mehr als ${eur(GESETZ.EINZAHLUNG_MAX / 12)} im Monat nimmt der geförderte ` +
        `Vertrag nicht an (Höchstbetrag ${eur(GESETZ.EINZAHLUNG_MAX)} pro Jahr, ` +
        `§ 1 Abs. 1 Nr. 5 AltZertG). Der Betrag darüber muss ohnehin woanders hin – ` +
        `eine Aufteilung ist hier keine Wahl, sondern notwendig.`,
    });
  }

  const strategieX: Strategie = {
    id: 'avd_voll',
    bezeichnung: 'Alles ins Altersvorsorgedepot',
    aufteilungText: `${eur(voll)}/Monat Altersvorsorgedepot`,
    beitragAvdMonatlich: voll,
    beitragZweitMonatlich: 0,
    summeEigenbeitraege: avdVoll.summeEigenbeitraege,
    summeNettoaufwand: avdVoll.summeEigenbeitraege - avdVoll.summeSteuererstattung,
    summeFoerderung: avdVoll.summeFoerderung,
    endkapitalNachSteuer: avdVoll.endkapitalNachSteuer,
    endkapitalNachSteuerReal: avdVoll.endkapitalNachSteuerReal,
    kapitalProJahr: avdVoll.jahre.map((j) => j.kapitalGesamt),
    unzulaessig: ueberEinzahlungsdeckel
      ? `Nicht möglich: über dem Höchstbetrag von ${eur(GESETZ.EINZAHLUNG_MAX)} pro Jahr`
      : undefined,
  };

  // --- Y: alles in den Vergleichspartner -----------------------------------
  let endkapitalY: number;
  let kapitalProJahrY: number[];
  if (avdVoll.riesterAlt) {
    endkapitalY = avdVoll.riesterAlt.endkapitalNachSteuer;
    kapitalProJahrY = avdVoll.riesterAlt.kapitalProJahr;
  } else if (avdVoll.fondsLv) {
    endkapitalY = avdVoll.fondsLv.endkapitalNachSteuer;
    kapitalProJahrY = avdVoll.fondsLv.kapitalProJahr;
  } else {
    endkapitalY = avdVoll.depot.endkapitalNetto;
    kapitalProJahrY = avdVoll.jahre.map((j) => j.depotKapital);
  }

  const strategieY: Strategie = {
    id: 'vergleich_voll',
    bezeichnung: `Alles in ${nameVergleichspartner(ohneDynamik)}`,
    aufteilungText: `${eur(voll)}/Monat ${nameVergleichspartner(ohneDynamik)}`,
    beitragAvdMonatlich: 0,
    beitragZweitMonatlich: voll,
    summeEigenbeitraege: avdVoll.summeEigenbeitraege,
    summeNettoaufwand: avdVoll.summeEigenbeitraege,
    summeFoerderung: 0,
    endkapitalNachSteuer: endkapitalY,
    endkapitalNachSteuerReal: real(endkapitalY),
    kapitalProJahr: kapitalProJahrY,
  };

  // --- Z: Aufteilung -------------------------------------------------------
  const avdTeil = simuliereAvd({ ...ohneDynamik, eigenbeitragMonatlich: aufteilung });
  const zweit = zweitvertragRechnen(ohneDynamik, rest, args.zweitvertrag, jahre);

  const strategieZ: Strategie = {
    id: 'kombination',
    bezeichnung: 'Aufteilung',
    unzulaessig: aufteilungUeberDeckel
      ? `Nicht möglich: ${eur(aufteilung)} im Monat übersteigen den Höchstbetrag von ${eur(GESETZ.EINZAHLUNG_MAX)} pro Jahr`
      : undefined,
    aufteilungText: kombinationEntfaellt
      ? `${eur(voll)}/Monat Altersvorsorgedepot`
      : `${eur(aufteilung)}/Monat Altersvorsorgedepot + ${eur(rest)}/Monat ${nameZweitvertrag(args.zweitvertrag)}`,
    beitragAvdMonatlich: aufteilung,
    beitragZweitMonatlich: rest,
    // Der Zweitvertrag ist ungefördert: Die Fördersumme stammt allein aus dem
    // AVD-Teil, und der Eigenaufwand ist derselbe wie in X und Y.
    summeEigenbeitraege: avdVoll.summeEigenbeitraege,
    summeNettoaufwand: avdVoll.summeEigenbeitraege - avdTeil.summeSteuererstattung,
    summeFoerderung: avdTeil.summeFoerderung,
    endkapitalNachSteuer: avdTeil.endkapitalNachSteuer + zweit.endkapitalNachSteuer,
    endkapitalNachSteuerReal: real(avdTeil.endkapitalNachSteuer + zweit.endkapitalNachSteuer),
    kapitalProJahr: addiereReihen(
      avdTeil.jahre.map((j) => j.kapitalGesamt),
      zweit.kapitalProJahr
    ),
  };
  hinweise.push(...zweit.hinweise);

  const strategien = [strategieX, strategieY, strategieZ];
  // Eine gesetzlich unmögliche Variante darf nicht als Sieger erscheinen
  const waehlbar = strategien.filter((s) => !s.unzulaessig);
  const beste = (waehlbar.length > 0 ? waehlbar : strategien).reduce((a, b) =>
    b.endkapitalNachSteuer > a.endkapitalNachSteuer ? b : a
  ).id;

  return {
    aufteilungspunkt,
    aufteilungMonatlich: aufteilung,
    kombinationEntfaellt,
    strategien,
    beste,
    hinweise,
  };
}

/**
 * Der zweite Vertrag mit dem Restbeitrag.
 *
 * Für das freie Depot wird `simuliereAvd` ein weiteres Mal aufgerufen und nur
 * dessen Depotzweig verwendet. Das sieht umständlich aus, ist aber Absicht:
 * Der Depotzweig ist die einzige Stelle im Projekt, die die Vorabpauschale
 * zeitanteilig rechnet und die Entnahmen besteuert. Ihn nachzubauen hieße,
 * zwei Depotmodelle zu pflegen. `gleicher_bruttobeitrag` sorgt dafür, dass das
 * Depot genau den Restbeitrag bekommt; der dabei mitgerechnete AVD-Teil wird
 * verworfen.
 */
function zweitvertragRechnen(
  basis: AvdEingabe,
  monatsbeitrag: number,
  art: ZweitvertragArt,
  jahre: number
): { endkapitalNachSteuer: number; kapitalProJahr: number[]; hinweise: Hinweis[] } {
  if (monatsbeitrag <= 0) {
    return { endkapitalNachSteuer: 0, kapitalProJahr: Array(jahre).fill(0), hinweise: [] };
  }

  if (art === 'fonds_lv') {
    const lv = basis.fondsLv;
    if (!lv) {
      return {
        endkapitalNachSteuer: 0,
        kapitalProJahr: Array(jahre).fill(0),
        hinweise: [
          { art: 'fehler', text: 'Für die Fondspolice fehlen die Kostenangaben.' },
        ],
      };
    }
    const r = simuliereFondsLv({
      jahre,
      beitragMonatlich: monatsbeitrag,
      renditeBruttoPaJahr: lv.renditeBruttoPaJahr,
      terPaJahr: lv.terPaJahr,
      kosten:
        lv.kostenart === 'eur'
          ? {
              art: 'eur',
              abschlusskostenGesamt: lv.abschlusskostenGesamt,
              verwaltungProMonat: lv.verwaltungProMonat,
            }
          : { art: 'prozent', effektivkostenPaJahr: lv.effektivkostenPaJahr },
      alterBeiAuszahlung: basis.auszahlungsbeginnAlter,
      steuersatzImAlter: basis.steuersatzImAlter,
      soliBeruecksichtigen: basis.soliBeruecksichtigen,
      kirchensteuersatz: basis.kirchensteuersatz,
      auszahlplanEndalter: basis.auszahlplanEndalter,
    });
    return {
      endkapitalNachSteuer: r.endkapitalNachSteuer,
      kapitalProJahr: r.kapitalProJahr,
      hinweise: [],
    };
  }

  const nurDepot = simuliereAvd({
    ...basis,
    eigenbeitragMonatlich: monatsbeitrag,
    vergleichsmodus: 'gleicher_bruttobeitrag',
    vergleichspartner: 'depot',
    // Die Wechselanalyse wird hier nicht gebraucht und kostet nur Rechenzeit
    bestandsvertrag: undefined,
  });
  return {
    endkapitalNachSteuer: nurDepot.depot.endkapitalNetto,
    kapitalProJahr: nurDepot.jahre.map((j) => j.depotKapital),
    hinweise: [],
  };
}
