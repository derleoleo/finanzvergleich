import { describe, expect, it } from "vitest";
import {
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  calculateMonthlyReturn,
  calculateZillmerMonths,
} from "./TaxCalculations";

describe("calculateCapitalGainsTax", () => {
  it("ohne Optionen: 25 % flat auf den Gewinn (Altverhalten)", () => {
    expect(calculateCapitalGainsTax(10000)).toBe(2500);
  });

  it("negative Gewinne → 0", () => {
    expect(calculateCapitalGainsTax(-5000)).toBe(0);
  });

  it("Teilfreistellung 30 % + Sparerpauschbetrag 1.000 €: 10.000 € Gewinn → 1.500 € Steuer", () => {
    // 10.000 × 70 % = 7.000 steuerpflichtig, − 1.000 Pauschbetrag = 6.000 × 25 %
    expect(
      calculateCapitalGainsTax(10000, {
        teilfreistellung_percent: 30,
        sparerpauschbetrag_eur: 1000,
      })
    ).toBe(1500);
  });

  it("kleiner Gewinn unter dem Pauschbetrag → 0", () => {
    expect(
      calculateCapitalGainsTax(1200, {
        teilfreistellung_percent: 30,
        sparerpauschbetrag_eur: 1000,
      })
    ).toBe(0); // 1200*0.7 = 840 < 1000
  });

  it("Solidaritätszuschlag: Steuer × 1,055", () => {
    expect(
      calculateCapitalGainsTax(10000, { solidaritaetszuschlag: true })
    ).toBeCloseTo(2500 * 1.055, 10);
  });

  it("Kirchensteuer 9 %: Steuer × 1,09", () => {
    expect(
      calculateCapitalGainsTax(10000, { kirchensteuer_percent: 9 })
    ).toBeCloseTo(2500 * 1.09, 10);
  });

  it("alle Optionen kombiniert", () => {
    const tax = calculateCapitalGainsTax(20000, {
      teilfreistellung_percent: 30,
      sparerpauschbetrag_eur: 1000,
      solidaritaetszuschlag: true,
      kirchensteuer_percent: 8,
    });
    expect(tax).toBeCloseTo((20000 * 0.7 - 1000) * 0.25 * (1 + 0.055 + 0.08), 8);
  });
});

describe("calculateLifeInsuranceTax – 12-Jahre/62-Grenze", () => {
  it("11 Jahre / Alter 62 → nicht qualifiziert, 25 % flat", () => {
    expect(calculateLifeInsuranceTax(10000, 11, 62)).toBe(2500);
  });

  it("12 Jahre / Alter 61 → nicht qualifiziert, 25 % flat", () => {
    expect(calculateLifeInsuranceTax(10000, 12, 61)).toBe(2500);
  });

  it("12 Jahre / Alter 62 → Halbeinkünfte: 42,5 % × 20 % Default-Satz", () => {
    expect(calculateLifeInsuranceTax(10000, 12, 62)).toBeCloseTo(
      10000 * 0.425 * 0.2,
      10
    );
  });

  it("individueller Steuersatz wird berücksichtigt", () => {
    expect(
      calculateLifeInsuranceTax(10000, 20, 67, { personalIncomeTaxRate: 0.35 })
    ).toBeCloseTo(10000 * 0.425 * 0.35, 10);
  });

  it("negative Gewinne → 0", () => {
    expect(calculateLifeInsuranceTax(-100, 20, 67)).toBe(0);
  });
});

describe("Hilfsfunktionen", () => {
  it("calculateMonthlyReturn: (1+r)^(1/12)-1", () => {
    expect(calculateMonthlyReturn(5)).toBeCloseTo(Math.pow(1.05, 1 / 12) - 1, 12);
    expect(calculateMonthlyReturn(0)).toBe(0);
  });

  it("calculateZillmerMonths: min(60, Laufzeit), mindestens 1", () => {
    expect(calculateZillmerMonths(36)).toBe(36);
    expect(calculateZillmerMonths(60)).toBe(60);
    expect(calculateZillmerMonths(300)).toBe(60);
    expect(calculateZillmerMonths(0)).toBe(1);
  });
});
