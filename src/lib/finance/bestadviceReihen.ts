// Jahresreihen des BestAdvice-Vergleichs.
//
// Ausgelagert, weil nicht nur die Detailseite sie braucht: Beim Speichern
// muss dieselbe Reihe in die Fassung geschrieben werden (Audit O08). Lagen
// die Reihen nur in der Seite, hielt eine Fassung lediglich Kennzahlen fest
// und die Fassungsansicht hatte nichts zu zeichnen.

import type { BestAdviceModel, LVEingabe } from "@/entities/BestAdviceCalculation";
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
import { beitragsbasis } from "@/lib/finance/bestadvice";

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

  /**
   * Die Bestandsseite je Vertrag (Audit B03).
   *
   * Aggregiert gerechnet wird die Kurve falsch, sobald die Vertraege sich
   * unterscheiden: Steuerfreiheit gilt dann fuer alle oder keinen, und der
   * Vertragsbeginn des ersten Vertrags bestimmt die Zwoelfjahresfrist aller.
   * Die Kennzahlen rechnen jeden Vertrag einzeln - die Kurve muss das auch,
   * sonst widerspricht ihr Endwert den Kacheln darueber.
   *
   * Aeltere Datensaetze tragen die Einzelvertraege nicht; dort bleibt es bei
   * der einen aggregierten Reihe.
   */
  const vertraege: LVEingabe[] = calc.results?.lvs_inputs?.length
    ? calc.results.lvs_inputs
    : [
        {
          label: "LV 1",
          monthly_contribution: monthlyContrib,
          current_capital: startCapital,
          guaranteed_end_capital: Number(calc.guaranteed_end_capital || 0),
          current_product_tax_free: !!calc.current_product_tax_free,
          contract_start_year: calc.results?.contract_start_years?.[0] ?? null,
          eingezahlt_bisher: calc.results?.eingezahlt_bisher_gesamt ?? null,
        },
      ];

  const bestandsreihen = vertraege.map((v) => ({
    vertrag: v,
    reihe: buildGuaranteedSeries({
      initial_capital: v.current_capital,
      monthly_contribution: v.monthly_contribution,
      guaranteed_end_capital: v.guaranteed_end_capital,
      months,
    }),
  }));

  const points: { year: number; age: number; fondsLV: number; bestand: number }[] = [];

  for (let m = 12; m <= months; m += 12) {
    const year = m / 12;
    const age = calculateAgeAtPayout(calc.birth_year, year);
    const lvPoint = lv.series[m - 1];

    if (mode === "gross") {
      points.push({
        year,
        age,
        fondsLV: Math.round(lvPoint.capital),
        bestand: Math.round(
          bestandsreihen.reduce((summe, b) => summe + b.reihe[m - 1].capital, 0)
        ),
      });
      continue;
    }

    const lvTax = calculateLifeInsuranceTax(
      lvPoint.capital - lvPoint.contributions_cum,
      year,
      age,
      lvTaxOptions
    );

    const bestandNet = bestandsreihen.reduce((summe, { vertrag, reihe }) => {
      const punkt = reihe[m - 1];
      if (vertrag.current_product_tax_free) return summe + punkt.capital;

      // Bestands-LV ist ebenfalls eine Versicherung → Halbeinkünfte-Regel.
      // Der Vertragsbeginn zaehlt je Vertrag; ohne Angabe die Restlaufzeit.
      const beginn = vertrag.contract_start_year ?? null;
      const bestandsJahre =
        beginn && beginn > 1900 ? new Date().getFullYear() + year - beginn : year;

      // Steuerlich zaehlen die eingezahlten Beitraege, nicht der heutige
      // Rueckkaufswert. `buildGuaranteedSeries` beginnt seine Beitragssumme
      // beim heutigen Kapital - wer frueher mehr eingezahlt hat, als der
      // Vertrag heute wert ist, bekaeme sonst zu hohe Gewinne und damit zu
      // viel Steuer.
      const basisHeute = beitragsbasis({
        eingezahltBisher: vertrag.eingezahlt_bisher,
        aktuellerWert: vertrag.current_capital,
        monatsbeitrag: 0,
        monate: 0,
      });
      const beitraegeBisJetzt =
        basisHeute + (punkt.contributions_cum - vertrag.current_capital);
      const steuer = calculateLifeInsuranceTax(
        punkt.capital - beitraegeBisJetzt,
        bestandsJahre,
        age,
        lvTaxOptions
      );
      return summe + punkt.capital - steuer;
    }, 0);

    points.push({
      year,
      age,
      fondsLV: Math.round(lvPoint.capital - lvTax),
      bestand: Math.round(bestandNet),
    });
  }

  return points;
}
