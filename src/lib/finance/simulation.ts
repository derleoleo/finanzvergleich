// src/lib/finance/simulation.ts
// Gemeinsame Simulations-Engine für alle Rechner (LV vs. Depot).
// Einzige Quelle der Wahrheit für den Monat-für-Monat-Loop.
//
// Semantik (konserviert das bisherige Calculator.tsx-Verhalten):
// - Kosten werden auf das Kapital des Vormonats gerechnet, dann:
//   capital = capital * (1 + monatsrendite) + beitrag - kosten
// - LV/EUR-Modus mit Beitragsstrom: Abschlusskosten gezillmert über max. 60 Monate.
// - LV/EUR-Modus bei reiner Einmalanlage (kein Beitrag): Abschlusskosten upfront
//   vom Startkapital abgezogen.
// - LV/Prozent-Modus: Effektivkosten monatlich vom Kapital; Split Abschluss/Verwaltung
//   nach einheitlicher Regel (siehe splitLvEffectiveCosts).
// - Depot: Ausgabeaufschlag auf Startkapital und jeden Beitrag; Depot- und
//   Fondskosten monatlich vom Kapital.

import {
  calculateMonthlyReturn,
  calculateZillmerMonths,
} from "@/components/shared/TaxCalculations";

export type FundAllocation = {
  allocation_eur: number;
  ongoing_costs_percent: number; // TER p.a.
  initial_charge_percent?: number; // Ausgabeaufschlag, nur Depot
};

export type LvCostConfig =
  | { type: "eur"; acquisition_costs_eur: number; admin_costs_monthly_eur: number }
  | { type: "percent"; effective_costs_percent: number };

export type LvSimulationInput = {
  months: number;
  annual_return_percent: number;
  monthly_contribution?: number; // 0 = reine Einmalanlage
  initial_capital?: number; // Einmalbetrag / übertragenes Bestandskapital
  funds: FundAllocation[]; // gewichtete TER via weightedFundCosts()
  cost: LvCostConfig;
};

export type DepotSimulationInput = {
  months: number;
  annual_return_percent: number;
  monthly_contribution?: number;
  initial_capital?: number;
  funds: FundAllocation[]; // gewichtete TER + gewichteter Ausgabeaufschlag
  depot_costs_annual_percent: number;
};

export type MonthlyPoint = {
  month: number; // 1..months
  capital: number; // Brutto-Kapital am Monatsende
  contributions_cum: number; // Einzahlungen kumuliert (inkl. Startkapital)
};

export type LvSimulationResult = {
  gross_capital: number;
  total_contributions: number;
  costs: { acquisition: number; admin: number; fund: number; total: number };
  series: MonthlyPoint[];
};

export type DepotSimulationResult = {
  gross_capital: number;
  total_contributions: number;
  costs: { initial_charges: number; depot: number; fund: number; total: number };
  series: MonthlyPoint[];
};

/**
 * Allokationsgewichtete Fondskosten (Verhalten wie bisher in Calculator.tsx):
 * ein einzelner Fonds zählt unabhängig von seiner Allokation voll,
 * mehrere Fonds werden nach allocation_eur gewichtet (Guard gegen Division durch 0).
 */
export function weightedFundCosts(funds: FundAllocation[]): {
  ongoing_costs_percent: number;
  initial_charge_percent: number;
} {
  if (!funds || funds.length === 0) {
    return { ongoing_costs_percent: 0, initial_charge_percent: 0 };
  }
  if (funds.length === 1) {
    return {
      ongoing_costs_percent: Number(funds[0].ongoing_costs_percent) || 0,
      initial_charge_percent: Number(funds[0].initial_charge_percent) || 0,
    };
  }
  const totalAlloc = Math.max(
    0.01,
    funds.reduce((s, f) => s + (Number(f.allocation_eur) || 0), 0)
  );
  const weighted = (pick: (f: FundAllocation) => number) =>
    funds.reduce(
      (acc, f) => acc + ((Number(f.allocation_eur) || 0) / totalAlloc) * pick(f),
      0
    );
  return {
    ongoing_costs_percent: weighted((f) => Number(f.ongoing_costs_percent) || 0),
    initial_charge_percent: weighted((f) => Number(f.initial_charge_percent) || 0),
  };
}

/**
 * Einheitlicher Split der LV-Effektivkosten in Abschluss- und Verwaltungsanteil:
 * - Laufzeit <= 5 Jahre: 60% Abschluss / 40% Verwaltung
 * - Laufzeit > 5 Jahre: 30% der Kosten entfallen anteilig auf die
 *   "Verwaltungsphase" (Jahre 6+): adminShare = 0.3 * (years - 5) / years,
 *   der Rest auf die Abschlussphase. adminShare → 0.3 für years → ∞.
 */
export function splitLvEffectiveCosts(
  totalContractCosts: number,
  years: number
): { acquisition: number; admin: number; acqShare: number; adminShare: number } {
  let acqShare = 0.6;
  let adminShare = 0.4;
  if (years > 5) {
    adminShare = (0.3 * (years - 5)) / years;
    acqShare = 1 - adminShare;
  }
  return {
    acquisition: totalContractCosts * acqShare,
    admin: totalContractCosts * adminShare,
    acqShare,
    adminShare,
  };
}

export function simulateLv(input: LvSimulationInput): LvSimulationResult {
  const months = Math.max(1, Math.floor(input.months));
  const years = months / 12;
  const monthlyContribution = Number(input.monthly_contribution) || 0;
  const monthlyReturn = calculateMonthlyReturn(input.annual_return_percent);
  const fundMonthlyRate =
    weightedFundCosts(input.funds).ongoing_costs_percent / 100 / 12;

  let capital = Number(input.initial_capital) || 0;
  let acquisitionCosts = 0;
  let adminCosts = 0;
  let fundCosts = 0;

  const series: MonthlyPoint[] = [];
  const initialContribution = Number(input.initial_capital) || 0;

  if (input.cost.type === "eur") {
    const acq = Number(input.cost.acquisition_costs_eur) || 0;
    const adminMonthly = Number(input.cost.admin_costs_monthly_eur) || 0;
    acquisitionCosts = acq;

    // Zillmerung nur bei Beitragsstrom; bei reiner Einmalanlage Abschluss upfront
    const useZillmer = monthlyContribution > 0;
    const zillmerMonths = useZillmer ? calculateZillmerMonths(months) : 0;
    const monthlyZillmer = useZillmer ? acq / Math.max(1, zillmerMonths) : 0;
    if (!useZillmer) capital -= acq;

    for (let m = 1; m <= months; m++) {
      const contribAfter =
        useZillmer && m <= zillmerMonths
          ? monthlyContribution - monthlyZillmer
          : monthlyContribution;

      const fundCost = capital * fundMonthlyRate;
      fundCosts += fundCost;
      adminCosts += adminMonthly;

      capital =
        capital * (1 + monthlyReturn) + contribAfter - fundCost - adminMonthly;

      series.push({
        month: m,
        capital,
        contributions_cum: initialContribution + m * monthlyContribution,
      });
    }
  } else {
    const effRate = (Number(input.cost.effective_costs_percent) || 0) / 100 / 12;
    let totalContractCosts = 0;

    for (let m = 1; m <= months; m++) {
      const fundCost = capital * fundMonthlyRate;
      const effCost = capital * effRate;
      fundCosts += fundCost;
      totalContractCosts += effCost;

      capital =
        capital * (1 + monthlyReturn) +
        monthlyContribution -
        fundCost -
        effCost;

      series.push({
        month: m,
        capital,
        contributions_cum: initialContribution + m * monthlyContribution,
      });
    }

    const split = splitLvEffectiveCosts(totalContractCosts, years);
    acquisitionCosts = split.acquisition;
    adminCosts = split.admin;
  }

  return {
    gross_capital: capital,
    total_contributions: initialContribution + monthlyContribution * months,
    costs: {
      acquisition: acquisitionCosts,
      admin: adminCosts,
      fund: fundCosts,
      total: acquisitionCosts + adminCosts + fundCosts,
    },
    series,
  };
}

export function simulateDepot(input: DepotSimulationInput): DepotSimulationResult {
  const months = Math.max(1, Math.floor(input.months));
  const monthlyContribution = Number(input.monthly_contribution) || 0;
  const monthlyReturn = calculateMonthlyReturn(input.annual_return_percent);

  const { ongoing_costs_percent, initial_charge_percent } = weightedFundCosts(
    input.funds
  );
  const fundMonthlyRate = ongoing_costs_percent / 100 / 12;
  const depotMonthlyRate =
    (Number(input.depot_costs_annual_percent) || 0) / 100 / 12;
  const initialChargeRate = initial_charge_percent / 100;

  const initialContribution = Number(input.initial_capital) || 0;
  let initialCharges = initialContribution * initialChargeRate;
  let capital = initialContribution - initialCharges;
  let depotCosts = 0;
  let fundCosts = 0;

  const series: MonthlyPoint[] = [];

  for (let m = 1; m <= months; m++) {
    const initCost = monthlyContribution * initialChargeRate;
    initialCharges += initCost;
    const contribAfterInit = monthlyContribution - initCost;

    const depotCost = capital * depotMonthlyRate;
    const fundCost = capital * fundMonthlyRate;
    depotCosts += depotCost;
    fundCosts += fundCost;

    capital =
      capital * (1 + monthlyReturn) + contribAfterInit - depotCost - fundCost;

    series.push({
      month: m,
      capital,
      contributions_cum: initialContribution + m * monthlyContribution,
    });
  }

  return {
    gross_capital: capital,
    total_contributions: initialContribution + monthlyContribution * months,
    costs: {
      initial_charges: initialCharges,
      depot: depotCosts,
      fund: fundCosts,
      total: initialCharges + depotCosts + fundCosts,
    },
    series,
  };
}
