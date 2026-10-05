import { describe, expect, it } from 'vitest';
import { baueBestAdviceReihen } from './bestadviceReihen';
import { beitragsbasis } from './bestadvice';
import { calculateLifeInsuranceTax } from '@/components/shared/TaxCalculations';
import { lvTaxOptionsFromSettings } from '@/entities/UserDefaults';
import type { BestAdviceModel } from '@/entities/BestAdviceCalculation';

/**
 * Der Bestandsvertrag ist heute weniger wert, als eingezahlt wurde – der
 * Fall, in dem sich Kurve und Kennzahl trennten (Audit B03).
 */
function fall(over: Partial<BestAdviceModel> = {}): BestAdviceModel {
  return {
    id: 'x',
    created_date: '2026-10-05',
    name: 'Test',
    contract_duration_years: 20,
    birth_year: 1980,
    current_monthly_contribution: 100,
    current_capital: 30_000,
    guaranteed_end_capital: 100_000,
    current_product_tax_free: false,
    assumed_annual_return: 5,
    lv_cost_type: 'percent',
    life_insurance_acquisition_costs_eur: 0,
    lv_admin_costs_monthly_eur: 0,
    lv_effective_costs_percent: 1,
    lv_fund_ongoing_costs_percent: 0,
    results: {
      total_contributions: 0,
      life_insurance_gross: 0,
      life_insurance_net: 0,
      li_total_costs: 0,
      li_acquisition_costs: 0,
      li_fund_costs: 0,
      li_admin_costs: 0,
      li_tax: 0,
      depot_gross: 0,
      depot_net: 0,
      depot_tax: 0,
      contract_start_years: [2010],
      eingezahlt_bisher_gesamt: 40_000,
      tax_settings: {
        lv_personal_income_tax_rate: 25,
        apply_solidaritaetszuschlag: false,
        kirchensteuer_percent: 0,
        depot_teilfreistellung_percent: 30,
        inflation_percent: 2,
      },
    },
    ...over,
  } as BestAdviceModel;
}

/** Dieselbe Rechnung, die der Rechner für die Kennzahl macht. */
function kennzahlBestandNetto(calc: BestAdviceModel): number {
  const jahre = calc.contract_duration_years;
  const basis = beitragsbasis({
    eingezahltBisher: calc.results?.eingezahlt_bisher_gesamt ?? null,
    aktuellerWert: calc.current_capital,
    monatsbeitrag: calc.current_monthly_contribution,
    monate: jahre * 12,
  });
  const brutto = calc.guaranteed_end_capital;
  const beginn = calc.results?.contract_start_years?.[0] ?? null;
  const laufzeit =
    beginn && beginn > 1900 ? new Date().getFullYear() + jahre - beginn : jahre;
  const alter = calc.birth_year > 0 ? new Date().getFullYear() + jahre - calc.birth_year : 0;
  const steuer = calculateLifeInsuranceTax(
    brutto - basis,
    laufzeit,
    alter,
    lvTaxOptionsFromSettings(calc.results!.tax_settings!)
  );
  return brutto - steuer;
}

describe('BestAdvice-Reihen (B03)', () => {
  it('endet dort, wo die Kennzahl steht', () => {
    // Vorher lag der Kurvenendpunkt rund 1.062 € darunter: Die Reihe begann
    // ihre Beitragssumme beim heutigen Rückkaufswert statt bei den
    // tatsächlich eingezahlten Beiträgen.
    const calc = fall();
    const reihe = baueBestAdviceReihen(calc, 'net');
    const letzte = reihe[reihe.length - 1];
    expect(letzte.bestand).toBe(Math.round(kennzahlBestandNetto(calc)));
  });

  it('bleibt bei steuerfreiem Bestandsvertrag beim Bruttowert', () => {
    const calc = fall({ current_product_tax_free: true });
    const reihe = baueBestAdviceReihen(calc, 'net');
    expect(reihe[reihe.length - 1].bestand).toBe(calc.guaranteed_end_capital);
  });

  it('nimmt ohne Angabe den Rückkaufswert als Ersatzgröße', () => {
    // Ohne `eingezahlt_bisher_gesamt` bleibt es bei der alten, konservativen
    // Annahme – dann darf sich nichts ändern.
    const calc = fall();
    calc.results!.eingezahlt_bisher_gesamt = undefined;
    const reihe = baueBestAdviceReihen(calc, 'net');
    expect(reihe[reihe.length - 1].bestand).toBe(Math.round(kennzahlBestandNetto(calc)));
  });

  it('zeigt im Bruttomodus den unversteuerten Verlauf', () => {
    const reihe = baueBestAdviceReihen(fall(), 'gross');
    expect(reihe[reihe.length - 1].bestand).toBe(100_000);
  });

  it('liefert eine Zeile je Laufzeitjahr', () => {
    expect(baueBestAdviceReihen(fall(), 'net')).toHaveLength(20);
  });
});
