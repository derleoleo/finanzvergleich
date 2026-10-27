// Was bleibt den Hinterbliebenen, wenn der Sparer stirbt?
//
// Der Rechner zeigte bisher nur den planmäßigen Verlauf: Der Kunde lebt bis
// zum Auszahlungsbeginn und verbraucht sein Kapital. Genau im Todesfall zeigt
// das Altersvorsorgedepot aber seine schlechteste Seite, weil die Förderung
// grundsätzlich zurückzuzahlen ist – während eine Fondspolice ihre
// Todesfallleistung einkommensteuerfrei auszahlt. Ohne diese
// Gegenüberstellung ruht die Empfehlung auf einer Annahme, die im Todesfall
// kippt (Spezifikation, Befund F15).
//
// Rechtsgrundlage:
// - § 93 Abs. 1 S. 1–3 EStG: Auszahlung im Todesfall ist schädliche
//   Verwendung. Zurückzuzahlen sind die auf den Auszahlungsbetrag entfallenden
//   Zulagen und die nach § 10a Abs. 4 EStG gesondert festgestellten
//   Steuerermäßigungen.
// - § 93 Abs. 1 S. 4 Buchst. c EStG: Übertragung auf einen Altersvorsorge-
//   vertrag des überlebenden Ehegatten ist förderunschädlich – keine
//   Rückforderung, keine sofortige Steuer.
// - § 93 Abs. 1 S. 4 Buchst. a EStG: Auszahlung als Hinterbliebenenrente ist
//   ebenfalls förderunschädlich.
// - § 22 Nr. 5 S. 3 EStG: Bei schädlicher Verwendung gilt das ausgezahlte
//   geförderte Vermögen nach Abzug der Zulagen als Leistung nach Satz 2 –
//   besteuert wird also der Unterschied zur Summe der eigenen Beiträge.
//
// Bewusst nicht abgebildet: die Erbschaftsteuer. Sie hängt an Verwandtschaft
// und Freibeträgen und gehört nicht in einen Produktvergleich; der Hinweis
// dazu reist deshalb mit jedem Szenario mit.
//
// Wie die Strategien (strategien.ts) ist das ein eigener Rechenschritt und
// nicht Teil von `simuliereAvd`: Die Kernsimulation bleibt schlank, und der
// Block kann Jahr für Jahr auf deren Ergebnis aufsetzen.

import { calculateMonthlyReturn } from '@/components/shared/TaxCalculations';
import {
  ANNAHMEN,
  DEPOT_STEUER,
  RECHTS_FLAGS_DEFAULT,
  type RechtsFlags,
} from './config';
import { alsProzentpunkte } from './fondslv';
import { steuerAufRente } from './simulation';
import type { AvdEingabe, AvdErgebnis, Hinweis, JahresZeile } from './simulation';

/** Mindestlaufzeit und Mindestalter des Halbeinkünfteverfahrens (§ 20 Abs. 1 Nr. 6 S. 2). */
const HALBEINKUENFTE_JAHRE = 12;
const HALBEINKUENFTE_ALTER = 62;

export type TodesfallVariante = {
  /** Was zum Todeszeitpunkt im Vertrag steht, vor allen Abzügen. */
  kapitalGesamt: number;
  kapitalGefoerdert: number;
  kapitalUngefoerdert: number;
  /** Rückzahlungsbetrag nach § 93 Abs. 1 EStG. */
  rueckforderung: number;
  /** Steuer auf die Erträge (§ 22 Nr. 5 S. 3, § 20 Abs. 1 Nr. 6 EStG). */
  steuer: number;
  /** Was tatsächlich bei den Hinterbliebenen ankommt. */
  verfuegbar: number;
};

export type TodesfallPhase = 'vor_beginn' | 'anspar' | 'auszahl' | 'nach_plan_ende';

export type TodesfallSzenario = {
  alter: number;
  /** Kalenderjahr des Todes, soweit es im Beitrags- oder Auszahlzeitraum liegt. */
  jahr: number;
  phase: TodesfallPhase;
  /** Förderunschädliche Übertragung auf einen Vertrag des Ehegatten. */
  ehegatte: TodesfallVariante;
  /** Auszahlung an sonstige Erben – schädliche Verwendung. */
  sonstige: TodesfallVariante;
  /**
   * Bereits ausgezahltes Teilkapital, netto. Es gehört ab dem
   * Auszahlungsbeginn zum privaten Vermögen und fällt in den Nachlass, ohne
   * dass die Förderung dafür noch einmal zurückgefordert wird.
   */
  teilkapitalBereitsAusgezahlt: number;
  /** Nur Leibrente: Barwert der restlichen garantierten Netto-Raten. */
  garantierteRestrente?: number;
  /**
   * Kapital, das zum Rentenbeginn verrentet wurde.
   *
   * Ohne diese Zahl liest sich die Auszahlphase falsch: Beim Tod nach Ablauf
   * der Rentengarantiezeit steht beim geförderten Vertrag eine Null – aber
   * nicht, weil nichts da war, sondern weil es verrentet ist und mit dem Tod
   * endet. Die Null bekommt erst hier ihren Sinn.
   */
  verrentetesKapital?: number;
  /**
   * Freies Depot – immer gerechnet, es läuft im Vergleich mit.
   *
   * Dieselbe Form wie die Vertragsvarianten, damit jede Spalte dasselbe
   * zeigt: Gesamtkapital, Abzüge, was ankommt. Dass die Zeile
   * „Rückforderung" hier null ist, ist keine Lücke – es ist die Aussage.
   */
  freiesDepot?: TodesfallVariante;
  /** Fondspolice: Todesfallleistung, einkommensteuerfrei. */
  fondsLv?: TodesfallVariante;
  /** Riester-Altvertrag: dieselbe Rückforderungslogik nach § 93 EStG. */
  riesterAlt?: TodesfallVariante;
  hinweise: Hinweis[];
};

/**
 * Variante ohne Förderrückforderung: Depot und Fondspolice.
 *
 * Eigene Hilfe statt `variante`, weil dort „gefördert/ungefördert" verlangt
 * wird – eine Unterscheidung, die es außerhalb des Fördervermögens nicht
 * gibt. Hier zählt nur: was liegt da, was geht an den Fiskus, was bleibt.
 */
function vergleichswert(kapitalGesamt: number, steuer: number): TodesfallVariante {
  const brutto = Math.max(0, kapitalGesamt);
  const abzug = Math.max(0, steuer);
  return {
    kapitalGesamt: brutto,
    kapitalGefoerdert: 0,
    kapitalUngefoerdert: brutto,
    rueckforderung: 0,
    steuer: abzug,
    verfuegbar: Math.max(0, brutto - abzug),
  };
}

const leereVariante = (): TodesfallVariante => ({
  kapitalGesamt: 0,
  kapitalGefoerdert: 0,
  kapitalUngefoerdert: 0,
  rueckforderung: 0,
  steuer: 0,
  verfuegbar: 0,
});

/** Abgeltungsteuersatz auf Fondsgewinne, Teilfreistellung schon enthalten. */
function depotSteuersatz(kirchensteuersatz: number): number {
  return (
    (1 - DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS) *
    DEPOT_STEUER.ABGELTUNGSTEUER *
    (1 + DEPOT_STEUER.SOLI_ZUSCHLAG + (kirchensteuersatz || 0))
  );
}

/**
 * Restkapital eines Auszahlplans nach `monate` Raten.
 *
 * Reihenfolge wie in der Auszahlphase des Vergleichsdepots: erst Rendite,
 * dann Entnahme. Die zugrunde liegende Annuität ist nachschüssig; vorschüssig
 * gerechnet wäre das Kapital vor der letzten Rate aufgebraucht.
 */
export function restkapitalNachRaten(
  startkapital: number,
  rateMonatlich: number,
  rMonat: number,
  monate: number
): number {
  let kapital = Math.max(0, startkapital);
  for (let m = 1; m <= Math.max(0, Math.round(monate)); m++) {
    kapital *= 1 + rMonat;
    kapital -= Math.min(rateMonatlich, Math.max(0, kapital));
    if (kapital <= 0) return 0;
  }
  return kapital;
}

/** Barwert von `monate` nachschüssigen Raten. */
export function barwertRaten(rateMonatlich: number, rMonat: number, monate: number): number {
  const n = Math.max(0, Math.round(monate));
  if (n === 0 || !(rateMonatlich > 0)) return 0;
  if (Math.abs(rMonat) < 1e-9 || rMonat <= -1) return rateMonatlich * n;
  return (rateMonatlich * (1 - Math.pow(1 + rMonat, -n))) / rMonat;
}

/**
 * Steuer bei schädlicher Verwendung.
 *
 * Geförderter Topf: Das ausgezahlte Vermögen gilt nach Abzug der Zulagen als
 * Leistung; steuerpflichtig ist der Unterschied zu den eigenen Beiträgen
 * (§ 22 Nr. 5 S. 3 i. V. m. S. 2 EStG). Das ist eine sonstige Einkunft, also
 * persönlicher Steuersatz – nicht Abgeltungsteuer.
 *
 * Ungeförderter Topf: Kapitalauszahlung nach § 20 Abs. 1 Nr. 6 EStG, mit dem
 * Halbeinkünfteverfahren ab zwölf Jahren Laufzeit und Alter 62.
 */
function steuerSchaedlich(args: {
  kapitalGefoerdert: number;
  zulagenZugeflossen: number;
  eigenzahlungenGefoerdert: number;
  kapitalUngefoerdert: number;
  eigenzahlungenUngefoerdert: number;
  laufzeitJahre: number;
  alter: number;
  steuersatzPersoenlich: number;
  kirchensteuersatz: number;
  flags: RechtsFlags;
}): number {
  const leistungGef = Math.max(0, args.kapitalGefoerdert - args.zulagenZugeflossen);
  const ertragGef = Math.max(0, leistungGef - args.eigenzahlungenGefoerdert);
  const satzGef =
    args.flags.todesfallErtraegeBesteuerung === 'abgeltung'
      ? depotSteuersatz(args.kirchensteuersatz)
      : Math.max(0, args.steuersatzPersoenlich);

  const ertragUngef = Math.max(0, args.kapitalUngefoerdert - args.eigenzahlungenUngefoerdert);
  const halbeinkuenfte =
    args.laufzeitJahre >= HALBEINKUENFTE_JAHRE && args.alter >= HALBEINKUENFTE_ALTER;
  const steuerUngef = halbeinkuenfte
    ? ertragUngef * 0.5 * Math.max(0, args.steuersatzPersoenlich)
    : ertragUngef * depotSteuersatz(args.kirchensteuersatz);

  return ertragGef * satzGef + steuerUngef;
}

/** Variante „sonstige Erben“ aus Kapital, Rückforderung und Steuer zusammensetzen. */
function variante(args: {
  kapitalGefoerdert: number;
  kapitalUngefoerdert: number;
  rueckforderung: number;
  steuer: number;
}): TodesfallVariante {
  const kapitalGesamt = args.kapitalGefoerdert + args.kapitalUngefoerdert;
  return {
    kapitalGesamt,
    kapitalGefoerdert: args.kapitalGefoerdert,
    kapitalUngefoerdert: args.kapitalUngefoerdert,
    rueckforderung: args.rueckforderung,
    steuer: args.steuer,
    verfuegbar: Math.max(0, kapitalGesamt - args.rueckforderung - args.steuer),
  };
}

/**
 * Der Rückzahlungsbetrag nach § 93 Abs. 1 EStG.
 *
 * Zulagen nur, soweit sie gutgeschrieben wurden: Beantragte, aber noch nicht
 * zugeflossene Zulagen stecken nicht im ausgezahlten Vermögen – sie fließen
 * nur nicht mehr zu. Die Steuerermäßigung dagegen hat der Steuerpflichtige
 * erhalten, unabhängig vom Vertrag (§ 10a Abs. 4 EStG), und zählt immer.
 * Umschaltbar über `todesfallRueckforderungNurZugeflossen`.
 */
function rueckzahlungsbetrag(
  summen: ReturnType<typeof summenBis>,
  flags: RechtsFlags,
  phase: 'anspar' | 'auszahl'
): number {
  // In der Auszahlphase ist der Unterschied gegenstandslos: Bis zum
  // Auszahlungsbeginn sind alle verzoegerten Zulagen gutgeschrieben - die
  // Simulation bucht die Nachzuegler dort ausdruecklich ein. Nur ein Tod
  // *waehrend* der Ansparphase kann einen beantragten, noch nicht
  // zugeflossenen Anspruch offen lassen.
  const zulagen =
    phase === 'auszahl' || !flags.todesfallRueckforderungNurZugeflossen
      ? summen.zulagenAnspruch
      : summen.zulagenZugeflossen;
  return zulagen + summen.erstattung;
}

/** Kumulierte Werte der Jahreszeilen bis einschließlich `index`. */
function summenBis(jahre: JahresZeile[], index: number) {
  let zulagenAnspruch = 0;
  let zulagenZugeflossen = 0;
  let erstattung = 0;
  let eigenzahlungGef = 0;
  let eigenUngef = 0;
  for (let t = 0; t <= index && t < jahre.length; t++) {
    const z = jahre[t];
    zulagenAnspruch += z.zulage;
    zulagenZugeflossen += z.zulageZugeflossen;
    erstattung += z.steuererstattung;
    eigenzahlungGef += z.eigenzahlungGefoerdert;
    eigenUngef += z.eigenbeitragUngefoerdert;
  }
  return {
    zulagenAnspruch,
    zulagenZugeflossen,
    erstattung,
    eigenzahlungGef,
    eigenUngef,
  };
}

export function berechneTodesfallSzenarien(args: {
  basis: AvdEingabe;
  ergebnis: AvdErgebnis;
  /** Alter, zu denen der Todesfall gerechnet wird. */
  alter: number[];
  /**
   * Rentengarantiezeit der Leibrente in Jahren. Ohne sie endet die Rente mit
   * dem Tod, und für die Hinterbliebenen bleibt nichts.
   */
  rentengarantiezeitJahre?: number;
  /**
   * Bleibt das Kapital von Depot und Fondspolice nach dem Rentenbeginn
   * liegen und wächst weiter (Vorgabe), oder läuft parallel zur
   * Vertragsrente eine gleich hohe Entnahme?
   *
   * Eine Annahme über das Verhalten, nicht über das Produkt – und sie bewegt
   * das Ergebnis stark. Sie gehört deshalb sichtbar in die Oberfläche.
   */
  kapitalBleibtLiegen?: boolean;
  flags?: RechtsFlags;
}): TodesfallSzenario[] {
  const { basis: e, ergebnis: r } = args;
  const flags = args.flags ?? RECHTS_FLAGS_DEFAULT;
  const alterBeiStart = e.beitragsjahrStart - e.geburtsjahr;
  const sparerpauschbetrag = e.sparerpauschbetrag ?? ANNAHMEN.SPARERPAUSCHBETRAG;
  const garantieJahre = Math.max(0, Math.round(args.rentengarantiezeitJahre ?? 0));
  const kapitalBleibtLiegen = args.kapitalBleibtLiegen ?? true;
  const entnahmenLaufen = !kapitalBleibtLiegen;
  const steuersatz = Math.max(0, e.steuersatzImAlter || 0);

  const rMonatVertrag = calculateMonthlyReturn(
    ((e.renditeBruttoPaJahr || 0) - (e.effektivkostenPaJahr || 0)) * 100
  );
  const rMonatDepot = calculateMonthlyReturn(
    ((e.renditeBruttoPaJahr || 0) - (e.depotKostenPaJahr || 0)) * 100
  );

  // Gemeinsame Hinweise, die zu jedem Szenario gehören.
  const grundHinweise = (): Hinweis[] => [
    {
      art: 'info',
      text: 'Die Erbschaftsteuer ist nicht abgebildet – sie hängt an Verwandtschaftsgrad und Freibeträgen. Gezeigt wird, was einkommensteuerlich und förderrechtlich vom Vertrag übrig bleibt.',
    },
    {
      art: 'info',
      text: 'Die Übertragung auf den Ehegatten setzt einen eigenen Altersvorsorgevertrag auf seinen Namen voraus; die Ehegatten dürfen nicht dauernd getrennt gelebt haben und müssen in der EU oder im EWR wohnen (§ 93 Abs. 1 S. 4 Buchst. c EStG). Die Steuer entfällt dort nicht, sie verschiebt sich auf die späteren Leistungen aus dem Vertrag des Ehegatten.',
    },
  ];

  return args.alter.map((alterRoh): TodesfallSzenario => {
    const alter = Math.max(0, Math.round(alterRoh));
    const hinweise = grundHinweise();

    // --- Vor dem ersten Beitragsjahr ---
    if (alter <= alterBeiStart) {
      hinweise.push({
        art: 'warnung',
        text: `Mit ${alter} liegt der Todesfall vor dem ersten Beitragsjahr (Alter ${alterBeiStart + 1}) – dann gibt es noch keinen Vertrag und nichts zu vererben.`,
      });
      return {
        alter,
        jahr: e.beitragsjahrStart,
        phase: 'vor_beginn',
        ehegatte: leereVariante(),
        sonstige: leereVariante(),
        teilkapitalBereitsAusgezahlt: 0,
        hinweise,
      };
    }

    // --- Ansparphase ---
    if (alter < e.auszahlungsbeginnAlter) {
      const index = Math.min(alter - alterBeiStart - 1, r.jahre.length - 1);
      const zeile = r.jahre[index];
      const summen = summenBis(r.jahre, index);
      const laufzeit = index + 1;

      const steuer = steuerSchaedlich({
        kapitalGefoerdert: zeile.kapitalGefoerdert,
        zulagenZugeflossen: summen.zulagenZugeflossen,
        eigenzahlungenGefoerdert: summen.eigenzahlungGef,
        kapitalUngefoerdert: zeile.kapitalUngefoerdert,
        eigenzahlungenUngefoerdert: summen.eigenUngef,
        laufzeitJahre: laufzeit,
        alter,
        steuersatzPersoenlich: steuersatz,
        kirchensteuersatz: e.kirchensteuersatz,
        flags,
      });

      const sonstige = variante({
        kapitalGefoerdert: zeile.kapitalGefoerdert,
        kapitalUngefoerdert: zeile.kapitalUngefoerdert,
        rueckforderung: rueckzahlungsbetrag(summen, flags, 'anspar'),
        steuer,
      });

      const ehegatte = variante({
        kapitalGefoerdert: zeile.kapitalGefoerdert,
        kapitalUngefoerdert: zeile.kapitalUngefoerdert,
        rueckforderung: 0,
        steuer: 0,
      });

      if (rueckzahlungsbetrag(summen, flags, 'anspar') + steuer > ehegatte.kapitalGesamt) {
        hinweise.push({
          art: 'warnung',
          text: 'Rückforderung und Steuer übersteigen hier das Vertragsvermögen. Das ist möglich, weil die Steuererstattung auch dann zurückzuzahlen ist, wenn sie nie in den Vertrag eingezahlt wurde – an sonstige Erben geht dann nichts, und der Rest ist aus dem übrigen Nachlass zu tragen.',
        });
      }

      if (!e.erstattungReinvestieren && summen.erstattung > 0) {
        hinweise.push({
          art: 'info',
          text: `Die Steuererstattung von zusammen ${Math.round(summen.erstattung).toLocaleString('de-DE')} € wurde nicht wieder angelegt, ist aber Teil des Rückzahlungsbetrags (§ 10a Abs. 4 EStG). Sie steckt also nicht im Kapital, wird aber zurückgefordert.`,
        });
      }

      const zulagenOffen = summen.zulagenAnspruch - summen.zulagenZugeflossen;
      if (zulagenOffen > 0.5) {
        hinweise.push({
          art: 'info',
          text: flags.todesfallRueckforderungNurZugeflossen
            ? `Zulagen über ${Math.round(zulagenOffen).toLocaleString('de-DE')} € waren zum Todeszeitpunkt beantragt, aber noch nicht gutgeschrieben. Sie fließen nicht mehr zu und werden auch nicht zurückgefordert – der Rückzahlungsbetrag umfasst nur, was im Vertrag angekommen ist (§ 93 Abs. 1 S. 1 EStG).`
            : `Zulagen über ${Math.round(zulagenOffen).toLocaleString('de-DE')} € waren beantragt, aber noch nicht gutgeschrieben. Sie erhöhen das Kapital nicht mehr, zählen hier aber zum Rückzahlungsbetrag – die strengere Lesart.`,
        });
      }

      // Freies Depot: Verkauf zum Todeszeitpunkt.
      const depotGewinn = Math.max(0, zeile.depotKapital - zeile.depotEinstand);
      const depotStpfl = depotGewinn * (1 - DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS);
      const depotSteuer =
        Math.max(0, depotStpfl - sparerpauschbetrag) *
        DEPOT_STEUER.ABGELTUNGSTEUER *
        (1 + DEPOT_STEUER.SOLI_ZUSCHLAG + (e.kirchensteuersatz || 0));
      const freiesDepot = vergleichswert(zeile.depotKapital, depotSteuer);

      // Fondspolice: Die Todesfallleistung ist einkommensteuerfrei.
      let fondsLv: TodesfallVariante | undefined;
      if (r.fondsLv) {
        fondsLv = vergleichswert(r.fondsLv.kapitalProJahr[index] ?? 0, 0);
        hinweise.push({
          art: 'info',
          text: 'Die Todesfallleistung der Fondspolice ist einkommensteuerfrei und ohne Förderrückforderung – im Todesfall ist das ihr Vorteil gegenüber dem Altersvorsorgedepot. Welche Leistung ein Tarif zusagt (Vertragsguthaben oder Beitragssumme), steht in seinen Bedingungen.',
        });
      }

      // Riester-Altvertrag: identische Rückforderungslogik.
      let riesterAlt: TodesfallVariante | undefined;
      if (r.riesterAlt) {
        const kapital = r.riesterAlt.kapitalProJahr[index] ?? 0;
        const foerderung = r.riesterAlt.foerderungKumuliertProJahr[index] ?? 0;
        const eingezahlt = r.riesterAlt.eigenbeitraegeKumuliertProJahr[index] ?? 0;
        // Riester kennt in diesem Modul keinen ungeförderten Teil.
        const ertrag = Math.max(0, kapital - foerderung - eingezahlt);
        riesterAlt = variante({
          kapitalGefoerdert: kapital,
          kapitalUngefoerdert: 0,
          rueckforderung: foerderung,
          steuer: ertrag * steuersatz,
        });
      }

      return {
        alter,
        jahr: zeile.jahr,
        phase: 'anspar',
        ehegatte,
        sonstige,
        teilkapitalBereitsAusgezahlt: 0,
        freiesDepot,
        fondsLv,
        riesterAlt,
        hinweise,
      };
    }

    // --- Auszahlphase ---
    const monateSeitBeginn = Math.max(0, Math.round((alter - e.auszahlungsbeginnAlter) * 12));
    const jahr = e.beitragsjahrStart + (e.auszahlungsbeginnAlter - alterBeiStart) +
      (alter - e.auszahlungsbeginnAlter);
    const teilkapitalNetto = Math.max(
      0,
      r.auszahlung.teilkapital - r.auszahlung.teilkapitalSteuer
    );
    const summenGesamt = summenBis(r.jahre, r.jahre.length - 1);
    const kapitalGefBeiBeginn = r.gefoerderterKapitalanteil;
    const gesamtBeiBeginn = kapitalGefBeiBeginn + r.ungefoerderterKapitalanteil;
    const anteilGef = gesamtBeiBeginn > 0 ? kapitalGefBeiBeginn / gesamtBeiBeginn : 1;

    if (teilkapitalNetto > 0) {
      hinweise.push({
        art: 'info',
        text: `Das bereits ausgezahlte Teilkapital von ${Math.round(teilkapitalNetto).toLocaleString('de-DE')} € netto gehört ab dem Auszahlungsbeginn zum privaten Vermögen. Es fällt in den Nachlass, ohne dass dafür Förderung zurückgefordert wird.`,
      });
    }

    if (r.fondsLv) {
      hinweise.push({
        art: 'info',
        text: 'Für die Fondspolice ist ein Tarif unterstellt, dessen Rentenphase das Fondsguthaben erhält – im Todesfall wird das Restguthaben ausgezahlt. Eine klassische Leibrente ohne Beitragsrückgewähr leistet nach Ablauf der Rentengarantiezeit nichts; dann gilt für sie dasselbe wie für den geförderten Vertrag. Maßgeblich sind die Bedingungen des Tarifs.',
      });
    }
    if (kapitalBleibtLiegen) {
      hinweise.push({
        art: 'info',
        text: 'Für Depot und Fondspolice ist angenommen, dass das Kapital nach dem Rentenbeginn liegen bleibt und weiter Rendite trägt. Wer daraus so viel entnimmt, wie der geförderte Vertrag an Rente zahlt, hat im Todesfall entsprechend weniger – dann aber auch dasselbe Einkommen gehabt.',
      });
    }

    // Was nach der Teilentnahme tatsaechlich verrentet wurde - der Nenner
    // fuer den Vergleich mit dem Riester-Vertrag.
    const verrentetesKapital = Math.max(0, gesamtBeiBeginn - r.auszahlung.teilkapital);

    if (e.auszahlform === 'leibrente') {
      const endeGarantie = e.auszahlungsbeginnAlter + garantieJahre;
      const restMonate = Math.max(0, Math.round((endeGarantie - alter) * 12));

      /*
       * Die garantierte Restrente versteuern die Hinterbliebenen, nicht der
       * Verstorbene.
       *
       * Vorher trug der Barwert `monatsrenteNetto` - also die Rente nach dem
       * Steuersatz und dem Krankenversicherungsstatus des Sparers. Beides
       * gehoert dem Empfaenger. Ohne eigene Angabe bleibt es beim Satz des
       * Sparers, aber als benannte Annahme.
       */
      const satzHinterbliebene =
        e.steuersatzHinterbliebene != null && e.steuersatzHinterbliebene >= 0
          ? e.steuersatzHinterbliebene
          : steuersatz;
      const steuerHinterbliebene = steuerAufRente({
        monatsrenteBrutto: r.auszahlung.monatsrenteBrutto,
        anteilGefoerdert: r.auszahlung.anteilGefoerdert,
        steuersatz: satzHinterbliebene,
        auszahlungsbeginnAlter: e.auszahlungsbeginnAlter,
        flags,
      });
      const renteNettoHinterbliebene = Math.max(
        0,
        r.auszahlung.monatsrenteBrutto - steuerHinterbliebene
      );
      const barwert = barwertRaten(renteNettoHinterbliebene, rMonatVertrag, restMonate);

      if (garantieJahre === 0) {
        hinweise.push({
          art: 'warnung',
          text: 'Ohne Rentengarantiezeit endet die Leibrente mit dem Tod – für die Hinterbliebenen bleibt nichts. Tarife bieten üblicherweise 10 oder 20 Jahre Garantiezeit; dann laufen die Raten bis zum Ende der Frist weiter.',
        });
      } else if (restMonate === 0) {
        hinweise.push({
          art: 'warnung',
          text: `Die Rentengarantiezeit von ${garantieJahre} Jahren endete mit Alter ${endeGarantie}. Ein Todesfall danach lässt den Hinterbliebenen aus der Rente nichts.`,
        });
      } else {
        hinweise.push({
          art: 'info',
          text: `Innerhalb der Garantiezeit laufen noch ${Math.round(restMonate)} Raten von ${Math.round(renteNettoHinterbliebene).toLocaleString('de-DE')} € netto. Gezeigt ist ihr Barwert; an Ehegatten und kindergeldberechtigte Kinder ist die Hinterbliebenenrente förderunschädlich (§ 93 Abs. 1 S. 4 Buchst. a EStG). Für andere Empfänger ist nicht geklärt, ob die Förderung zurückzuzahlen ist – die Rechnung zieht dafür nichts ab.`,
        });
        hinweise.push({
          art: 'warnung',
          text: 'Eine Rentengarantiezeit senkt in echten Tarifen den Rentenfaktor. Die Rechnung ändert den eingegebenen Faktor bewusst nicht – er sollte zur gewählten Garantiezeit passen, sonst steht die Rente zu hoch.',
        });
        hinweise.push({
          art: e.steuersatzHinterbliebene != null ? 'info' : 'warnung',
          text:
            (e.steuersatzHinterbliebene != null
              ? `Die Restrente ist mit ${Math.round(satzHinterbliebene * 100)} % Steuersatz der Hinterbliebenen gerechnet.`
              : `Ohne eigene Angabe ist die Restrente mit dem Steuersatz des Sparers gerechnet (${Math.round(satzHinterbliebene * 100)} %). Der Empfänger versteuert sie aber nach seiner eigenen Lage.`) +
            ' Kranken- und Pflegeversicherung der Hinterbliebenen sind nicht abgebildet; bei freiwillig Versicherten mindern sie die Rente zusätzlich.',
        });
      }

      const rente: TodesfallVariante = {
        ...leereVariante(),
        kapitalGesamt: barwert,
        verfuegbar: barwert,
      };

      return {
        alter,
        jahr,
        phase: restMonate > 0 ? 'auszahl' : 'nach_plan_ende',
        ehegatte: rente,
        sonstige: rente,
        teilkapitalBereitsAusgezahlt: teilkapitalNetto,
        garantierteRestrente: barwert,
        verrentetesKapital,
        freiesDepot: depotRestNachSteuer({
          r,
          e,
          rMonatDepot,
          monateSeitBeginn,
          sparerpauschbetrag,
          entnahmenLaufen,
        }),
        fondsLv: fondsLvNachBeginn({ r, e, monateSeitBeginn }),
        /*
         * Der Riester-Vertrag hat dieselbe Auszahlform und denselben
         * Horizont. Massgeblich ist deshalb derselbe Anteil des
         * verrenteten Kapitals, den die garantierte Restrente hier
         * ausmacht - nach Ablauf der Garantiezeit ist er null, und genau
         * das ist der Unterschied zu Police und Depot.
         */
        riesterAlt: riesterAltNachBeginn({
          r,
          anteilVerbleibend:
            verrentetesKapital > 0 ? barwert / verrentetesKapital : 0,
          steuersatz,
        }),
        hinweise,
      };
    }

    // Auszahlplan: Restkapital nach den bereits gezahlten Raten.
    const restkapitalBeiBeginn = gesamtBeiBeginn - r.auszahlung.teilkapital;
    const rest = restkapitalNachRaten(
      restkapitalBeiBeginn,
      r.auszahlung.monatsrenteBrutto,
      rMonatVertrag,
      monateSeitBeginn
    );
    const restGef = rest * anteilGef;
    const restUngef = rest * (1 - anteilGef);
    /*
     * Anteil am gesamten Kapital zum Auszahlungsbeginn - einschliesslich des
     * Teilkapitals (Audit E03).
     *
     * Vorher war der Nenner das Kapital *nach* der Teilentnahme. Direkt nach
     * Beginn war der Quotient damit immer eins: Bei 30 % Teilkapital wurde die
     * gesamte Foerderung zurueckgefordert, obwohl knapp ein Drittel planmaessig
     * ausgezahlt und dabei besteuert worden war. Richtig ist der Anteil am
     * Ganzen - dann bleiben nach einer 30-%-Entnahme 70 % der Foerderung im
     * Raum.
     */
    const verbrauchtAnteil = gesamtBeiBeginn > 0 ? rest / gesamtBeiBeginn : 0;

    // Anteilig, weil § 93 Abs. 1 S. 1 EStG von den „auf den Auszahlungsbetrag
    // entfallenden" Zulagen spricht: Die bereits gezahlten Raten waren
    // planmäßige Leistungen und wurden laufend besteuert.
    const foerderungGesamt = rueckzahlungsbetrag(summenGesamt, flags, 'auszahl');
    const rueckforderung = flags.todesfallRueckforderungAnteilig
      ? foerderungGesamt * verbrauchtAnteil
      : foerderungGesamt;

    const steuer = steuerSchaedlich({
      kapitalGefoerdert: restGef,
      zulagenZugeflossen: summenGesamt.zulagenZugeflossen * verbrauchtAnteil,
      eigenzahlungenGefoerdert: summenGesamt.eigenzahlungGef * verbrauchtAnteil,
      kapitalUngefoerdert: restUngef,
      eigenzahlungenUngefoerdert: summenGesamt.eigenUngef * verbrauchtAnteil,
      laufzeitJahre: r.jahreBisAuszahlung + (alter - e.auszahlungsbeginnAlter),
      alter,
      steuersatzPersoenlich: steuersatz,
      kirchensteuersatz: e.kirchensteuersatz,
      flags,
    });

    if (rest <= 0) {
      hinweise.push({
        art: 'warnung',
        text: `Der Auszahlplan läuft bis Alter ${e.auszahlplanEndalter}. Danach ist das Kapital verbraucht; ein Todesfall lässt den Hinterbliebenen aus dem Vertrag nichts mehr.`,
      });
    } else {
      hinweise.push({
        art: 'info',
        text: 'Beim Auszahlplan ist das noch nicht ausgezahlte Kapital vererbbar. Zurückgefordert wird die Förderung, die auf diesen Teil entfällt – die bereits gezahlten Raten bleiben unberührt.',
      });
    }

    return {
      alter,
      jahr,
      phase: rest > 0 ? 'auszahl' : 'nach_plan_ende',
      ehegatte: variante({
        kapitalGefoerdert: restGef,
        kapitalUngefoerdert: restUngef,
        rueckforderung: 0,
        steuer: 0,
      }),
      sonstige: variante({
        kapitalGefoerdert: restGef,
        kapitalUngefoerdert: restUngef,
        rueckforderung,
        steuer,
      }),
      teilkapitalBereitsAusgezahlt: teilkapitalNetto,
      verrentetesKapital,
      freiesDepot: depotRestNachSteuer({
        r,
        e,
        rMonatDepot,
        monateSeitBeginn,
        sparerpauschbetrag,
        entnahmenLaufen,
      }),
      fondsLv: fondsLvNachBeginn({ r, e, monateSeitBeginn }),
      riesterAlt: riesterAltNachBeginn({
        r,
        anteilVerbleibend: verrentetesKapital > 0 ? rest / verrentetesKapital : 0,
        steuersatz,
      }),
      hinweise,
    };
  });
}

/**
 * Freies Depot in der Auszahlphase: Restkapital nach den bisherigen Entnahmen,
 * abzüglich Abgeltungsteuer auf den darin steckenden Gewinn.
 *
 * Dasselbe Modell wie die Auszahlphase des Vergleichsdepots in `simulation.ts`
 * (erst Rendite, dann Entnahme; jede Entnahme realisiert den anteiligen Gewinn
 * und senkt den Einstandswert im selben Verhältnis).
 */
function depotRestNachSteuer(args: {
  r: AvdErgebnis;
  e: AvdEingabe;
  rMonatDepot: number;
  monateSeitBeginn: number;
  sparerpauschbetrag: number;
  /**
   * Läuft parallel zur Vertragsrente eine Entnahme aus dem Depot?
   *
   * Ohne sie bleibt das Kapital liegen und wächst weiter. Das ist eine
   * Annahme über das Verhalten des Anlegers, nicht über das Produkt – und
   * sie muss in der Oberfläche stehen, weil sie das Ergebnis stark bewegt:
   * Wer aus dem Depot so viel entnimmt, wie der Vertrag Rente zahlt, hat im
   * Todesfall weniger liegen.
   */
  entnahmenLaufen: boolean;
}): TodesfallVariante {
  const { r, e, rMonatDepot, monateSeitBeginn } = args;
  let kapital = r.depot.endkapitalVorSteuer;
  /*
   * Der steuerliche Einstand, nicht die Einzahlungen (Audit E02).
   *
   * Bereits ueber die Vorabpauschale versteuerte Betraege erhoehen den
   * Einstand (§ 19 Abs. 1 InvStG) - sonst wird derselbe Gewinn zweimal
   * belastet. Die regulaere Depotrechnung beruecksichtigt das; hier stand
   * dagegen nur `eingezahlt`, und der Todesfall wies zum selben Stichtag ein
   * um mehrere Tausend Euro kleineres Netto aus als der normale Verkauf.
   * Die letzte Jahreszeile traegt den vollen Einstand.
   */
  let einstand = Math.max(
    0,
    r.jahre[r.jahre.length - 1]?.depotEinstand ?? r.depot.eingezahlt
  );
  const rate = args.entnahmenLaufen ? r.depot.monatsentnahmeBrutto : 0;

  for (let m = 1; m <= monateSeitBeginn; m++) {
    kapital *= 1 + rMonatDepot;
    const entnahme = Math.min(rate, Math.max(0, kapital));
    if (entnahme > 0 && kapital > 0) {
      const anteil = entnahme / kapital;
      einstand -= einstand * anteil;
      kapital -= entnahme;
    }
    if (kapital <= 0) return vergleichswert(0, 0);
  }

  const gewinn = Math.max(0, kapital - einstand);
  const stpfl = gewinn * (1 - DEPOT_STEUER.TEILFREISTELLUNG_AKTIENFONDS);
  const steuer =
    Math.max(0, stpfl - args.sparerpauschbetrag) *
    DEPOT_STEUER.ABGELTUNGSTEUER *
    (1 + DEPOT_STEUER.SOLI_ZUSCHLAG + (e.kirchensteuersatz || 0));
  return vergleichswert(kapital, steuer);
}

/**
 * Die Fondspolice nach dem Rentenbeginn.
 *
 * Bis hierher endete der Vergleich – in der Tabelle stand ein Strich, und
 * damit fehlte ausgerechnet die Aussage, auf die es ankommt. Nach Ablauf der
 * Rentengarantiezeit ist der geförderte Vertrag für die Hinterbliebenen
 * wertlos; die Police hat ihr Kapital dann noch.
 *
 * Angenommen ist ein Tarif, dessen Rentenphase das Fondsguthaben erhält
 * (Kapitalwahlrecht bzw. Auszahlung des Restguthabens im Todesfall). Eine
 * klassische Leibrente ohne Beitragsrückgewähr leistet nach Ablauf der
 * Garantiezeit **nichts** – dann gilt für sie dasselbe wie für den
 * geförderten Vertrag. Welche Zusage gilt, steht in den Bedingungen des
 * Tarifs; deshalb reist der Hinweis mit.
 */
function fondsLvNachBeginn(args: {
  r: AvdErgebnis;
  e: AvdEingabe;
  monateSeitBeginn: number;
}): TodesfallVariante | undefined {
  const { r, e, monateSeitBeginn } = args;
  if (!r.fondsLv || !e.fondsLv) return undefined;
  const rMonat = calculateMonthlyReturn(
    alsProzentpunkte(e.fondsLv.renditeBruttoPaJahr) - alsProzentpunkte(e.fondsLv.terPaJahr)
  );
  const kapital = r.fondsLv.endkapitalVorSteuer * Math.pow(1 + rMonat, monateSeitBeginn);
  // Die Todesfallleistung ist einkommensteuerfrei - auch die Wertsteigerung
  // nach dem Rentenbeginn.
  return vergleichswert(kapital, 0);
}

/**
 * Der Riester-Altvertrag nach dem Rentenbeginn.
 *
 * Für ihn gilt dieselbe Regel wie für das Altersvorsorgedepot: Das Kapital
 * ist verrentet, vererbbar ist nur, was noch nicht ausgezahlt wurde, und
 * selbst das nur förderunschädlich auf einen Vertrag des Ehegatten
 * (§ 93 Abs. 1 S. 4 Buchst. c EStG) – sonst greift die Rückforderung.
 *
 * Gerechnet wird im Verhältnis zum geförderten Vertrag: Der Riester-Vertrag
 * hat dieselbe Auszahlform und denselben Horizont, nur ein anderes Kapital.
 * Ein eigener Auszahlplan mit eigenen Annahmen würde zwei Rechenwege für
 * dieselbe Frage schaffen, und der Unterschied käme dann aus dem Rechenweg
 * statt aus dem Produkt.
 */
function riesterAltNachBeginn(args: {
  r: AvdErgebnis;
  anteilVerbleibend: number;
  steuersatz: number;
}): TodesfallVariante | undefined {
  const { r, anteilVerbleibend, steuersatz } = args;
  if (!r.riesterAlt) return undefined;
  const i = r.riesterAlt.kapitalProJahr.length - 1;
  const kapitalBeiBeginn = r.riesterAlt.kapitalProJahr[i] ?? 0;
  const foerderung = r.riesterAlt.foerderungKumuliertProJahr[i] ?? 0;
  const eingezahlt = r.riesterAlt.eigenbeitraegeKumuliertProJahr[i] ?? 0;

  const anteil = Math.max(0, Math.min(1, anteilVerbleibend));
  const kapital = kapitalBeiBeginn * anteil;
  // Anteilig wie beim Altersvorsorgedepot: § 93 Abs. 1 S. 1 EStG spricht von
  // den „auf den Auszahlungsbetrag entfallenden" Zulagen.
  const ertrag = Math.max(0, kapital - (foerderung + eingezahlt) * anteil);
  return variante({
    kapitalGefoerdert: kapital,
    kapitalUngefoerdert: 0,
    rueckforderung: foerderung * anteil,
    steuer: ertrag * steuersatz,
  });
}
