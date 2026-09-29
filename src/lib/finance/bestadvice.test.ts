import { describe, expect, it } from "vitest";
import { beitragsbasis, breakEvenEinordnung, breakEvenRendite } from "./bestadvice";
import { simulateLv } from "./simulation";

const basis = {
  months: 240,
  monthly_contribution: 200,
  initial_capital: 30_000,
  funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.3 }],
  cost: { type: "percent" as const, effective_costs_percent: 1 },
};

describe("Beitragsbasis (F06)", () => {
  it("nutzt die tatsächlich eingezahlten Beiträge, wenn bekannt", () => {
    expect(
      beitragsbasis({ eingezahltBisher: 40_000, aktuellerWert: 30_000, monatsbeitrag: 100, monate: 120 })
    ).toBe(52_000);
  });

  it("fällt auf den heutigen Vertragswert zurück", () => {
    expect(
      beitragsbasis({ eingezahltBisher: null, aktuellerWert: 30_000, monatsbeitrag: 100, monate: 120 })
    ).toBe(42_000);
  });
});

describe("Break-even-Rendite (F06)", () => {
  it("findet die Rendite, die das Zielkapital genau erreicht", () => {
    const ziel = simulateLv({ ...basis, annual_return_percent: 4 }).gross_capital;
    const rendite = breakEvenRendite(basis, ziel);
    expect(rendite).not.toBeNull();
    expect(rendite!).toBeCloseTo(4, 1);
  });

  it("meldet unerreichbare Ziele", () => {
    expect(breakEvenRendite(basis, 50_000_000)).toBeNull();
  });

  it("erkennt Ziele, die ohne Wertzuwachs erreicht werden", () => {
    const ziel = simulateLv({ ...basis, annual_return_percent: -5 }).gross_capital;
    const rendite = breakEvenRendite(basis, ziel);
    expect(rendite!).toBeLessThan(0);
  });

  it("formuliert die Einordnung ohne Empfehlung", () => {
    const satz = breakEvenEinordnung(4.25);
    expect(satz).toContain("4,25 % p.a.");
    expect(satz).not.toMatch(/empfehl|besser|lohnt/i);
    expect(breakEvenEinordnung(null)).toMatch(/nicht erreichbar/);
  });
});
