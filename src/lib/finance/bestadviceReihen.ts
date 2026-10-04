// Jahresreihen des BestAdvice-Vergleichs.
//
// Ausgelagert, weil nicht nur die Detailseite sie braucht: Beim Speichern
// muss dieselbe Reihe in die Fassung geschrieben werden (Audit O08). Lagen
// die Reihen nur in der Seite, hielt eine Fassung lediglich Kennzahlen fest
// und die Fassungsansicht hatte nichts zu zeichnen.

import { BestAdviceModel } from "@/entities/BestAdviceCalculation";
import {
  lvTaxOptionsFromSettings,
  taxSettingsSnapshot,
} from "@/entities/UserDefaults";
import {
  calculateAgeAtPayout,
  calculateLifeInsuranceTax,
} from "@/components/shared/TaxCalculations";
import { simulateLv } from "@/lib/finance/simulation";
import { buildGuaranteedSeries } from "@/lib/finance/series";

export type BestAdviceModus = "gross" | "net";

export function baueBestAdviceReihen(calc: BestAdviceModel, mode: BestAdviceModus) {
  const years = Math.max(1, Math.round(calc.contract_duration_years || 1));
  const months = years * 12;
  const monthlyContrib = Number(calc.current_monthly_contribution || 0);
  const startCapital = Number(calc.current_capital || 0);
  // Gespeicherter Steuer-Snapshot; Alt-Datensätze: Fallback auf lokale Defaults
  const lvTaxOptions = lvTaxOptionsFromSettings(
    calc.results?.tax_settings ?? taxSettingsSnapshot()
  );

  // Fonds-LV über die gemeinsame Engine
  const lv = simulateLv({
    months,
    annual_return_percent: Number(calc.assumed_annual_return || 0),
    monthly_contribution: monthlyContrib,
    initial_capital: startCapital,
    funds: [
      {
        allocation_eur: monthlyContrib,
        ongoing_costs_percent: Number(calc.lv_fund_ongoing_costs_percent || 0),
      },
    ],
    cost:
      (calc.lv_cost_type ?? "eur") === "eur"
        ? {
            type: "eur",
            acquisition_costs_eur: Number(calc.life_insurance_acquisition_costs_eur || 0),
            admin_costs_monthly_eur: Number(calc.lv_admin_costs_monthly_eur || 0),
          }
        : {
            type: "percent",
            effective_costs_percent: Number(calc.lv_effective_costs_percent || 0),
          },
  });

  // Bestand: lineare Interpolation Kapital → garantiertes Endkapital
  const bestand = buildGuaranteedSeries({
    initial_capital: startCapital,
    monthly_contribution: monthlyContrib,
    guaranteed_end_capital: Number(calc.guaranteed_end_capital || 0),
    months,
  });

  const points: { year: number; age: number; fondsLV: number; bestand: number }[] = [];

  for (let m = 12; m <= months; m += 12) {
    const year = m / 12;
    const age = calculateAgeAtPayout(calc.birth_year, year);
    const lvPoint = lv.series[m - 1];
    const bestandPoint = bestand[m - 1];

    if (mode === "gross") {
      points.push({
        year,
        age,
        fondsLV: Math.round(lvPoint.capital),
        bestand: Math.round(bestandPoint.capital),
      });
    } else {
      const lvTax = calculateLifeInsuranceTax(
        lvPoint.capital - lvPoint.contributions_cum,
        year,
        age,
        lvTaxOptions
      );

      // Bestands-LV ist ebenfalls eine Versicherung → Halbeinkünfte-Regel.
      // Der Vertragsbeginn wird seit Audit F06 mitgespeichert; damit zählt die
      // Gesamtlaufzeit statt nur der Restlaufzeit (Alt-Datensätze: Rückfall).
      const vertragsbeginn = calc.results?.contract_start_years?.[0] ?? null;
      const bestandsJahre =
        vertragsbeginn && vertragsbeginn > 1900
          ? new Date().getFullYear() + year - vertragsbeginn
          : year;
      let bestandNet = bestandPoint.capital;
      if (!calc.current_product_tax_free) {
        const bestandTax = calculateLifeInsuranceTax(
          bestandPoint.capital - bestandPoint.contributions_cum,
          bestandsJahre,
          age,
          lvTaxOptions
        );
        bestandNet = bestandPoint.capital - bestandTax;
      }

      points.push({
        year,
        age,
        fondsLV: Math.round(lvPoint.capital - lvTax),
        bestand: Math.round(bestandNet),
      });
    }
  }

  return points;
}
