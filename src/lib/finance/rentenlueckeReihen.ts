// Jahresreihe des Sparplans zur Schliessung der Rentenluecke.
//
// Ausgelagert, weil die Fassung dieselbe Reihe braucht wie die Detailseite
// (Audit O08). Lag sie nur in der Seite, hielt eine gespeicherte Fassung nur
// Kennzahlen fest und war nicht als Verlauf darstellbar.

import type { PensionGapModel } from "@/entities/PensionGapCalculation";
import { simulateDepot } from "@/lib/finance/simulation";

export function baueRentenlueckeReihen(calc: PensionGapModel) {
  if (!calc.results || calc.results.gap_already_covered) return [];

  const r = calc.results;
  const years_to_retirement = r.years_to_retirement;
  const currentAge = r.current_age;

  // Kostenfreier Sparplan über die gemeinsame Engine
  const sim = simulateDepot({
    months: years_to_retirement * 12,
    annual_return_percent: calc.assumed_annual_return || 0,
    monthly_contribution: r.monthly_savings_needed,
    initial_capital: calc.existing_capital || 0,
    funds: [],
    depot_costs_annual_percent: 0,
  });

  const points: { year: number; age: number; capital: number; target: number }[] = [];
  for (let y = 1; y <= years_to_retirement; y++) {
    points.push({
      year: y,
      age: currentAge + y,
      capital: Math.round(sim.series[y * 12 - 1].capital),
      target: Math.round(r.capital_needed_at_retirement),
    });
  }

  return points;
}
