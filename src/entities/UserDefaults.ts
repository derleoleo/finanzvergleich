const STORAGE_KEY = "fv_user_defaults_v1";

export type UserDefaultsData = {
  // Allgemein
  birth_year: number;
  assumed_annual_return: number;
  contract_duration_years: number;
  inflation_percent: number; // für die Kaufkraft-Anzeige (real statt nominal)

  // LV-Fonds & Kosten
  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur: number;
  lv_effective_costs_percent: number;
  lv_fund_ongoing_costs_percent: number;
  lv_fund_identifier: string;

  // Depot
  depot_provider: string;
  depot_fund_identifier: string;
  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;
  depot_costs_annual: number;

  // Sparvertrag & Einmalanlage
  monthly_contribution: number;
  lump_sum: number;
  dynamik_percent: number; // jährliche Beitragssteigerung (%), 0 = konstant

  // Rentenlücke
  retirement_age: number;
  desired_monthly_income: number;
  expected_statutory_pension: number;

  // Entnahmeplan
  withdrawal_amount: number;
  withdrawal_start_age: number;
  withdrawal_end_age: number;

  // Honorarberatung (schaltet den Netto- vs. Bruttopolice-Rechner frei)
  honorarberatung_enabled: boolean;

  // Steuern
  lv_personal_income_tax_rate: number; // persönlicher Steuersatz bei Halbeinkünfteverfahren (%), z.B. 20
  depot_teilfreistellung_percent: number; // Teilfreistellung Depot-Fonds (0/15/30 %)
  apply_solidaritaetszuschlag: boolean; // +5,5 % auf die Steuer (Depot und LV)
  kirchensteuer_percent: number; // 0/8/9 % als Zuschlag auf die Steuer (Depot und LV)
};

export const SYSTEM_DEFAULTS: UserDefaultsData = {
  birth_year: 1985,
  assumed_annual_return: 5.0,
  contract_duration_years: 25,
  inflation_percent: 2.0,

  lv_cost_type: "eur",
  life_insurance_acquisition_costs_eur: 2000,
  lv_admin_costs_monthly_eur: 6,
  lv_effective_costs_percent: 0.7,
  lv_fund_ongoing_costs_percent: 0.3,
  lv_fund_identifier: "Debeka Global Shares",

  depot_provider: "Musterdepot",
  depot_fund_identifier: "Musterfonds",
  depot_fund_initial_charge_percent: 0,
  depot_fund_ongoing_costs_percent: 0.5,
  depot_costs_annual: 0.25,

  monthly_contribution: 200,
  lump_sum: 50000,
  dynamik_percent: 0,

  retirement_age: 67,
  desired_monthly_income: 3000,
  expected_statutory_pension: 1500,

  withdrawal_amount: 12000,
  withdrawal_start_age: 65,
  withdrawal_end_age: 85,

  honorarberatung_enabled: false,

  lv_personal_income_tax_rate: 20,
  depot_teilfreistellung_percent: 30,
  // Soli fällt auf Kapitalerträge immer an (keine Freigrenze) → Default an
  apply_solidaritaetszuschlag: true,
  kirchensteuer_percent: 0,
};

/** Depot-Steueroptionen aus den UserDefaults (für calculateCapitalGainsTax). */
export function depotTaxOptionsFromDefaults(d: UserDefaultsData = UserDefaults.load()) {
  return {
    teilfreistellung_percent: d.depot_teilfreistellung_percent,
    solidaritaetszuschlag: d.apply_solidaritaetszuschlag,
    kirchensteuer_percent: d.kirchensteuer_percent,
  };
}

/** LV-Steueroptionen aus den UserDefaults (für calculateLifeInsuranceTax). */
export function lvTaxOptionsFromDefaults(d: UserDefaultsData = UserDefaults.load()) {
  return {
    personalIncomeTaxRate: d.lv_personal_income_tax_rate / 100,
    solidaritaetszuschlag: d.apply_solidaritaetszuschlag,
    kirchensteuer_percent: d.kirchensteuer_percent,
  };
}

export class UserDefaults {
  static load(): UserDefaultsData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...SYSTEM_DEFAULTS };
      return { ...SYSTEM_DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...SYSTEM_DEFAULTS };
    }
  }

  static save(data: UserDefaultsData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }
}
