// src/lib/finance/riy.ts
// Effektivkosten als Reduction in Yield (RIY): um wie viele Prozentpunkte p.a.
// mindern die Kosten die Rendite? Gleiche Kennzahl wie in
// PRIIPs-Basisinformationsblättern.
//
// Herleitung: Der kostenfreie Referenzlauf hat per Konstruktion exakt die
// angenommene Rendite als internen Zins. Es genügt also, den internen Zins
// des Kosten-Laufs zu bestimmen: riy = angenommene Rendite − interner Zins.

import { calculateMonthlyReturn } from "@/components/shared/TaxCalculations";

export type ContributionStream = {
  monthly_contribution?: number;
  initial_capital?: number;
  months: number;
  dynamik_percent?: number;
};

/**
 * Interner Jahreszins (%), der aus der Beitragsreihe (Startkapital +
 * Monatsbeiträge mit optionaler Dynamik) das gegebene Endkapital erzeugt.
 * Bisektion; die Endwertfunktion ist im Zins streng monoton.
 * Beitragskonvention wie in der Engine: capital = capital·(1+r) + beitrag.
 */
export function effectiveAnnualReturn(
  endCapital: number,
  stream: ContributionStream
): number {
  const months = Math.max(1, Math.floor(stream.months));
  const monthly = Number(stream.monthly_contribution) || 0;
  const initial = Number(stream.initial_capital) || 0;
  const dynamikFactor = 1 + (Number(stream.dynamik_percent) || 0) / 100;
  const target = Number(endCapital) || 0;

  if (initial <= 0 && monthly <= 0) return 0;

  const futureValue = (annualPercent: number) => {
    const r = calculateMonthlyReturn(annualPercent);
    let capital = initial;
    let contribution = monthly;
    for (let m = 1; m <= months; m++) {
      if (m > 1 && (m - 1) % 12 === 0) contribution *= dynamikFactor;
      capital = capital * (1 + r) + contribution;
    }
    return capital;
  };

  let lo = -50;
  let hi = 50;
  if (futureValue(lo) >= target) return lo;
  if (futureValue(hi) <= target) return hi;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (futureValue(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Effektivkosten in Prozentpunkten p.a.: angenommene Rendite minus interner
 * Zins des Laufs mit Kosten. 0, wenn keine Kosten wirken.
 */
export function reductionInYield(
  endCapitalWithCosts: number,
  assumedAnnualReturnPercent: number,
  stream: ContributionStream
): number {
  const withCosts = effectiveAnnualReturn(endCapitalWithCosts, stream);
  return (Number(assumedAnnualReturnPercent) || 0) - withCosts;
}
