import { describe, expect, it } from "vitest";
import { A4_BREITE_MM, A4_HOEHE_MM, FUSSZEILE_MM, berechneSeiten } from "./pdfSeiten";

describe("A4-Aufteilung des PDF (F22)", () => {
  it("füllt eine kurze Aufnahme auf einer Seite", () => {
    const seiten = berechneSeiten(1000, 500);
    expect(seiten).toHaveLength(1);
    expect(seiten[0].vonPx).toBe(0);
    expect(seiten[0].hoeheMm).toBeCloseTo((500 * A4_BREITE_MM) / 1000, 5);
  });

  it("teilt lange Aufnahmen auf mehrere Seiten", () => {
    const seiten = berechneSeiten(1000, 6000);
    expect(seiten.length).toBeGreaterThan(3);
    // Keine Seite ragt über A4 hinaus
    for (const s of seiten) {
      expect(s.hoeheMm).toBeLessThanOrEqual(A4_HOEHE_MM - FUSSZEILE_MM + 0.01);
    }
  });

  it("lässt keine Bildzeile aus und überlappt nicht", () => {
    const hoehe = 4321;
    const seiten = berechneSeiten(800, hoehe);
    expect(seiten[0].vonPx).toBe(0);
    for (let i = 1; i < seiten.length; i++) {
      expect(seiten[i].vonPx).toBe(seiten[i - 1].vonPx + seiten[i - 1].hoehePx);
    }
    const letzte = seiten[seiten.length - 1];
    expect(letzte.vonPx + letzte.hoehePx).toBe(hoehe);
  });

  it("verkraftet unsinnige Maße", () => {
    expect(berechneSeiten(0, 100)).toEqual([]);
    expect(berechneSeiten(100, 0)).toEqual([]);
  });
});
