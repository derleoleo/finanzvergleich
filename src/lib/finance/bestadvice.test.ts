import { describe, expect, it } from "vitest";
import {
  beitragsbasis,
  breakEvenDetail,
  breakEvenEinordnung,
  breakEvenRendite,
  uebertragBeiKuendigung,
} from "./bestadvice";
import { calculateLifeInsuranceTax } from "@/components/shared/TaxCalculations";
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

  it("formuliert die Einordnung ohne Empfehlung und ohne falsches „nach Kosten“ (N04)", () => {
    const satz = breakEvenEinordnung(4.25);
    expect(satz).toContain("4,25 % p.a.");
    expect(satz).toContain("vor Vertragskosten");
    expect(satz).not.toMatch(/nach Kosten/);
    expect(satz).not.toMatch(/empfehl|besser|lohnt/i);
  });

  it("unterscheidet unerreichbare von bereits übertroffenen Zielen (N04)", () => {
    const zuHoch = breakEvenDetail(basis, 50_000_000);
    expect(zuHoch).toEqual({ art: "unmoeglich", grund: "zu_hoch" });
    expect(breakEvenEinordnung(zuHoch)).toMatch(/nicht erreichbar/);

    const schonErreicht = breakEvenDetail(basis, 1_000);
    expect(schonErreicht).toEqual({ art: "unmoeglich", grund: "schon_erreicht" });
    expect(breakEvenEinordnung(schonErreicht)).toMatch(/ohne Wertzuwachs/);
  });
});

describe('Randfaelle erreichen die Anzeige (Audit O07)', () => {
  const basis = {
    months: 240,
    monthly_contribution: 200,
    funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.3 }],
    cost: { type: 'percent' as const, effective_costs_percent: 1 },
  };

  it('unterscheidet "zu hoch" von "schon erreicht"', () => {
    const zuHoch = breakEvenDetail(basis, 10_000_000);
    const schonErreicht = breakEvenDetail(basis, 1);
    expect(zuHoch).toEqual({ art: 'unmoeglich', grund: 'zu_hoch' });
    expect(schonErreicht).toEqual({ art: 'unmoeglich', grund: 'schon_erreicht' });
    // Beide Faelle muessen unterschiedliche Saetze ergeben – vorher wurden sie
    // zu null zusammengefasst und beide als "nicht erreichbar" angezeigt.
    expect(breakEvenEinordnung(zuHoch)).not.toBe(breakEvenEinordnung(schonErreicht));
    expect(breakEvenEinordnung(schonErreicht)).toContain('ohne Wertzuwachs');
  });
});

describe("Übertrag bei Kündigung (Audit C03)", () => {
  /** Die Steuerfunktion des Produkts, mit den Merkmalen des Altvertrags. */
  const steuerFuer = (
    fondsgebunden: boolean,
    vertragsBeginnJahr: number | null,
    personalIncomeTaxRate = 0.2
  ) =>
    (ertrag: number, laufzeit: number, alter: number) =>
      calculateLifeInsuranceTax(ertrag, laufzeit, alter, {
        fondsgebunden,
        vertragsBeginnJahr,
        personalIncomeTaxRate,
      });

  it("zieht die Steuer des Rückkaufs ab – die Probe aus dem Audit", () => {
    // Klassischer Vertrag, Rückkaufswert 50.000 EUR, eingezahlt 30.000 EUR,
    // Kündigung vor der beguenstigten Altersgrenze: 25 % auf 20.000 EUR
    // Ertrag. Vorher starteten die 50.000 EUR ungeschmaelert im neuen Vertrag.
    const u = uebertragBeiKuendigung({
      rueckkaufswert: 50_000,
      eingezahltBisher: 30_000,
      laufzeitBisHeute: 15,
      alterHeute: 50,
      steuer: steuerFuer(false, 2010),
    });
    expect(u.ertrag).toBe(20_000);
    expect(u.kuendigungssteuer).toBeCloseTo(5_000, 6);
    expect(u.uebertrag).toBeCloseTo(45_000, 6);
  });

  it("rechnet mit dem heutigen Alter, nicht mit dem bei Auszahlung", () => {
    // Derselbe Vertrag: Mit 50 greift die Beguenstigung nicht, mit 62 schon.
    const jung = uebertragBeiKuendigung({
      rueckkaufswert: 50_000,
      eingezahltBisher: 30_000,
      laufzeitBisHeute: 15,
      alterHeute: 50,
      steuer: steuerFuer(false, 2013),
    });
    const alt = uebertragBeiKuendigung({
      rueckkaufswert: 50_000,
      eingezahltBisher: 30_000,
      laufzeitBisHeute: 15,
      alterHeute: 62,
      steuer: steuerFuer(false, 2013),
    });
    expect(jung.kuendigungssteuer).toBeCloseTo(20_000 * 0.25, 6);
    expect(alt.kuendigungssteuer).toBeCloseTo(20_000 * 0.5 * 0.2, 6);
    expect(alt.uebertrag).toBeGreaterThan(jung.uebertrag);
  });

  it("lässt einen steuerfreien Altvertrag unangetastet", () => {
    const u = uebertragBeiKuendigung({
      rueckkaufswert: 50_000,
      eingezahltBisher: 30_000,
      steuerfrei: true,
      laufzeitBisHeute: 25,
      alterHeute: 55,
      steuer: steuerFuer(false, 2000),
    });
    expect(u.kuendigungssteuer).toBe(0);
    expect(u.uebertrag).toBe(50_000);
  });

  it("besteuert einen bereits netto eingetragenen Betrag nicht zweimal", () => {
    const u = uebertragBeiKuendigung({
      rueckkaufswert: 45_000,
      eingezahltBisher: 30_000,
      schonNetto: true,
      laufzeitBisHeute: 15,
      alterHeute: 50,
      steuer: steuerFuer(false, 2010),
    });
    expect(u.kuendigungssteuer).toBe(0);
    expect(u.uebertrag).toBe(45_000);
  });

  it("zieht Steuer und Kosten nebeneinander ab", () => {
    const u = uebertragBeiKuendigung({
      rueckkaufswert: 50_000,
      eingezahltBisher: 30_000,
      wechselkosten: 1_500,
      laufzeitBisHeute: 15,
      alterHeute: 50,
      steuer: steuerFuer(false, 2010),
    });
    expect(u.uebertrag).toBeCloseTo(50_000 - 5_000 - 1_500, 6);
  });

  it("hält den Übertrag bei null, statt negativ zu werden", () => {
    const u = uebertragBeiKuendigung({
      rueckkaufswert: 10_000,
      eingezahltBisher: 0,
      wechselkosten: 20_000,
      laufzeitBisHeute: 5,
      alterHeute: 40,
      steuer: steuerFuer(true, 2015),
    });
    expect(u.uebertrag).toBe(0);
  });

  it("ohne Angabe der Beiträge bleibt der Rückkaufswert die Basis", () => {
    // Dann ist der Ertrag null - dieselbe Ersatzgroesse wie in `beitragsbasis`,
    // und der Rechner weist an anderer Stelle darauf hin.
    const u = uebertragBeiKuendigung({
      rueckkaufswert: 50_000,
      laufzeitBisHeute: 15,
      alterHeute: 50,
      steuer: steuerFuer(false, 2010),
    });
    expect(u.ertrag).toBe(0);
    expect(u.kuendigungssteuer).toBe(0);
    expect(u.uebertrag).toBe(50_000);
  });

  it("macht die Teilfreistellung der Fondspolice sichtbar", () => {
    const gemeinsam = {
      rueckkaufswert: 50_000,
      eingezahltBisher: 30_000,
      laufzeitBisHeute: 15,
      alterHeute: 50,
    };
    const klassisch = uebertragBeiKuendigung({
      ...gemeinsam,
      steuer: steuerFuer(false, 2010),
    });
    const fonds = uebertragBeiKuendigung({
      ...gemeinsam,
      steuer: steuerFuer(true, 2010),
    });
    expect(fonds.kuendigungssteuer).toBeLessThan(klassisch.kuendigungssteuer);
    expect(fonds.kuendigungssteuer).toBeCloseTo(20_000 * 0.85 * 0.25, 6);
  });
});
