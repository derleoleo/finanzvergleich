import { describe, expect, it } from "vitest";
import { baueEntnahmeplan } from "./entnahmeplan";

const basis = {
  startCapital: 100_000,
  annualWithdrawal: 10_000,
  annualReturnPercent: 0,
  startAge: 65,
  endAge: 75,
};

describe("Entnahmeplan (F15)", () => {
  it("entnimmt ab dem ersten Jahr, ohne Freijahr", () => {
    const plan = baueEntnahmeplan(basis);
    expect(plan[0].age).toBe(65);
    expect(plan[0].withdrawal).toBe(10_000);
  });

  it("respektiert einen Aufschub", () => {
    const plan = baueEntnahmeplan({ ...basis, aufschubJahre: 2 });
    expect(plan[0].withdrawal).toBe(0);
    expect(plan[1].withdrawal).toBe(0);
    expect(plan[2].withdrawal).toBe(10_000);
  });

  it("erzwingt keine Komplettentnahme am Ende", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 70 });
    const letzte = plan[plan.length - 1];
    expect(letzte.withdrawal).toBe(10_000);
    expect(letzte.endCapital).toBeGreaterThan(0); // Restkapital bleibt stehen
  });

  it("entnimmt am Ende alles, wenn es gewünscht ist", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 70, komplettentnahmeAmEnde: true });
    const letzte = plan[plan.length - 1];
    expect(letzte.endCapital).toBe(0);
    expect(letzte.withdrawal).toBeGreaterThan(10_000);
  });

  it("weist Verluste als negatives Wachstum aus", () => {
    const plan = baueEntnahmeplan({ ...basis, annualReturnPercent: -10 });
    expect(plan[0].growth).toBeLessThan(0);
  });

  it("stoppt, wenn das Kapital aufgebraucht ist", () => {
    const plan = baueEntnahmeplan({ ...basis, annualWithdrawal: 30_000 });
    const letzte = plan[plan.length - 1];
    expect(letzte.endCapital).toBeLessThanOrEqual(0);
    expect(letzte.totalWithdrawn).toBeCloseTo(100_000, 0);
    expect(plan.length).toBeLessThan(11);
  });

  it("berücksichtigt Sonderentnahmen", () => {
    const plan = baueEntnahmeplan({ ...basis, specialWithdrawals: { 1: 25_000 } });
    expect(plan[1].withdrawal).toBe(25_000);
    expect(plan[2].withdrawal).toBe(10_000);
  });

  it("verkraftet Startalter gleich Endalter", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 65 });
    expect(plan).toHaveLength(1);
  });

  it("erzwingt auch bei einer einzigen Periode keine Komplettentnahme", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 65 });
    expect(plan[0].withdrawal).toBe(10_000);
    expect(plan[0].endCapital).toBe(90_000); // Restkapital bleibt stehen
  });

  it("entnimmt bei einer einzigen Periode alles, wenn es gewünscht ist", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 65, komplettentnahmeAmEnde: true });
    expect(plan[0].withdrawal).toBe(100_000);
    expect(plan[0].endCapital).toBe(0);
  });

  it("beachtet eine Sonderentnahme in der einzigen Periode", () => {
    const plan = baueEntnahmeplan({
      ...basis,
      endAge: 65,
      specialWithdrawals: { 0: 4_000 },
    });
    expect(plan[0].withdrawal).toBe(4_000);
  });

  it("beachtet einen Aufschub in der einzigen Periode", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 65, aufschubJahre: 1 });
    expect(plan[0].withdrawal).toBe(0);
  });
});
