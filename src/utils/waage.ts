// Logik der Ergebnis-Waage („Vorsorgewaage“): Neigung und Aussagesatz.
// Reine Funktionen, damit sie ohne DOM testbar sind.
import { formatCurrency } from "@/components/shared/CurrencyDisplay";

/** Maximale Neigung des Waagebalkens in Grad. */
export const MAX_NEIGUNG_GRAD = 12;
/** Ab diesem relativen Unterschied ist die maximale Neigung erreicht (20 %). */
export const VOLLAUSSCHLAG_AB = 0.2;
/** Unterhalb dieses relativen Unterschieds gelten beide Seiten als gleichauf (0,5 %). */
export const GLEICHAUF_BIS = 0.005;

/**
 * Relativer Unterschied bezogen auf die größere Seite (−1 … 1).
 * Positiv = rechts mehr Kapital.
 */
export function relativerUnterschied(links: number, rechts: number): number {
  const basis = Math.max(Math.abs(links), Math.abs(rechts));
  if (!Number.isFinite(basis) || basis === 0) return 0;
  return (rechts - links) / basis;
}

export function istGleichauf(links: number, rechts: number): boolean {
  return Math.abs(relativerUnterschied(links, rechts)) < GLEICHAUF_BIS;
}

/**
 * Neigung in Grad. Positiv = rechte Schale tiefer (rechts schwerer).
 * Linear bis zum Vollausschlag, darunter bleibt die Waage im Gleichgewicht.
 */
export function waageNeigung(links: number, rechts: number): number {
  const rel = relativerUnterschied(links, rechts);
  if (Math.abs(rel) < GLEICHAUF_BIS) return 0;
  const grad = (Math.min(Math.abs(rel), VOLLAUSSCHLAG_AB) / VOLLAUSSCHLAG_AB) * MAX_NEIGUNG_GRAD;
  return Math.sign(rel) * grad;
}

/**
 * Anteil des Mehrkapitals der schwereren Seite gegenüber der leichteren, in Prozent.
 * `null`, wenn die leichtere Seite ≤ 0 ist (Prozentangabe wäre sinnlos).
 */
export function mehrProzent(links: number, rechts: number): number | null {
  const leichter = Math.min(links, rechts);
  if (leichter <= 0) return null;
  return (Math.abs(rechts - links) / leichter) * 100;
}

type Seite = { name: string; imSatz: string; wert: number };

/**
 * Neutraler Aussagesatz zum Ergebnis – bewusst ohne Wertung („besser“),
 * es handelt sich um eine Modellrechnung auf Basis der Eingaben.
 */
export function waagenAussage(links: Seite, rechts: Seite): string {
  const differenz = Math.abs(rechts.wert - links.wert);
  if (istGleichauf(links.wert, rechts.wert)) {
    return `Auf Basis der gemachten Angaben liegen ${links.name} und ${rechts.name} nahezu gleichauf (Unterschied ${formatCurrency(differenz)}).`;
  }
  const [schwer, leicht] = rechts.wert > links.wert ? [rechts, links] : [links, rechts];
  const prozent = mehrProzent(links.wert, rechts.wert);
  const prozentText =
    prozent === null
      ? ""
      : ` (+${prozent.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %)`;
  return `Auf Basis der gemachten Angaben wird mit ${schwer.imSatz} ein um ${formatCurrency(differenz)}${prozentText} höheres Endkapital erwartet als mit ${leicht.imSatz}.`;
}
