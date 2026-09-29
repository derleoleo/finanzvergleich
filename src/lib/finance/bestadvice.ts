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

/**
 * Rendite (in % p.a.), bei der die Fonds-LV nach Kosten genau das Zielkapital
 * erreicht. `null`, wenn das Ziel im geprüften Bereich (−10 % … 30 %) nicht
 * erreichbar ist – etwa weil die Kosten zu hoch sind.
 */
export function breakEvenRendite(
  basis: Omit<LvSimulationInput, "annual_return_percent">,
  zielkapital: number
): number | null {
  const endkapital = (rendite: number) =>
    simulateLv({ ...basis, annual_return_percent: rendite }).gross_capital;

  let unten = -10;
  let oben = 30;
  if (endkapital(oben) < zielkapital) return null;
  if (endkapital(unten) > zielkapital) return null;

  // Bisektion: 40 Schritte reichen für zwei Nachkommastellen
  for (let i = 0; i < 40; i++) {
    const mitte = (unten + oben) / 2;
    if (endkapital(mitte) < zielkapital) unten = mitte;
    else oben = mitte;
  }
  return Math.round(((unten + oben) / 2) * 100) / 100;
}

/**
 * Einordnung der Break-even-Rendite für die Beratung. Bewusst ohne Empfehlung:
 * Die Aussage beschreibt nur, wie anspruchsvoll das Ziel ist.
 */
export function breakEvenEinordnung(rendite: number | null): string {
  if (rendite === null) {
    return "Die Garantie des Bestandsvertrags ist mit den angesetzten Kosten rechnerisch nicht erreichbar.";
  }
  if (rendite <= 0) {
    return `Die Fonds-LV erreicht die garantierte Leistung bereits ohne Wertzuwachs (${rendite.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} % p.a.).`;
  }
  return `Die Fonds-LV muss nach Kosten ${rendite.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} % p.a. erreichen, um die garantierte Leistung des Bestandsvertrags einzuholen.`;
}
