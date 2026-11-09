// Die Reihen für das Verlaufsdiagramm des AVD-Vergleichs.
//
// Eigene Datei, nicht im Seitenkörper: Dort war der Reihenbau eine Schleife
// mit fortgeschriebenen Summen, und der React-Compiler verbietet das zu Recht
// („Cannot reassign variable after render completes"). Wichtiger ist aber, dass
// die Zusagen, die unter dem Diagramm stehen, hier prüfbar werden — siehe
// `verlauf.test.ts`:
//
//   - Die Oberkante des Stapels ist das Gesamtkapital, nominal wie real.
//   - Der Abstand zwischen den beiden Beitragslinien ist die Förderung.
//
// Beides sind Behauptungen der Bildunterschrift, und eine Bildunterschrift,
// die etwas über das Bild behauptet, gehört abgesichert. Die zweite hat beim
// Schreiben schon einmal nicht gestimmt: `nettoAufwand` zieht nur die
// Steuererstattung ab, nicht die Zulage — gegen den Bruttobeitrag gerechnet
// wäre der Abstand also nur ein Teil der Förderung gewesen.

import { deflatorFuer, type AvdErgebnis } from "./simulation";

export type VerlaufsPunkt = {
  jahr: number;
  alter: number;
  /** Geförderter Topf — nachgelagert voll besteuert (§ 22 Nr. 5 EStG). */
  gefoerdert: number;
  /** Ungeförderter Topf — Abgeltungsteuer auf die Erträge. */
  ungefoerdert: number;
  /** Summe der beiden Töpfe, für die Kopfzeile des Tooltips. */
  avd: number;
  /** Der aktive Vergleichspartner: freies Depot, Riester-Altvertrag, Police. */
  depot: number;
  /** Was die Vorsorge gekostet hat: Eigenbeiträge minus Steuererstattung. */
  aufwandNetto: number;
  /**
   * Was in den Vertrag geflossen ist: Eigenbeiträge **plus gutgeschriebene
   * Zulagen**.
   *
   * Bewusst die gutgeschriebenen und nicht die beanspruchten: Nur sie stecken
   * im Kapital, das die Flächen darüber zeigen. Die Zulage kommt mit
   * Verzögerung, und eine Linie, die Ansprüche summiert, läge über einem
   * Kapital, das sie noch nicht enthält.
   */
  eingeflossen: number;
};

/**
 * Baut die Jahrespunkte für das Verlaufsdiagramm.
 *
 * `real` ist ein reiner Anzeigeschalter. Im Real-Modus wird **jede Zahlung mit
 * dem Deflator ihres eigenen Jahres** abgewertet und erst dann aufsummiert.
 * Vorher blieb die Beitragslinie im Real-Modus nominal und war damit nicht mit
 * den realen Kapitalkurven vergleichbar; eine Summe nominaler Beträge,
 * hinterher mit einem einzigen Deflator behandelt, wäre wieder etwas anderes.
 *
 * Der Exponent `i + 1` ist derselbe, den die Engine für `kapitalGesamtReal`
 * benutzt. Dadurch ergibt die Summe der beiden realen Anteile genau diese
 * Zahl, statt aus einer zweiten Rechnung ein wenig davon abzuweichen.
 */
export function baueAvdVerlauf(
  ergebnis: AvdErgebnis,
  inflationPaJahr: number,
  real: boolean,
): VerlaufsPunkt[] {
  let eingeflossenNominal = 0;
  let eingeflossenReal = 0;
  let aufwandNominal = 0;
  let aufwandReal = 0;

  return ergebnis.jahre.map((j, i) => {
    const deflator = deflatorFuer(inflationPaJahr, i + 1);
    const ab = (wert: number) => Math.round(real ? wert / deflator : wert);

    const zufluss = j.eigenbeitrag + j.zulageZugeflossen;
    eingeflossenNominal += zufluss;
    eingeflossenReal += zufluss / deflator;
    aufwandNominal += j.nettoAufwand;
    aufwandReal += j.nettoAufwand / deflator;

    return {
      jahr: j.jahr,
      alter: j.alter,
      gefoerdert: ab(j.kapitalGefoerdert),
      ungefoerdert: ab(j.kapitalUngefoerdert),
      avd: Math.round(real ? j.kapitalGesamtReal : j.kapitalGesamt),
      depot: ab(
        ergebnis.riesterAlt?.kapitalProJahr[i] ??
          ergebnis.fondsLv?.kapitalProJahr[i] ??
          j.depotKapital,
      ),
      aufwandNetto: Math.round(real ? aufwandReal : aufwandNominal),
      eingeflossen: Math.round(real ? eingeflossenReal : eingeflossenNominal),
    };
  });
}
