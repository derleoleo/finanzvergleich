import { describe, expect, it } from "vitest";
import { simulateDepot, simulateLv } from "./simulation";
import {
  buildComparisonResults,
  buildGuaranteedSeries,
  buildYearlySeries,
} from "./series";

// Geburtsjahr so wählen, dass die Halbeinkünfte-Qualifikation (Alter ≥ 62)
// unabhängig vom aktuellen Datum sicher erfüllt bzw. nicht erfüllt ist.
const OLD_BIRTH_YEAR = new Date().getFullYear() - 55; // 55 heute → 62+ nach 7+ Jahren
const YOUNG_BIRTH_YEAR = new Date().getFullYear() - 20;

function makePair(years: number) {
  const months = years * 12;
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
  return { lv, depot, months, years };
}

describe("buildYearlySeries", () => {
  it("Brutto-Jahrespunkt k entspricht series[12k-1].capital", () => {
    const { lv, depot, years } = makePair(10);
    const points = buildYearlySeries({
      lv: lv.series,
      depot: depot.series,
      mode: "gross",
      birth_year: 1985,
    });
    expect(points).toHaveLength(years);
    for (const p of points) {
      expect(p.lv).toBe(Math.round(lv.series[p.year * 12 - 1].capital));
      expect(p.depot).toBe(Math.round(depot.series[p.year * 12 - 1].capital));
    }
  });

  it("Netto-Serie am Laufzeitende == Summary-Netto aus buildComparisonResults", () => {
    const { lv, depot, years } = makePair(25);
    const lvTaxOptions = { personalIncomeTaxRate: 0.2 };
    const depotTaxOptions = {
      teilfreistellung_percent: 30,
      sparerpauschbetrag_eur: 1000,
    };

    const points = buildYearlySeries({
      lv: lv.series,
      depot: depot.series,
      mode: "net",
      birth_year: OLD_BIRTH_YEAR,
      lvTaxOptions,
      depotTaxOptions,
    });
    const summary = buildComparisonResults({
      lv,
      depot,
      years,
      birth_year: OLD_BIRTH_YEAR,
      lvTaxOptions,
      depotTaxOptions,
    });

    const last = points[points.length - 1];
    expect(last.lv).toBe(summary.life_insurance_net);
    expect(last.depot).toBe(summary.depot_net);
  });

  it("Depot-Netto steigt durch Teilfreistellung + Pauschbetrag", () => {
    const { lv, depot, years } = makePair(25);
    const base = buildComparisonResults({
      lv,
      depot,
      years,
      birth_year: YOUNG_BIRTH_YEAR,
    });
    const withRelief = buildComparisonResults({
      lv,
      depot,
      years,
      birth_year: YOUNG_BIRTH_YEAR,
      depotTaxOptions: {
        teilfreistellung_percent: 30,
        sparerpauschbetrag_eur: 1000,
      },
    });
    expect(withRelief.depot_net).toBeGreaterThan(base.depot_net);
    expect(withRelief.depot_gross).toBe(base.depot_gross);
  });
});

describe("buildComparisonResults", () => {
  it("liefert den Verwaltungs-Bucket unter beiden historischen Namen", () => {
    const { lv, depot, years } = makePair(10);
    const r = buildComparisonResults({ lv, depot, years, birth_year: 1985 });
    expect(r.li_admin_costs).toBe(r.li_effective_costs);
    expect(r.li_total_costs).toBe(
      Math.round(lv.costs.acquisition + lv.costs.admin + lv.costs.fund)
    );
  });
});

describe("buildGuaranteedSeries", () => {
  it("interpoliert linear vom Startkapital zum garantierten Endkapital", () => {
    const s = buildGuaranteedSeries({
      initial_capital: 10000,
      monthly_contribution: 100,
      guaranteed_end_capital: 80000,
      months: 240,
    });
    expect(s).toHaveLength(240);
    expect(s[119].capital).toBeCloseTo(45000, 6); // Halbzeit
    expect(s[239].capital).toBeCloseTo(80000, 6);
    expect(s[239].contributions_cum).toBe(10000 + 240 * 100);
  });
});
