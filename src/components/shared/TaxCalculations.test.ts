import { describe, expect, it } from "vitest";
import {
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  lvAltersgrenze,
  calculateMonthlyReturn,
  calculateZillmerMonths,
} from "./TaxCalculations";

describe("calculateCapitalGainsTax", () => {
  it("ohne Optionen: 25 % flat auf den Gewinn", () => {
    expect(calculateCapitalGainsTax(10000)).toBe(2500);
  });

  it("negative Gewinne → 0", () => {
    expect(calculateCapitalGainsTax(-5000)).toBe(0);
  });

  it("Teilfreistellung 30 %: 10.000 € Gewinn → 1.750 € Steuer", () => {
    // 10.000 × 70 % = 7.000 steuerpflichtig × 25 %
    expect(
      calculateCapitalGainsTax(10000, { teilfreistellung_percent: 30 })
    ).toBe(1750);
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
      solidaritaetszuschlag: true,
      kirchensteuer_percent: 8,
    });
    expect(tax).toBeCloseTo(20000 * 0.7 * 0.25 * (1 + 0.055 + 0.08), 8);
  });
});

describe("calculateLifeInsuranceTax – 12-Jahre/62-Grenze", () => {
  it("11 Jahre / Alter 62 → nicht qualifiziert: 25 % auf 85 % (Teilfreistellung)", () => {
    expect(calculateLifeInsuranceTax(10000, 11, 62)).toBeCloseTo(
      10000 * 0.85 * 0.25,
      10
    );
  });

  it("12 Jahre / Alter 61 → nicht qualifiziert: 25 % auf 85 % (Teilfreistellung)", () => {
    expect(calculateLifeInsuranceTax(10000, 12, 61)).toBeCloseTo(
      10000 * 0.85 * 0.25,
      10
    );
  });

  it("nicht qualifiziert + Soli: Steuer × 1,055", () => {
    expect(
      calculateLifeInsuranceTax(10000, 11, 62, { solidaritaetszuschlag: true })
    ).toBeCloseTo(10000 * 0.85 * 0.25 * 1.055, 10);
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

  it("Halbeinkünfte + Soli + Kirchensteuer 9 %: Steuer × (1 + 0,055 + 0,09)", () => {
    expect(
      calculateLifeInsuranceTax(10000, 20, 67, {
        personalIncomeTaxRate: 0.3,
        solidaritaetszuschlag: true,
        kirchensteuer_percent: 9,
      })
    ).toBeCloseTo(10000 * 0.425 * 0.3 * (1 + 0.055 + 0.09), 10);
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

describe("Vertragsart und Abschlussjahr (Audit C02)", () => {
  // Die zwei Proben aus dem Audit vom 12.10.2026, jeweils 20.000 EUR Gewinn,
  // persoenlicher Satz 20 %, ohne Soli und Kirchensteuer.
  it("klassische Police: halber Unterschiedsbetrag ohne Teilfreistellung", () => {
    // Vorher: 1.700 EUR, weil pauschal 15 % Teilfreistellung abgezogen wurden.
    const steuer = calculateLifeInsuranceTax(20000, 20, 67, {
      personalIncomeTaxRate: 0.2,
      fondsgebunden: false,
      vertragsBeginnJahr: 2013,
    });
    expect(steuer).toBeCloseTo(2000, 6);
    expect(steuer).toBeCloseTo(20000 * 0.5 * 0.2, 6);
  });

  it("Vertrag von 2008: beguenstigt schon ab Alter 60", () => {
    // Vorher: 4.250 EUR, weil die Altersgrenze fest bei 62 lag und der Fall
    // damit in die Abgeltungsteuer fiel (§ 52 Abs. 28 S. 7 EStG).
    const steuer = calculateLifeInsuranceTax(20000, 19, 60, {
      personalIncomeTaxRate: 0.2,
      fondsgebunden: false,
      vertragsBeginnJahr: 2008,
    });
    expect(steuer).toBeCloseTo(2000, 6);
  });

  it("derselbe Vertrag ab 2012 verlangt Alter 62", () => {
    const steuer = calculateLifeInsuranceTax(20000, 19, 60, {
      personalIncomeTaxRate: 0.2,
      fondsgebunden: false,
      vertragsBeginnJahr: 2012,
    });
    // Nicht beguenstigt: Abgeltungsteuer auf die ganzen Ertraege
    expect(steuer).toBeCloseTo(20000 * 0.25, 6);
  });

  it("fondsgebunden bleibt bei der Teilfreistellung", () => {
    // Gegenprobe: Die bisherigen Zahlen aendern sich nicht, solange der
    // Vertrag fondsgebunden und neu ist.
    expect(
      calculateLifeInsuranceTax(20000, 20, 67, {
        personalIncomeTaxRate: 0.2,
        fondsgebunden: true,
      })
    ).toBeCloseTo(20000 * 0.425 * 0.2, 6);
    expect(
      calculateLifeInsuranceTax(20000, 11, 67, { fondsgebunden: true })
    ).toBeCloseTo(20000 * 0.85 * 0.25, 6);
  });

  it("ohne Angabe gilt die Fondspolice mit Altersgrenze 62", () => {
    // Vorgabe fuer die uebrigen Rechner: Sie vergleichen neue Fondspolicen.
    expect(calculateLifeInsuranceTax(20000, 20, 67)).toBeCloseTo(
      20000 * 0.425 * 0.2,
      6
    );
    expect(calculateLifeInsuranceTax(20000, 20, 61)).toBeCloseTo(20000 * 0.85 * 0.25, 6);
  });

  it("nennt die Altersgrenze zum Abschlussjahr", () => {
    expect(lvAltersgrenze(2011)).toBe(60);
    expect(lvAltersgrenze(2012)).toBe(62);
    expect(lvAltersgrenze(2026)).toBe(62);
    // Keine oder unbrauchbare Angabe: der strengere Regelfall
    expect(lvAltersgrenze(null)).toBe(62);
    expect(lvAltersgrenze(undefined)).toBe(62);
    expect(lvAltersgrenze(0)).toBe(62);
  });
});
