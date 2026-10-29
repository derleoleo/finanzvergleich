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

/**
 * Das rechnerisch beste Verhaeltnis zwischen AVD und Zweitvertrag.
 *
 * Abgrenzung zum `Aufteilungspunkt`: Der ist der Zulagenknick, eine reine
 * Rechtsgroesse - ab 360 EUR im Jahr halbiert sich die Grundzulage. Das
 * Optimum hier haengt zusaetzlich an Rendite, Kosten, Laufzeit und vor allem
 * am Steuersatz im Alter; es ist also nur so belastbar wie diese Annahmen.
 * Beides nebeneinander auszuweisen ist Absicht: Die eine Zahl ist Gesetz, die
 * andere eine Prognose.
 */
export type AufteilungsOptimum = {
  /** Bester AVD-Anteil in Euro je Monat; darf 0 oder der volle Beitrag sein. */
  monatsbeitrag: number;
  endkapitalNachSteuer: number;
  /** Was das Optimum gegenueber dem Zulagenknick bringt. Nie negativ. */
  vorteilGegenVorschlag: number;
  /** Spanne, in der das Ergebnis um weniger als `plateauToleranz` abweicht. */
  plateauVon: number;
  plateauBis: number;
  plateauToleranz: number;
  /**
   * Das Plateau deckt fast den ganzen Bereich ab - die Aufteilung ist dann
   * nahezu gleichgueltig, und eine Punktempfehlung waere Scheingenauigkeit.
   */
  weitgehendGleichgueltig: boolean;
  /** Abgetastete Punkte, von der Oberflaeche als Kurve verwendbar. */
  stuetzstellen: { monatlich: number; endkapital: number }[];
};

export type StrategienErgebnis = {
  aufteilungspunkt: Aufteilungspunkt;
  /** Rechnerisches Optimum; fehlt, wenn nichts aufzuteilen ist. */
  optimum?: AufteilungsOptimum;
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

/**
 * Was eine Strategie wirklich aus eigener Tasche kostet (Audit A06).
 *
 * Die Steuererstattung mindert den Aufwand nur dann, wenn sie dem Sparer
 * zufliesst. Wird sie wieder eingezahlt, landet sie im Kapital - dann ist der
 * Aufwand der volle Eigenbeitrag. Dieselbe Unterscheidung trifft die
 * Hauptsimulation (simulation.ts: `eigenerAufwand`); hier wurde die Erstattung
 * bisher immer abgezogen und der Aufwand damit zu niedrig ausgewiesen.
 */
function nettoaufwand(
  beitraege: number,
  erstattung: number,
  erstattungReinvestieren: boolean
): number {
  return erstattungReinvestieren ? beitraege : beitraege - erstattung;
}

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
  /*
   * Die Vergleichsbasis aus Abschnitt 3 gilt auch hier.
   *
   * Vorher erzwang diese Funktion „gleicher Bruttobeitrag“, mit der
   * Begruendung, sonst verglichen die Kacheln unterschiedlich grosse Budgets.
   * Die Begruendung stimmt nur fuer die naive Umsetzung: Wenn der
   * Zweitvertrag der Kombination den vollen Restbeitrag bekommt, der reine
   * Vergleichspartner aber den um die Erstattung verminderten, dann ja.
   *
   * Der Preis war ein Widerspruch im selben Bild: Die Waage wies das
   * Altersvorsorgedepot mit 34 % vorn aus, die Kachel darunter setzte den
   * Stern auf das freie Depot - weil dort beide Seiten gleich viel Geld
   * bekamen und hier nicht. Beide Rechnungen stimmten, nebeneinander waren
   * sie unbrauchbar.
   *
   * Jetzt traegt jeder Weg dasselbe Budget im Sinne der gewaehlten Basis:
   * bei „gleicher Bruttobeitrag“ denselben Beitrag, bei „gleicher
   * Netto-Aufwand“ dieselben Kosten aus eigener Tasche. Der Restbeitrag der
   * Kombination ergibt sich dann aus dem, was nach dem AVD-Teil vom
   * Eigenaufwand uebrig ist (siehe `restBeitrag`).
   *
   * Die Beitragsdynamik bleibt aussen vor: Der foerderoptimale Betrag ist
   * eine feste Grenze im Gesetz und waechst nicht mit.
   */
  const ohneDynamik: AvdEingabe = {
    ...args.basis,
    beitragsdynamikPaJahr: 0,
  };
  const nachNettoaufwand = ohneDynamik.vergleichsmodus === 'gleicher_nettoaufwand';
  const voll = Math.max(0, ohneDynamik.eigenbeitragMonatlich);
  const hinweise: Hinweis[] = [];

  /**
   * Was ein AVD-Beitrag im Monat wirklich aus eigener Tasche kostet.
   *
   * `jahre[].nettoAufwand` ist Beitrag minus Erstattung und kennt nicht, ob
   * die Erstattung wieder eingezahlt wird. Wird sie es, ist der eigene
   * Aufwand der volle Beitrag - dieselbe Unterscheidung wie in
   * `simulation.ts` (`eigenerAufwand`).
   */
  const eigenerAufwandMonat = (lauf: ReturnType<typeof simuliereAvd>, beitragMonat: number) =>
    ohneDynamik.erstattungReinvestieren
      ? beitragMonat
      : (lauf.jahre[0]?.nettoAufwand ?? beitragMonat * 12) / 12;

  // --- X: alles in den AVD -------------------------------------------------
  const avdVoll = simuliereAvd(ohneDynamik);
  const jahre = avdVoll.jahreBisAuszahlung;
  const deflator = deflatorFuer(ohneDynamik.inflationPaJahr, jahre);
  const real = (wert: number) => wert / deflator;

  /**
   * Das Budget, das jeder der drei Wege zur Verfuegung hat - im Sinne der
   * gewaehlten Vergleichsbasis. Bei „gleicher Bruttobeitrag“ ist es der
   * Beitrag selbst, bei „gleicher Netto-Aufwand“ das, was „alles ins AVD“
   * aus eigener Tasche kostet.
   */
  const budgetMonat = nachNettoaufwand ? eigenerAufwandMonat(avdVoll, voll) : voll;

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

  // --- Z: Aufteilung -------------------------------------------------------
  // Steht hier oben, weil der Restbeitrag erst aus der Rechnung faellt: Bei
  // „gleicher Netto-Aufwand“ haengt er davon ab, wie viel Erstattung der
  // AVD-Teil bringt.
  const { avdTeil, zweit, rest } = kombinationRechnen(
    ohneDynamik,
    aufteilung,
    budgetMonat,
    nachNettoaufwand,
    args.zweitvertrag,
    jahre
  );
  const kombinationEntfaellt = rest <= 0;

  if (nachNettoaufwand) {
    hinweise.push({
      art: 'info',
      text:
        'Vergleichsbasis „gleicher Netto-Aufwand“: Alle drei Wege kosten dasselbe ' +
        'aus eigener Tasche. Weil der Altersvorsorgedepot-Teil eine Steuererstattung ' +
        'bringt, sind die eingezahlten Beträge dabei nicht gleich groß – was jede ' +
        'Variante einzahlt und was sie kostet, steht in ihrer Kachel. Mit der ' +
        'Vergleichsbasis „gleicher Bruttobeitrag“ bekommen stattdessen alle ' +
        'denselben Beitrag.',
    });
  }

  if (args.basis.beitragsdynamikPaJahr > 0) {
    hinweise.push({
      art: 'info',
      text:
        'Der Strategievergleich rechnet ohne Beitragsdynamik. Der förderoptimale ' +
        'Betrag ist eine feste Grenze im Gesetz und wächst nicht mit dem Beitrag – ' +
        'mit Dynamik wären die drei Wege nicht mehr vergleichbar.',
    });
  }

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
    summeNettoaufwand: nettoaufwand(
      avdVoll.summeEigenbeitraege,
      avdVoll.summeSteuererstattung,
      ohneDynamik.erstattungReinvestieren
    ),
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

  // Audit A06: Der Riester-Bestandsvertrag ist selbst gefoerdert. Ihn mit
  // null Foerderung und vollem Eigenaufwand auszuweisen, waehrend seine
  // Zulagen in die Endkapitalrechnung eingehen, widerspricht der eigenen
  // Rechnung. Depot und Fondspolice sind dagegen tatsaechlich ungefoerdert.
  const alt = avdVoll.riesterAlt;
  /*
   * Einzahlungen des reinen Vergleichswegs. Beim freien Depot weiss die
   * Simulation sie genau; die beiden anderen Mäntel bekommen dort den vollen
   * Bruttobeitrag.
   */
  const beitraegeY = avdVoll.riesterAlt
    ? avdVoll.summeEigenbeitraege
    : (avdVoll.fondsLv?.eingezahlt ?? avdVoll.depot.eingezahlt);
  const beitragY = jahre > 0 ? beitraegeY / jahre / 12 : 0;

  const strategieY: Strategie = {
    id: 'vergleich_voll',
    bezeichnung: `Alles in ${nameVergleichspartner(ohneDynamik)}`,
    aufteilungText: `${eur(voll)}/Monat ${nameVergleichspartner(ohneDynamik)}`,
    beitragAvdMonatlich: 0,
    beitragZweitMonatlich: beitragY,
    /*
     * Was der Vergleichspartner tatsaechlich bekommt. Bei „gleicher
     * Netto-Aufwand“ ist das weniger als der Bruttobeitrag - genau das sagt
     * diese Vergleichsbasis. Vorher stand hier immer der volle AVD-Beitrag,
     * und die Kachel behauptete eine Einzahlung, die es nicht gab.
     *
     * Depot und Fondspolice bekommen beide den Eigenaufwand. Nur der
     * Riester-Altvertrag laeuft weiter mit dem vollen Beitrag: Er ist selbst
     * gefoerdert und bringt eine eigene Erstattung mit, der Begriff
     * „Eigenaufwand des AVD-Wegs“ trifft ihn nicht.
     */
    summeEigenbeitraege: beitraegeY,
    summeNettoaufwand: alt
      ? nettoaufwand(
          beitraegeY,
          alt.summeSteuererstattung,
          ohneDynamik.erstattungReinvestieren
        )
      : beitraegeY,
    summeFoerderung: alt ? alt.summeFoerderung : 0,
    endkapitalNachSteuer: endkapitalY,
    endkapitalNachSteuerReal: real(endkapitalY),
    kapitalProJahr: kapitalProJahrY,
  };

  const beitraegeZ = avdTeil.summeEigenbeitraege + rest * 12 * jahre;

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
    /*
     * Der Zweitvertrag ist ungefoerdert: Die Foerdersumme stammt allein aus
     * dem AVD-Teil. Die Einzahlungen sind die beider Teile zusammen - vorher
     * stand hier der Beitrag von X, was bei „gleicher Netto-Aufwand“ nicht
     * mehr derselbe Betrag ist.
     */
    summeEigenbeitraege: beitraegeZ,
    summeNettoaufwand: nettoaufwand(
      beitraegeZ,
      avdTeil.summeSteuererstattung,
      ohneDynamik.erstattungReinvestieren
    ),
    summeFoerderung: avdTeil.summeFoerderung,
    endkapitalNachSteuer: avdTeil.endkapitalNachSteuer + zweit.endkapitalNachSteuer,
    endkapitalNachSteuerReal: real(avdTeil.endkapitalNachSteuer + zweit.endkapitalNachSteuer),
    kapitalProJahr: addiereReihen(
      avdTeil.jahre.map((j) => j.kapitalGesamt),
      zweit.kapitalProJahr
    ),
  };
  hinweise.push(...zweit.hinweise);

  // --- Rechnerisches Optimum ----------------------------------------------
  // Der Zulagenknick ist eine Rechtsgroesse und oft nicht der beste Punkt:
  // Solange der Steuersatz im Alter niedrig ist, schlaegt der gefoerderte
  // Vertrag das Depot auch oberhalb von 360 EUR im Jahr. Deshalb wird der
  // tatsaechliche Hochpunkt gesucht und beides nebeneinander ausgewiesen.
  const obergrenzeAufteilung = Math.min(voll, GESETZ.EINZAHLUNG_MAX / 12);
  let optimum: AufteilungsOptimum | undefined;
  if (voll > 0 && obergrenzeAufteilung > 0) {
    const amVorschlag = Math.max(0, Math.min(obergrenzeAufteilung, vorschlag));
    const endkapitalVorschlag = kombinationRechnen(
      ohneDynamik,
      amVorschlag,
      budgetMonat,
      nachNettoaufwand,
      args.zweitvertrag,
      jahre
    ).endkapital;
    optimum = sucheOptimum({
      ohneDynamik,
      budgetMonat,
      nachNettoaufwand,
      obergrenze: obergrenzeAufteilung,
      zweitvertrag: args.zweitvertrag,
      jahre,
      endkapitalVorschlag,
      // Die Stellen, an denen die Foerderung springt: der Zulagenknick, die
      // Grenze des gefoerderten Eigenbeitrags und der Einzahlungsdeckel.
      knicke: [
        aufteilungspunkt.monatsbeitrag,
        GESETZ.GEFOERDERTER_EIGENBEITRAG_MAX / 12,
        GESETZ.EINZAHLUNG_MAX / 12,
      ],
    });
  }

  const strategien = [strategieX, strategieY, strategieZ];
  // Eine gesetzlich unmögliche Variante darf nicht als Sieger erscheinen
  const waehlbar = strategien.filter((s) => !s.unzulaessig);
  const beste = (waehlbar.length > 0 ? waehlbar : strategien).reduce((a, b) =>
    b.endkapitalNachSteuer > a.endkapitalNachSteuer ? b : a
  ).id;

  return {
    aufteilungspunkt,
    optimum,
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

/**
 * Ein Durchlauf der Aufteilung. Eigene Funktion, damit die Suche nach dem
 * Optimum garantiert denselben Rechenweg nimmt wie die angezeigte Kachel -
 * sonst stuende im Vorschlag eine Zahl, die die Kachel nicht bestaetigt.
 */
/**
 * Ein AVD-Teil plus Zweitvertrag, beides zusammen genau ein Budget gross.
 *
 * Der Restbeitrag wird hier berechnet und nicht uebergeben: Bei „gleicher
 * Netto-Aufwand“ ist er das, was vom Eigenaufwand uebrig bleibt, nachdem der
 * AVD-Teil bezahlt ist - und wie viel das ist, weiss man erst, wenn dessen
 * Steuererstattung feststeht. Bei „gleicher Bruttobeitrag“ bleibt es beim
 * schlichten Rest des Beitrags.
 */
function kombinationRechnen(
  ohneDynamik: AvdEingabe,
  aufteilung: number,
  budgetMonat: number,
  nachNettoaufwand: boolean,
  zweitvertrag: ZweitvertragArt,
  jahre: number
) {
  const avdTeil = simuliereAvd({ ...ohneDynamik, eigenbeitragMonatlich: aufteilung });
  const aufwandTeil = ohneDynamik.erstattungReinvestieren
    ? aufteilung
    : (avdTeil.jahre[0]?.nettoAufwand ?? aufteilung * 12) / 12;
  const rest = Math.max(0, budgetMonat - (nachNettoaufwand ? aufwandTeil : aufteilung));
  const zweit = zweitvertragRechnen(ohneDynamik, rest, zweitvertrag, jahre);
  return {
    avdTeil,
    zweit,
    rest,
    endkapital: avdTeil.endkapitalNachSteuer + zweit.endkapitalNachSteuer,
  };
}

/** Anteil des Endkapitals, innerhalb dessen zwei Aufteilungen als gleichwertig gelten. */
const PLATEAU_ANTEIL = 0.005;

/**
 * Sucht den Aufteilungsbetrag mit dem hoechsten Endkapital nach Steuern.
 *
 * Bewusst ein Raster und keine Ternaersuche: Die Kurve ist nicht eingipflig.
 * Knapp oberhalb von null faellt sie zunaechst ab - ein kleiner Beitrag bindet
 * Geld bis 65 im nachgelagert besteuerten Vertrag, loest aber noch keine volle
 * Zulage aus. Danach steigt sie bis zum Zulagenknick. Eine Suche, die
 * Eingipfligkeit unterstellt, liefe in dieses lokale Tal.
 *
 * Drei Durchgaenge: die gesetzlich ausgezeichneten Punkte und Raender, ein
 * grobes Raster darueber, dann ein feines um den Treffer. Die Knicke einzeln
 * zu pruefen ist noetig, weil ein Raster sie sonst ueberspringen kann - und
 * genau dort liegt das Optimum haeufig.
 */
function sucheOptimum(args: {
  ohneDynamik: AvdEingabe;
  /** Budget je Monat im Sinne der gewaehlten Vergleichsbasis. */
  budgetMonat: number;
  nachNettoaufwand: boolean;
  obergrenze: number;
  zweitvertrag: ZweitvertragArt;
  jahre: number;
  /** Endkapital des Zulagenknicks, als Vergleichsmassstab. */
  endkapitalVorschlag: number;
  /** Stellen, an denen die Foerderung springt - sie gehoeren immer geprueft. */
  knicke: number[];
}): AufteilungsOptimum {
  const { ohneDynamik, budgetMonat, nachNettoaufwand, obergrenze, zweitvertrag, jahre } = args;
  const bewertet = new Map<number, number>();
  const bewerte = (a: number): number => {
    // Erst runden, dann begrenzen. Die umgekehrte Reihenfolge hob den Rand
    // wieder an: Bei 29,80 EUR Budget wurde aus der Obergrenze ein Vorschlag
    // von 30 EUR, und fuer den Zweitvertrag blieben -0,20 EUR. Der Rand behaelt
    // so seine Cents, das Raster dazwischen bleibt in ganzen Euro.
    const punkt = Math.min(obergrenze, Math.max(0, Math.round(a)));
    const vorhanden = bewertet.get(punkt);
    if (vorhanden !== undefined) return vorhanden;
    const k = kombinationRechnen(
      ohneDynamik,
      punkt,
      budgetMonat,
      nachNettoaufwand,
      zweitvertrag,
      jahre
    ).endkapital;
    bewertet.set(punkt, k);
    return k;
  };

  // Raender und gesetzliche Knicke zuerst - haeufig liegt das Optimum dort
  bewerte(0);
  bewerte(obergrenze);
  for (const k of args.knicke) bewerte(k);

  // Grobes Raster: rund 40 Punkte, mindestens 1 EUR Schrittweite
  const grob = Math.max(1, Math.round(obergrenze / 40));
  for (let a = 0; a <= obergrenze; a += grob) bewerte(a);

  const besterAus = (): number => {
    let b = 0;
    let hoch = -Infinity;
    for (const [a, k] of bewertet) {
      if (k > hoch) {
        hoch = k;
        b = a;
      }
    }
    return b;
  };

  let bester = besterAus();

  // Feines Raster um den Treffer, damit der Hochpunkt nicht zwischen zwei
  // Rasterpunkten verschwindet
  if (grob > 1) {
    const von = Math.max(0, bester - grob);
    const bis = Math.min(obergrenze, bester + grob);
    for (let a = von; a <= bis; a++) bewerte(a);
    bester = besterAus();
  }

  const hoechstes = bewertet.get(bester) ?? 0;
  const toleranz = Math.abs(hoechstes) * PLATEAU_ANTEIL;

  /**
   * Die Spanne, in der die Aufteilung kaum einen Unterschied macht.
   *
   * Entscheidend ist, dass sie **zusammenhaengend** ist: Frueher wurde einfach
   * der kleinste und groesste Punkt innerhalb der Toleranz genommen. Bei einer
   * Kurve mit Tal lagen dazwischen Punkte, die weit darunter lagen - die
   * Oberflaeche behauptete dann fuer den ganzen Bereich, die Wahl sei
   * gleichgueltig. Deshalb wird vom Hochpunkt aus in Ein-Euro-Schritten nach
   * aussen gegangen, solange die Toleranz haelt, und beim ersten Ausreisser
   * abgebrochen.
   */
  const haeltToleranz = (a: number) => bewerte(a) >= hoechstes - toleranz;

  /**
   * Naechster Rasterpunkt nach aussen, innerhalb der Grenzen.
   *
   * `null` heisst: Der Rand ist erreicht. Ohne diese Abfrage lief die Schleife
   * bei einem Budget mit Cents ueber die Grenze hinaus - der naechste Punkt
   * wurde beim Rechnen auf die Obergrenze zurueckgeholt, hielt die Toleranz
   * damit zwangslaeufig, und das Plateau endete oberhalb des Budgets.
   */
  const nachAussen = (a: number, richtung: 1 | -1): number | null => {
    const roh = richtung === 1 ? Math.floor(a) + 1 : Math.ceil(a) - 1;
    const begrenzt = Math.min(obergrenze, Math.max(0, roh));
    return begrenzt === a ? null : begrenzt;
  };

  let plateauVon = bester;
  for (;;) {
    const naechster = nachAussen(plateauVon, -1);
    if (naechster === null || !haeltToleranz(naechster)) break;
    plateauVon = naechster;
  }
  let plateauBis = bester;
  for (;;) {
    const naechster = nachAussen(plateauBis, 1);
    if (naechster === null || !haeltToleranz(naechster)) break;
    plateauBis = naechster;
  }

  const stuetzstellen = [...bewertet.entries()]
    .map(([monatlich, endkapital]) => ({ monatlich, endkapital }))
    .sort((x, y) => x.monatlich - y.monatlich);

  return {
    monatsbeitrag: bester,
    endkapitalNachSteuer: hoechstes,
    vorteilGegenVorschlag: Math.max(0, hoechstes - args.endkapitalVorschlag),
    plateauVon,
    plateauBis,
    plateauToleranz: toleranz,
    // Deckt das Plateau fast den ganzen Bereich ab, ist die Wahl beinahe
    // gleichgueltig und eine Punktempfehlung Scheingenauigkeit.
    weitgehendGleichgueltig: obergrenze > 0 && plateauBis - plateauVon >= obergrenze * 0.8,
    stuetzstellen,
  };
}
