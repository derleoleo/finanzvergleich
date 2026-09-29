import { describe, expect, it } from "vitest";
import { berechneRentenluecke, type RentenlueckeEingabe } from "./rentenluecke";

const heute = new Date(2026, 5, 15);

const basis = (over: Partial<RentenlueckeEingabe> = {}): RentenlueckeEingabe => ({
  birth_year: 1986,          // 40 Jahre in 2026
  retirement_age: 67,
  withdrawal_end_age: 90,
  desired_monthly_income: 3000,
  expected_statutory_pension: 1500,
  occupational_pension_bav: 0,
  basis_rente: 0,
  rental_income: 0,
  existing_capital: 0,
  assumed_annual_return: 5,
  inflation_percent: 2,
  ...over,
});

describe("Rentenlücke (F15)", () => {
  it("meldet keine Lücke, wenn die Einkünfte reichen", () => {
    const r = berechneRentenluecke(basis({ expected_statutory_pension: 3200 }), heute);
    expect(r.gap_already_covered).toBe(true);
    expect(r.monthly_savings_needed).toBe(0);
  });

  it("rechnet die Lücke mit Inflation auf den Rentenbeginn hoch", () => {
    const r = berechneRentenluecke(basis(), heute);
    expect(r.monthly_gap).toBe(1500);
    // 1500 € × 1,02^27 ≈ 2560 €
    expect(r.monthly_gap_at_retirement).toBeGreaterThan(2500);
    expect(r.monthly_gap_at_retirement).toBeLessThan(2620);
  });

  it("berücksichtigt den eingestellten Planungshorizont", () => {
    const bis90 = berechneRentenluecke(basis(), heute);
    const bis100 = berechneRentenluecke(basis({ withdrawal_end_age: 100 }), heute);
    expect(bis100.capital_needed_at_retirement).toBeGreaterThan(bis90.capital_needed_at_retirement);
    expect(bis100.monthly_savings_needed).toBeGreaterThan(bis90.monthly_savings_needed);
  });

  it("kennzeichnet einen bereits erreichten Rentenbeginn statt 0 € Sparrate zu behaupten", () => {
    const r = berechneRentenluecke(basis({ birth_year: 1955 }), heute); // 71 Jahre
    expect(r.retirement_reached).toBe(true);
    expect(r.additional_capital_needed).toBeGreaterThan(0);
    expect(r.monthly_savings_needed).toBe(0);
  });

  it("rechnet nach Rentenbeginn nur noch die verbleibenden Jahre (N05)", () => {
    // 75 Jahre alt, Rentenbeginn 67, Planende 90, 1.000 € Lücke, ohne Zins
    const r = berechneRentenluecke(
      basis({
        birth_year: 1951,
        desired_monthly_income: 1000,
        expected_statutory_pension: 0,
        assumed_annual_return: 0,
        inflation_percent: 0,
      }),
      heute
    );
    expect(r.current_age).toBe(75);
    expect(r.entnahmemonate).toBe(180); // 15 Jahre, nicht 23
    expect(r.capital_needed_at_retirement).toBe(180_000);
  });

  it("zieht vorhandenes Kapital ab", () => {
    const ohne = berechneRentenluecke(basis(), heute);
    const mit = berechneRentenluecke(basis({ existing_capital: 100_000 }), heute);
    expect(mit.future_value_of_existing).toBeGreaterThan(100_000);
    expect(mit.additional_capital_needed).toBeLessThan(ohne.additional_capital_needed);
  });

  it("verkraftet Rendite gleich Inflation", () => {
    const r = berechneRentenluecke(basis({ assumed_annual_return: 2, inflation_percent: 2 }), heute);
    expect(Number.isFinite(r.capital_needed_at_retirement)).toBe(true);
    // Ohne Realzins entspricht der Bedarf der Summe der Entnahmen
    expect(r.capital_needed_at_retirement).toBeCloseTo(r.monthly_gap_at_retirement * 276, -3);
  });
});
