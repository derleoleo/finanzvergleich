import { describe, expect, it } from "vitest";
import {
  MAX_NEIGUNG_GRAD,
  istGleichauf,
  mehrProzent,
  relativerUnterschied,
  waageNeigung,
  waagenAussage,
} from "./waage";

describe("waageNeigung", () => {
  it("steht bei gleichen Werten waagerecht", () => {
    expect(waageNeigung(100_000, 100_000)).toBe(0);
  });

  it("bleibt unter 0,5 % Unterschied im Gleichgewicht", () => {
    expect(waageNeigung(100_000, 100_400)).toBe(0);
    expect(istGleichauf(100_000, 100_400)).toBe(true);
  });

  it("neigt sich zur schwereren Seite", () => {
    expect(waageNeigung(100_000, 110_000)).toBeGreaterThan(0);
    expect(waageNeigung(110_000, 100_000)).toBeLessThan(0);
  });

  it("ist symmetrisch", () => {
    expect(waageNeigung(80_000, 100_000)).toBeCloseTo(-waageNeigung(100_000, 80_000));
  });

  it("wächst linear bis zum Vollausschlag bei 20 %", () => {
    // 10 % bezogen auf die größere Seite → 0,5 × 12° = 6°
    expect(waageNeigung(90_000, 100_000)).toBeCloseTo(6);
    expect(waageNeigung(80_000, 100_000)).toBeCloseTo(MAX_NEIGUNG_GRAD);
  });

  it("begrenzt die Neigung", () => {
    expect(waageNeigung(10_000, 100_000)).toBe(MAX_NEIGUNG_GRAD);
    expect(waageNeigung(100_000, 0)).toBe(-MAX_NEIGUNG_GRAD);
  });

  it("verkraftet null und negative Werte", () => {
    expect(waageNeigung(0, 0)).toBe(0);
    expect(waageNeigung(-5_000, 10_000)).toBe(MAX_NEIGUNG_GRAD);
    expect(relativerUnterschied(Number.NaN, 1)).toBe(0);
  });
});

describe("mehrProzent", () => {
  it("bezieht sich auf die leichtere Seite", () => {
    expect(mehrProzent(100_000, 110_000)).toBeCloseTo(10);
    expect(mehrProzent(110_000, 100_000)).toBeCloseTo(10);
  });

  it("liefert null, wenn die leichtere Seite nicht positiv ist", () => {
    expect(mehrProzent(0, 10_000)).toBeNull();
    expect(mehrProzent(-1_000, 10_000)).toBeNull();
  });
});

describe("waagenAussage", () => {
  const lv = { name: "Lebensversicherung", imSatz: "der Lebensversicherung" };
  const depot = { name: "Depot", imSatz: "dem Depot" };

  it("nennt die schwerere Seite, Differenz und Prozent – ohne Wertung", () => {
    const satz = waagenAussage({ ...lv, wert: 100_000 }, { ...depot, wert: 110_000 });
    expect(satz).toMatch(/^Auf Basis der gemachten Angaben wird mit dem Depot ein um /);
    expect(satz).toContain("(+10,0 %)");
    expect(satz).toMatch(/als mit der Lebensversicherung\.$/);
    expect(satz).not.toMatch(/besser/i);
  });

  it("meldet Gleichstand bei minimalem Unterschied", () => {
    const satz = waagenAussage({ ...lv, wert: 100_000 }, { ...depot, wert: 100_100 });
    expect(satz).toContain("nahezu gleichauf");
  });
});
