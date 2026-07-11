// src/lib/finance/series.ts
// Jahres-Serien für Charts und Ergebnis-Assembly auf Basis der Simulations-Engine.

import {
  calculateAgeAtPayout,
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  type DepotTaxOptions,
  type LifeInsuranceTaxOptions,
} from "@/components/shared/TaxCalculations";
import type {
  DepotSimulationResult,
  LvSimulationResult,
  MonthlyPoint,
} from "./simulation";

export type Mode = "gross" | "net";

export type YearPoint = {
  year: number;
  age: number;
  lv: number;
  depot: number;
};

/**
 * Jahres-Checkpoints (Jahr 1..n) für die Verlaufscharts.
 * Netto: LV via Halbeinkünfte-Regel (Qualifikation je Checkpoint-Jahr geprüft),
 * Depot via Abgeltungsteuer inkl. optionaler Teilfreistellung/Pauschbetrag.
 * Gewinne werden gegen die bis dahin eingezahlten Beiträge gerechnet.
 */
export function buildYearlySeries(args: {
  lv: MonthlyPoint[];
  depot: MonthlyPoint[];
  mode: Mode;
  birth_year: number;
  lvTaxOptions?: LifeInsuranceTaxOptions;
  depotTaxOptions?: DepotTaxOptions;
}): YearPoint[] {
  const { lv, depot, mode, birth_year, lvTaxOptions, depotTaxOptions } = args;
  const months = Math.min(lv.length, depot.length);
  const points: YearPoint[] = [];

  for (let m = 12; m <= months; m += 12) {
    const year = m / 12;
    const age = calculateAgeAtPayout(birth_year, year);
    const lvPoint = lv[m - 1];
    const depotPoint = depot[m - 1];

    if (mode === "gross") {
      points.push({
        year,
        age,
        lv: Math.round(lvPoint.capital),
        depot: Math.round(depotPoint.capital),
      });
    } else {
      const lvTax = calculateLifeInsuranceTax(
        lvPoint.capital - lvPoint.contributions_cum,
        year,
        age,
        lvTaxOptions
      );
      const depotTax = calculateCapitalGainsTax(
        depotPoint.capital - depotPoint.contributions_cum,
        depotTaxOptions
      );
      points.push({
        year,
        age,
        lv: Math.round(lvPoint.capital - lvTax),
        depot: Math.round(depotPoint.capital - depotTax),
      });
    }
  }

  return points;
}

/**
 * Monats-Serie für einen garantierten Bestandsvertrag (BestAdvice):
 * lineare Interpolation vom Startkapital zum garantierten Endkapital.
 */
export function buildGuaranteedSeries(args: {
  initial_capital: number;
  monthly_contribution: number;
  guaranteed_end_capital: number;
  months: number;
}): MonthlyPoint[] {
  const { initial_capital, monthly_contribution, guaranteed_end_capital } = args;
  const months = Math.max(1, Math.floor(args.months));
  const series: MonthlyPoint[] = [];
  for (let m = 1; m <= months; m++) {
    series.push({
      month: m,
      capital:
        initial_capital +
        (guaranteed_end_capital - initial_capital) * (m / months),
      contributions_cum: initial_capital + m * monthly_contribution,
    });
  }
  return series;
}

export type ComparisonResults = {
  total_contributions: number;

  life_insurance_gross: number;
  life_insurance_net: number;
  depot_gross: number;
  depot_net: number;

  li_total_costs: number;
  depot_total_costs: number;

  li_acquisition_costs: number;
  li_fund_costs: number;
  // Verwaltungs-Bucket wird historisch unter zwei Namen gelesen:
  // Calculator/CalculatorDetail nutzen li_effective_costs,
  // SinglePayment/BestAdvice nutzen li_admin_costs. Wir liefern beide.
  li_effective_costs: number;
  li_admin_costs: number;

  depot_initial_charges: number;
  depot_fund_costs: number;
  depot_depot_costs: number;

  li_tax: number;
  depot_tax: number;
};

/**
 * Komplettes Vergleichs-Ergebnis (LV vs. Depot) im gespeicherten results-Shape.
 * Laufzeit/Alter für die LV-Steuerqualifikation beziehen sich auf das Laufzeitende.
 */
export function buildComparisonResults(args: {
  lv: LvSimulationResult;
  depot: DepotSimulationResult;
  years: number;
  birth_year: number;
  lvTaxOptions?: LifeInsuranceTaxOptions;
  depotTaxOptions?: DepotTaxOptions;
}): ComparisonResults {
  const { lv, depot, years, birth_year, lvTaxOptions, depotTaxOptions } = args;

  const ageAtPayout = calculateAgeAtPayout(birth_year, years);
  const liTax = calculateLifeInsuranceTax(
    lv.gross_capital - lv.total_contributions,
    years,
    ageAtPayout,
    lvTaxOptions
  );
  const depotTax = calculateCapitalGainsTax(
    depot.gross_capital - depot.total_contributions,
    depotTaxOptions
  );

  return {
    total_contributions: Math.round(lv.total_contributions),

    life_insurance_gross: Math.round(lv.gross_capital),
    life_insurance_net: Math.round(lv.gross_capital - liTax),
    depot_gross: Math.round(depot.gross_capital),
    depot_net: Math.round(depot.gross_capital - depotTax),

    li_total_costs: Math.round(lv.costs.total),
    depot_total_costs: Math.round(depot.costs.total),

    li_acquisition_costs: Math.round(lv.costs.acquisition),
    li_fund_costs: Math.round(lv.costs.fund),
    li_effective_costs: Math.round(lv.costs.admin),
    li_admin_costs: Math.round(lv.costs.admin),

    depot_initial_charges: Math.round(depot.costs.initial_charges),
    depot_fund_costs: Math.round(depot.costs.fund),
    depot_depot_costs: Math.round(depot.costs.depot),

    li_tax: Math.round(liTax),
    depot_tax: Math.round(depotTax),
  };
}
