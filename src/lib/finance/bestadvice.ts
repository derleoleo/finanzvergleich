// Hilfen für die Wechselentscheidung BestAdvice (Audit F06).
//
// Kernproblem des Vergleichs: Auf der einen Seite steht eine garantierte
// Ablaufleistung, auf der anderen eine Renditeprognose. Beides nebeneinander
// als Zahl zu zeigen, legt eine Sicherheit nahe, die es nicht gibt.
//
// Antwort darauf ist die Break-even-Rendite: Welche Wertentwicklung muss die
// Fonds-LV nach Kosten mindestens bringen, damit sie die Garantie des
// Bestandsvertrags erreicht? Diese Zahl ist prüfbar und lässt sich einordnen.
import { simulateLv, type LvSimulationInput } from "@/lib/finance/simulation";

/** Steuerliche Beitragsbasis eines Bestandsvertrags. */
export function beitragsbasis(args: {
  /** Tatsächlich bis heute eingezahlte Beiträge, falls bekannt. */
  eingezahltBisher?: number | null;
  /** Heutiger Vertragswert (Rückkaufswert) als Ersatzgröße. */
  aktuellerWert: number;
  monatsbeitrag: number;
  monate: number;
}): number {
  const bisher =
    args.eingezahltBisher != null && args.eingezahltBisher > 0
      ? args.eingezahltBisher
      : args.aktuellerWert;
  return bisher + Math.max(0, args.monatsbeitrag) * Math.max(0, args.monate);
}

/** Warum keine Zahl herauskam – die beiden Fälle bedeuten Gegenteiliges. */
export type BreakEvenGrund = "zu_hoch" | "schon_erreicht";

export type BreakEvenErgebnis =
  | { art: "rendite"; wertProzent: number }
  | { art: "unmoeglich"; grund: BreakEvenGrund };

/**
 * Wertentwicklung der Fonds-LV **vor Vertragskosten** (in % p.a.), bei der sie
 * genau das Zielkapital erreicht. Die Vertragskosten zieht die Simulation davon
 * ab; die Zahl ist also mit der Renditeannahme im Formular vergleichbar, nicht
 * mit einer Rendite nach Kosten.
 *
 * Geprüft wird der Bereich −10 % bis 30 % p.a. Liegt das Ziel darüber, ist es
 * mit den angesetzten Kosten nicht erreichbar; liegt es darunter, wird es auch
 * ohne Wertzuwachs übertroffen.
 */
export function breakEvenDetail(
  basis: Omit<LvSimulationInput, "annual_return_percent">,
  zielkapital: number
): BreakEvenErgebnis {
  const endkapital = (rendite: number) =>
    simulateLv({ ...basis, annual_return_percent: rendite }).gross_capital;

  const unten0 = -10;
  const oben0 = 30;
  if (endkapital(oben0) < zielkapital) return { art: "unmoeglich", grund: "zu_hoch" };
  if (endkapital(unten0) > zielkapital) return { art: "unmoeglich", grund: "schon_erreicht" };
  const wert = bisektion(endkapital, zielkapital, unten0, oben0);
  return { art: "rendite", wertProzent: wert };
}

/** Kurzform für Aufrufer, die nur die Zahl brauchen. */
export function breakEvenRendite(
  basis: Omit<LvSimulationInput, "annual_return_percent">,
  zielkapital: number
): number | null {
  const ergebnis = breakEvenDetail(basis, zielkapital);
  return ergebnis.art === "rendite" ? ergebnis.wertProzent : null;
}

function bisektion(
  endkapital: (rendite: number) => number,
  zielkapital: number,
  start: number,
  ende: number
): number {
  let unten = start;
  let oben = ende;

  // Bisektion: 40 Schritte reichen für zwei Nachkommastellen
  for (let i = 0; i < 40; i++) {
    const mitte = (unten + oben) / 2;
    if (endkapital(mitte) < zielkapital) unten = mitte;
    else oben = mitte;
  }
  return Math.round(((unten + oben) / 2) * 100) / 100;
}

const prozent = (wert: number) =>
  `${wert.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} % p.a.`;

/**
 * Einordnung der Break-even-Rendite für die Beratung. Bewusst ohne Empfehlung:
 * Die Aussage beschreibt nur, wie anspruchsvoll das Ziel ist.
 *
 * Wichtig: Die Zahl ist eine Wertentwicklung **vor** Vertragskosten, also
 * dieselbe Größe wie die Renditeannahme im Formular. Sie als „nach Kosten“ zu
 * bezeichnen, wäre eine zu günstige Darstellung.
 */
export function breakEvenEinordnung(ergebnis: BreakEvenErgebnis | number | null): string {
  const daten: BreakEvenErgebnis =
    typeof ergebnis === "number"
      ? { art: "rendite", wertProzent: ergebnis }
      : ergebnis ?? { art: "unmoeglich", grund: "zu_hoch" };

  if (daten.art === "unmoeglich") {
    return daten.grund === "schon_erreicht"
      ? "Die Fonds-LV übertrifft die garantierte Leistung des Bestandsvertrags auch ohne Wertzuwachs."
      : "Die garantierte Leistung des Bestandsvertrags ist mit den angesetzten Kosten rechnerisch nicht erreichbar (geprüft bis 30 % p.a.).";
  }

  if (daten.wertProzent <= 0) {
    return `Die Fonds-LV erreicht die garantierte Leistung bereits ohne Wertzuwachs (${prozent(daten.wertProzent)} vor Kosten).`;
  }
  return `Die Fonds-LV muss eine Wertentwicklung von ${prozent(daten.wertProzent)} vor Vertragskosten erreichen, um die garantierte Leistung des Bestandsvertrags einzuholen.`;
}
