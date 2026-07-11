import { describe, expect, it } from "vitest";
import { effectiveAnnualReturn, reductionInYield } from "./riy";
import { simulateDepot, simulateLv } from "./simulation";
import { buildComparisonResults } from "./series";

describe("effectiveAnnualReturn", () => {
  it("kostenfreier Sparplan → interner Zins == angenommene Rendite", () => {
    const sim = simulateDepot({
      months: 120,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [],
      depot_costs_annual_percent: 0,
    });
    const ear = effectiveAnnualReturn(sim.gross_capital, {
      monthly_contribution: 200,
      months: 120,
    });
    expect(ear).toBeCloseTo(5, 6);
  });

  it("kostenfreie Einmalanlage mit Dynamik-Sparplan kombiniert", () => {
    const sim = simulateDepot({
      months: 240,
      annual_return_percent: 4,
      monthly_contribution: 150,
      initial_capital: 20000,
      funds: [],
      depot_costs_annual_percent: 0,
      dynamik_percent: 3,
    });
    const ear = effectiveAnnualReturn(sim.gross_capital, {
      monthly_contribution: 150,
      initial_capital: 20000,
      months: 240,
      dynamik_percent: 3,
    });
    expect(ear).toBeCloseTo(4, 6);
  });

  it("keine Beiträge → 0 (Guard)", () => {
    expect(effectiveAnnualReturn(1000, { months: 12 })).toBe(0);
  });
});

describe("reductionInYield", () => {
  it("ohne Kosten → 0", () => {
    const sim = simulateDepot({
      months: 120,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [],
      depot_costs_annual_percent: 0,
    });
    const riy = reductionInYield(sim.gross_capital, 5, {
      monthly_contribution: 200,
      months: 120,
    });
    expect(riy).toBeCloseTo(0, 6);
  });

  it("nur TER 0,5 % → RIY ≈ 0,5 %-Punkte", () => {
    const sim = simulateDepot({
      months: 300,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.5 }],
      depot_costs_annual_percent: 0,
    });
    const riy = reductionInYield(sim.gross_capital, 5, {
      monthly_contribution: 200,
      months: 300,
    });
    expect(riy).toBeGreaterThan(0.4);
    expect(riy).toBeLessThan(0.6);
  });

  it("LV mit Abschluss- und Verwaltungskosten → RIY > reine TER", () => {
    const months = 300;
    const lv = simulateLv({
      months,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.3 }],
      cost: { type: "eur", acquisition_costs_eur: 2000, admin_costs_monthly_eur: 6 },
    });
    const riy = reductionInYield(lv.gross_capital, 5, {
      monthly_contribution: 200,
      months,
    });
    expect(riy).toBeGreaterThan(0.3);
  });
});

describe("buildComparisonResults mit riyInputs", () => {
  it("liefert li_riy_percent und depot_riy_percent, LV teurer als Depot", () => {
    const months = 25 * 12;
    const lv = simulateLv({
      months,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.3 }],
      cost: { type: "eur", acquisition_costs_eur: 2000, admin_costs_monthly_eur: 6 },
    });
    const depot = simulateDepot({
      months,
      annual_return_percent: 5,
      monthly_contribution: 200,
      funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.5 }],
      depot_costs_annual_percent: 0.25,
    });
    const r = buildComparisonResults({
      lv,
      depot,
      years: 25,
      birth_year: 1985,
      riyInputs: {
        annual_return_percent: 5,
        monthly_contribution: 200,
        months,
      },
    });
    expect(r.li_riy_percent).toBeGreaterThan(0);
    expect(r.depot_riy_percent).toBeGreaterThan(0);
    expect(r.li_riy_percent!).toBeGreaterThan(r.depot_riy_percent!);
  });

  it("ohne riyInputs bleiben die Felder undefined", () => {
    const months = 12;
    const lv = simulateLv({
      months,
      annual_return_percent: 5,
      monthly_contribution: 100,
      funds: [],
      cost: { type: "eur", acquisition_costs_eur: 0, admin_costs_monthly_eur: 0 },
    });
    const depot = simulateDepot({
      months,
      annual_return_percent: 5,
      monthly_contribution: 100,
      funds: [],
      depot_costs_annual_percent: 0,
    });
    const r = buildComparisonResults({ lv, depot, years: 1, birth_year: 1985 });
    expect(r.li_riy_percent).toBeUndefined();
    expect(r.depot_riy_percent).toBeUndefined();
  });
});
