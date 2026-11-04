// src/lib/finance/produktseiten-zahlen.test.ts
// Jede Zahl auf den Produktseiten wird gegen die Engine nachgerechnet.
//
// Die Seiten unter `seiten/*.md` werben mit konkreten Beträgen. Eine
// Produktseite, die Zahlen nennt, die der eigene Rechner nicht liefert, wäre
// schlimmer als keine — sie ist genau die Behauptung, der ein Berater nicht
// nachgehen kann, bevor er sie weitergibt.
//
// Dieselbe Klammer liegt seit jeher um die Ratgeberbeiträge
// (`ratgeber-*-zahlen.test.ts` im Ordner `avd/`). Dieser Test zieht sie um
// die drei Produktseiten, und zwar so, dass er den Markdown-Text liest statt
// einer Kopie der Zahlen: Ändert jemand eine Zahl im Text, ohne dass die
// Engine sie hergibt, wird er rot.

import { describe, expect, it } from "vitest";
import FONDSPOLICE from "../../../seiten/fondspolice-oder-depot.md?raw";
import RENTENLUECKE from "../../../seiten/rentenluecke-berechnen.md?raw";
import ENTNAHME from "../../../seiten/entnahmeplan-rechner.md?raw";
import { simulateDepot, simulateLv } from "./simulation";
import { berechneRentenluecke } from "./rentenluecke";
import { baueEntnahmeplan } from "./entnahmeplan";
import {
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
} from "@/components/shared/TaxCalculations";

/** So, wie die Seiten die Beträge schreiben: 149.082 */
const eur = (n: number) => Math.round(n).toLocaleString("de-DE");

/** Steht der Betrag im Text? Die Fehlermeldung nennt ihn, nicht nur „false". */
function nennt(text: string, betrag: number, was: string) {
  expect(text.includes(eur(betrag)), `${was}: ${eur(betrag)} steht nicht im Text`).toBe(true);
}

describe("Fondspolice oder Depot", () => {
  // Derselbe Fall wie auf `/beispiel` – die Seite verweist darauf, also muss
  // er es auch wirklich sein.
  const months = 30 * 12;
  const lv = simulateLv({
    months,
    annual_return_percent: 6,
    monthly_contribution: 200,
    funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.3 }],
    cost: { type: "percent", effective_costs_percent: 1.2 },
  });
  const depot = simulateDepot({
    months,
    annual_return_percent: 6,
    monthly_contribution: 200,
    funds: [{ allocation_eur: 200, ongoing_costs_percent: 0.2, initial_charge_percent: 0 }],
    depot_costs_annual_percent: 0.25,
  });
  const lvSteuer = calculateLifeInsuranceTax(lv.gross_capital - lv.total_contributions, 30, 66, {
    personalIncomeTaxRate: 0.3,
    solidaritaetszuschlag: true,
    kirchensteuer_percent: 0,
  });
  const depotSteuer = calculateCapitalGainsTax(depot.gross_capital - depot.total_contributions, {
    teilfreistellung_percent: 30,
    solidaritaetszuschlag: true,
    kirchensteuer_percent: 0,
  });

  it("Einzahlungen und Kosten stimmen", () => {
    nennt(FONDSPOLICE, lv.total_contributions, "Eingezahlt");
    nennt(FONDSPOLICE, lv.costs.total, "Kosten Police");
    nennt(FONDSPOLICE, depot.costs.total, "Kosten Depot");
    nennt(FONDSPOLICE, lv.costs.contract, "Vertragskosten");
    nennt(FONDSPOLICE, lv.costs.fund, "Fondskosten Police");
    nennt(FONDSPOLICE, depot.costs.fund, "Fondskosten Depot");
    nennt(FONDSPOLICE, depot.costs.depot, "Depotgebuehr");
  });

  it("Kapital vor und nach Steuern stimmt", () => {
    nennt(FONDSPOLICE, lv.gross_capital, "Police brutto");
    nennt(FONDSPOLICE, depot.gross_capital, "Depot brutto");
    nennt(FONDSPOLICE, lvSteuer, "Steuer Police");
    nennt(FONDSPOLICE, depotSteuer, "Steuer Depot");
    nennt(FONDSPOLICE, lv.gross_capital - lvSteuer, "Police netto");
    nennt(FONDSPOLICE, depot.gross_capital - depotSteuer, "Depot netto");
  });

  it("die beiden Differenzen, auf denen die Aussage beruht", () => {
    // Der Kern des Beitrags: Der Steuervorteil deckt die Mehrkosten nur zur
    // Haelfte. Beide Zahlen stehen im Text und muessen stimmen.
    const steuervorteil = depotSteuer - lvSteuer;
    const mehrkosten = lv.costs.total - depot.costs.total;
    nennt(FONDSPOLICE, steuervorteil, "Steuervorteil");
    nennt(FONDSPOLICE, mehrkosten, "Mehrkosten");
    nennt(
      FONDSPOLICE,
      depot.gross_capital - depotSteuer - (lv.gross_capital - lvSteuer),
      "Differenz nach Steuern",
    );
    // Und die Aussage selbst: Der Vorteil deckt die Mehrkosten nicht.
    expect(steuervorteil).toBeLessThan(mehrkosten);
  });

  it("die Formulierung bleibt neutral", () => {
    // Keine Urteile wie „X ist besser" – die Hausregel fuer Ergebnisse.
    expect(FONDSPOLICE).not.toMatch(/ist besser|schlechter als|gewinnt/);
    expect(FONDSPOLICE).toContain("Auf Basis der gemachten Angaben");
  });
});

describe("Rentenlücke berechnen", () => {
  const r = berechneRentenluecke(
    {
      birth_year: 1975,
      retirement_age: 67,
      withdrawal_end_age: 90,
      desired_monthly_income: 2800,
      expected_statutory_pension: 1600,
      abzuege_gesetzliche_rente_percent: 11,
      occupational_pension_bav: 250,
      inflation_percent: 2,
      einnahmen_basis: "heute",
      assumed_annual_return: 5,
    } as Parameters<typeof berechneRentenluecke>[0],
    // Festes Datum: Sonst wandert das Alter mit dem Kalenderjahr, und der
    // Test wuerde im naechsten Januar ohne Zutun rot.
    new Date("2026-11-04"),
  );

  it("Einnahmen, Lücke und Kapitalbedarf stimmen", () => {
    nennt(RENTENLUECKE, r.einnahmen_monatlich, "Einnahmen");
    nennt(RENTENLUECKE, r.monthly_gap, "Luecke heute");
    nennt(RENTENLUECKE, r.monthly_gap_at_retirement, "Luecke zum Rentenbeginn");
    nennt(RENTENLUECKE, r.capital_needed_at_retirement, "Kapitalbedarf");
    nennt(RENTENLUECKE, r.monthly_savings_needed, "Sparrate");
    expect(RENTENLUECKE).toContain(`${r.entnahmemonate} Monate`);
  });

  it("der Abzug auf die gesetzliche Rente ist nachgerechnet", () => {
    // Der erste der beiden Fehler, um die es auf der Seite geht.
    const netto = 1600 * (1 - 11 / 100);
    nennt(RENTENLUECKE, netto, "gesetzliche Rente netto");
    nennt(RENTENLUECKE, 1600 - netto, "Abzug in Euro");
  });

  it("beide Kaufkraftbegriffe stehen nebeneinander", () => {
    // Der zweite Fehler: eine der beiden Zahlen allein ist irrefuehrend.
    expect(RENTENLUECKE).toContain("heutiger Kaufkraft");
    expect(RENTENLUECKE).toContain("zum Rentenbeginn");
    expect(r.monthly_gap_at_retirement).toBeGreaterThan(r.monthly_gap);
  });
});

describe("Entnahmeplan rechnen", () => {
  const plan = baueEntnahmeplan({
    startCapital: 400000,
    annualWithdrawal: 24000,
    annualReturnPercent: 4,
    startAge: 67,
    endAge: 90,
  });

  it("die gezeigten Jahreszeilen stimmen Zeile für Zeile", () => {
    for (const jahr of [0, 1, 10, 23]) {
      const z = plan[jahr];
      expect(z, `Zeile ${jahr} fehlt im Plan`).toBeDefined();
      nennt(ENTNAHME, z.startCapital, `Zeile ${jahr} Startkapital`);
      nennt(ENTNAHME, z.endCapital, `Zeile ${jahr} Restkapital`);
      nennt(ENTNAHME, z.growth, `Zeile ${jahr} Wachstum`);
    }
  });

  it("der Plan trägt bis zum Ende, wie die Seite sagt", () => {
    expect(plan.some((z) => z.endCapital === 0 && z.year > 0)).toBe(false);
    nennt(ENTNAHME, plan[plan.length - 1].endCapital, "Restkapital am Ende");
  });

  it("das End-Alter ist einschließlich – die Zeilenzahl belegt es", () => {
    // Die Aussage auf der Seite: 67 bis 90 sind 24 Zeilen, nicht 23.
    expect(plan).toHaveLength(24);
    expect(plan[plan.length - 1].age).toBe(90);
    expect(ENTNAHME).toContain("24 Zeilen");
  });

  it("das Wachstum nimmt über die Jahre ab", () => {
    // Die eigentliche Aussage der Seite - der Kapitalverzehr beschleunigt sich.
    expect(plan[0].growth).toBeGreaterThan(plan[10].growth);
    expect(plan[10].growth).toBeGreaterThan(plan[23].growth);
  });
});
