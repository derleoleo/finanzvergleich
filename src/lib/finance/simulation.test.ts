// Paritäts- und Grenzfall-Tests für die Simulations-Engine.
// Die "legacy*"-Funktionen frieren das Verhalten der ursprünglichen
// Copy-Paste-Loops (Calculator.tsx / SinglePaymentCalculator.tsx, Stand
// Branch-Basis) als Golden-Referenz ein. Die Engine muss bitgleich rechnen.

import { describe, expect, it } from "vitest";
import {
  simulateLv,
  simulateDepot,
  splitLvEffectiveCosts,
  weightedFundCosts,
} from "./simulation";
import {
  calculateMonthlyReturn,
  calculateZillmerMonths,
} from "@/components/shared/TaxCalculations";

// ---------------------------------------------------------------------------
// Legacy-Referenz: LV-Sparplan, EUR-Modus (aus Calculator.tsx:279-308)
// ---------------------------------------------------------------------------
function legacyLvSavingsEur(args: {
  months: number;
  monthlyContribution: number;
  annualReturn: number;
  acquisitionEur: number;
  adminMonthlyEur: number;
  fundTerPercent: number;
}) {
  const r = calculateMonthlyReturn(args.annualReturn);
  const zillmerMonths = calculateZillmerMonths(args.months);
  const monthlyZillmer = args.acquisitionEur / Math.max(1, zillmerMonths);
  let capital = 0;
  let fundCosts = 0;
  let adminCosts = 0;
  for (let m = 1; m <= args.months; m++) {
    const contribAfter =
      m <= zillmerMonths
        ? args.monthlyContribution - monthlyZillmer
        : args.monthlyContribution;
    const fundCost = capital * (args.fundTerPercent / 100 / 12);
    fundCosts += fundCost;
    adminCosts += args.adminMonthlyEur;
    capital =
      capital * (1 + r) + contribAfter - fundCost - args.adminMonthlyEur;
  }
  return { capital, fundCosts, adminCosts };
}

// Legacy-Referenz: LV-Sparplan, Prozent-Modus (aus Calculator.tsx:309-345)
function legacyLvSavingsPercent(args: {
  months: number;
  monthlyContribution: number;
  annualReturn: number;
  effectivePercent: number;
  fundTerPercent: number;
}) {
  const r = calculateMonthlyReturn(args.annualReturn);
  const effRate = args.effectivePercent / 100 / 12;
  let capital = 0;
  let fundCosts = 0;
  let totalContractCosts = 0;
  for (let m = 1; m <= args.months; m++) {
    const fundCost = capital * (args.fundTerPercent / 100 / 12);
    const effCost = capital * effRate;
    fundCosts += fundCost;
    totalContractCosts += effCost;
    capital =
      capital * (1 + r) + args.monthlyContribution - fundCost - effCost;
  }
  return { capital, fundCosts, totalContractCosts };
}

// Legacy-Referenz: Depot-Sparplan (aus Calculator.tsx:353-380)
function legacyDepotSavings(args: {
  months: number;
  monthlyContribution: number;
  annualReturn: number;
  initialChargePercent: number;
  fundTerPercent: number;
  depotCostsAnnual: number;
}) {
  const r = calculateMonthlyReturn(args.annualReturn);
  const factor = 1 - args.initialChargePercent / 100;
  let capital = 0;
  let initialCharges = 0;
  let fundCosts = 0;
  let depotCosts = 0;
  for (let m = 1; m <= args.months; m++) {
    initialCharges +=
      args.monthlyContribution * (args.initialChargePercent / 100);
    const contribAfter = args.monthlyContribution * factor;
    const depotCost = capital * (args.depotCostsAnnual / 100 / 12);
    const fundCost = capital * (args.fundTerPercent / 100 / 12);
    depotCosts += depotCost;
    fundCosts += fundCost;
    capital = capital * (1 + r) + contribAfter - depotCost - fundCost;
  }
  return { capital, initialCharges, fundCosts, depotCosts };
}

// Legacy-Referenz: LV-Einmalanlage, EUR-Modus (aus SinglePaymentCalculator.tsx:205-216)
function legacyLvSingleEur(args: {
  months: number;
  lumpSum: number;
  annualReturn: number;
  acquisitionEur: number;
  adminMonthlyEur: number;
  fundTerPercent: number;
}) {
  const r = calculateMonthlyReturn(args.annualReturn);
  let capital = args.lumpSum - args.acquisitionEur;
  for (let m = 1; m <= args.months; m++) {
    const fundCost = capital * (args.fundTerPercent / 100 / 12);
    capital = capital * (1 + r) - fundCost - args.adminMonthlyEur;
  }
  return { capital };
}

// ---------------------------------------------------------------------------

describe("simulateLv – Parität zur Legacy-Referenz", () => {
  it("Sparplan EUR-Modus: 200 €/Monat, 25 Jahre, 5 %, Abschluss 2000 €, Verwaltung 6 €, TER 0,3 %", () => {
    const months = 25 * 12;
    const legacy = legacyLvSavingsEur({
      months,
      monthlyContribution: 200,
      annualReturn: 5,
      acquisitionEur: 2000,
      adminMonthlyEur: 6,
      fundTerPercent: 0.3,
    });
    const result = simulateLv({
      months,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.3 }],
      cost: {
        type: "eur",
        acquisition_costs_eur: 2000,
        admin_costs_monthly_eur: 6,
      },
    });
    expect(result.gross_capital).toBeCloseTo(legacy.capital, 6);
    expect(result.costs.fund).toBeCloseTo(legacy.fundCosts, 6);
    expect(result.costs.admin).toBeCloseTo(legacy.adminCosts, 6);
    expect(result.costs.acquisition).toBe(2000);
    expect(result.total_contributions).toBe(200 * months);
    expect(result.series).toHaveLength(months);
    expect(result.series[months - 1].capital).toBeCloseTo(legacy.capital, 6);
  });

  it("Sparplan Prozent-Modus: Split nach der gleitenden Regel", () => {
    const months = 25 * 12;
    const legacy = legacyLvSavingsPercent({
      months,
      monthlyContribution: 200,
      annualReturn: 5,
      effectivePercent: 0.7,
      fundTerPercent: 0.3,
    });
    const result = simulateLv({
      months,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.3 }],
      cost: { type: "percent", effective_costs_percent: 0.7 },
    });
    expect(result.gross_capital).toBeCloseTo(legacy.capital, 6);
    expect(result.costs.fund).toBeCloseTo(legacy.fundCosts, 6);
    // Split: years=25 → adminShare = 0.3*20/25 = 0.24
    expect(result.costs.admin).toBeCloseTo(legacy.totalContractCosts * 0.24, 6);
    expect(result.costs.acquisition).toBeCloseTo(
      legacy.totalContractCosts * 0.76,
      6
    );
  });

  it("Einmalanlage EUR-Modus: Abschluss upfront statt Zillmer", () => {
    const months = 15 * 12;
    const legacy = legacyLvSingleEur({
      months,
      lumpSum: 50000,
      annualReturn: 5,
      acquisitionEur: 2000,
      adminMonthlyEur: 6,
      fundTerPercent: 0.3,
    });
    const result = simulateLv({
      months,
      annual_return_percent: 5,
      initial_capital: 50000,
      funds: [{ allocation_eur: 50000, ongoing_costs_percent: 0.3 }],
      cost: {
        type: "eur",
        acquisition_costs_eur: 2000,
        admin_costs_monthly_eur: 6,
      },
    });
    expect(result.gross_capital).toBeCloseTo(legacy.capital, 6);
    expect(result.total_contributions).toBe(50000);
  });

  it("Startkapital + Beitragsstrom (BestAdvice-Fall): Zillmer greift, Kapital startet ungekürzt", () => {
    // Referenz: BestAdviceCalculator.tsx EUR-Zweig
    const months = 20 * 12;
    const r = calculateMonthlyReturn(4);
    const zm = calculateZillmerMonths(months);
    const mz = 3000 / zm;
    let capital = 25000;
    for (let m = 1; m <= months; m++) {
      const contribAfter = m <= zm ? 150 - mz : 150;
      const fundCost = capital * (0.4 / 100 / 12);
      capital = capital * (1 + r) + contribAfter - fundCost - 5;
    }
    const result = simulateLv({
      months,
      annual_return_percent: 4,
      monthly_contribution: 150,
      initial_capital: 25000,
      funds: [{ allocation_eur: 150, ongoing_costs_percent: 0.4 }],
      cost: {
        type: "eur",
        acquisition_costs_eur: 3000,
        admin_costs_monthly_eur: 5,
      },
    });
    expect(result.gross_capital).toBeCloseTo(capital, 6);
    expect(result.total_contributions).toBe(25000 + 150 * months);
  });

  it("Zillmer-Kappe: 36 Monate Laufzeit → Verteilung über 36, 120 Monate → über 60", () => {
    expect(calculateZillmerMonths(36)).toBe(36);
    expect(calculateZillmerMonths(120)).toBe(60);
    expect(calculateZillmerMonths(600)).toBe(60);

    // Nach Ablauf der Zillmerphase fließt der volle Beitrag: Kapital nach
    // 60 Monaten Zillmer + 60 normalen Monaten > Kapital bei (fiktiver)
    // Zillmerung über die vollen 120 Monate wäre – hier nur Konsistenz:
    // Summe der Zillmer-Abzüge == Abschlusskosten.
    const months = 120;
    const withZillmer = simulateLv({
      months,
      annual_return_percent: 0,
      monthly_contribution: 100,
      funds: [{ allocation_eur: 100, ongoing_costs_percent: 0 }],
      cost: { type: "eur", acquisition_costs_eur: 1200, admin_costs_monthly_eur: 0 },
    });
    const without = simulateLv({
      months,
      annual_return_percent: 0,
      monthly_contribution: 100,
      funds: [{ allocation_eur: 100, ongoing_costs_percent: 0 }],
      cost: { type: "eur", acquisition_costs_eur: 0, admin_costs_monthly_eur: 0 },
    });
    // Bei 0% Rendite ist die Differenz exakt die Abschlusskosten
    expect(without.gross_capital - withZillmer.gross_capital).toBeCloseTo(1200, 6);
  });
});

describe("simulateDepot – Parität zur Legacy-Referenz", () => {
  it("Sparplan mit Ausgabeaufschlag, TER und Depotkosten", () => {
    const months = 25 * 12;
    const legacy = legacyDepotSavings({
      months,
      monthlyContribution: 200,
      annualReturn: 5,
      initialChargePercent: 2.5,
      fundTerPercent: 0.5,
      depotCostsAnnual: 0.25,
    });
    const result = simulateDepot({
      months,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [
        {
          allocation_eur: 200,
          ongoing_costs_percent: 0.5,
          initial_charge_percent: 2.5,
        },
      ],
      depot_costs_annual_percent: 0.25,
    });
    expect(result.gross_capital).toBeCloseTo(legacy.capital, 6);
    expect(result.costs.initial_charges).toBeCloseTo(legacy.initialCharges, 6);
    expect(result.costs.fund).toBeCloseTo(legacy.fundCosts, 6);
    expect(result.costs.depot).toBeCloseTo(legacy.depotCosts, 6);
  });

  it("Einmalanlage: Ausgabeaufschlag auf den Einmalbetrag", () => {
    // Referenz: SinglePaymentCalculator.tsx Depot-Zweig
    const months = 10 * 12;
    const r = calculateMonthlyReturn(5);
    let capital = 50000 * (1 - 0.03);
    let fundCosts = 0;
    let depotCosts = 0;
    for (let m = 1; m <= months; m++) {
      const depotCost = capital * (0.25 / 100 / 12);
      const fundCost = capital * (0.5 / 100 / 12);
      depotCosts += depotCost;
      fundCosts += fundCost;
      capital = capital * (1 + r) - depotCost - fundCost;
    }
    const result = simulateDepot({
      months,
      annual_return_percent: 5,
      initial_capital: 50000,
      funds: [
        {
          allocation_eur: 50000,
          ongoing_costs_percent: 0.5,
          initial_charge_percent: 3,
        },
      ],
      depot_costs_annual_percent: 0.25,
    });
    expect(result.gross_capital).toBeCloseTo(capital, 6);
    expect(result.costs.initial_charges).toBeCloseTo(50000 * 0.03, 6);
    expect(result.costs.fund).toBeCloseTo(fundCosts, 6);
    expect(result.costs.depot).toBeCloseTo(depotCosts, 6);
  });

  it("kostenfreier Sparplan (PensionGap-Fall): reine Verzinsung + Beiträge", () => {
    const months = 24;
    const r = calculateMonthlyReturn(3);
    let capital = 10000;
    for (let m = 0; m < months; m++) capital = capital * (1 + r) + 500;
    const result = simulateDepot({
      months,
      annual_return_percent: 3,
      monthly_contribution: 500,
      initial_capital: 10000,
      funds: [],
      depot_costs_annual_percent: 0,
    });
    expect(result.gross_capital).toBeCloseTo(capital, 6);
  });
});

describe("splitLvEffectiveCosts", () => {
  it.each([
    [4, 0.6, 0.4],
    [5, 0.6, 0.4],
    [6, 1 - 0.05, 0.05],
    [25, 0.76, 0.24],
    [100, 1 - 0.285, 0.285],
  ])("years=%s → acqShare=%s, adminShare=%s", (years, acq, admin) => {
    const split = splitLvEffectiveCosts(1000, years as number);
    expect(split.acqShare).toBeCloseTo(acq as number, 10);
    expect(split.adminShare).toBeCloseTo(admin as number, 10);
    expect(split.acquisition + split.admin).toBeCloseTo(1000, 10);
  });
});

describe("weightedFundCosts", () => {
  it("einzelner Fonds zählt unabhängig von der Allokation voll", () => {
    expect(
      weightedFundCosts([{ allocation_eur: 0, ongoing_costs_percent: 0.7 }])
    ).toEqual({ ongoing_costs_percent: 0.7, initial_charge_percent: 0 });
  });

  it("50/50-Gewichtung: TER 0,2 % und 0,6 % → 0,4 %", () => {
    const w = weightedFundCosts([
      { allocation_eur: 100, ongoing_costs_percent: 0.2, initial_charge_percent: 1 },
      { allocation_eur: 100, ongoing_costs_percent: 0.6, initial_charge_percent: 3 },
    ]);
    expect(w.ongoing_costs_percent).toBeCloseTo(0.4, 10);
    expect(w.initial_charge_percent).toBeCloseTo(2, 10);
  });

  it("0-€-Allokationen lösen keine Division durch 0 aus", () => {
    const w = weightedFundCosts([
      { allocation_eur: 0, ongoing_costs_percent: 0.2 },
      { allocation_eur: 0, ongoing_costs_percent: 0.6 },
    ]);
    expect(Number.isFinite(w.ongoing_costs_percent)).toBe(true);
  });

  it("leeres Array → 0", () => {
    expect(weightedFundCosts([])).toEqual({
      ongoing_costs_percent: 0,
      initial_charge_percent: 0,
    });
  });
});
