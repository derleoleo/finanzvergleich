const STORAGE_KEY = "fv_user_defaults_v1";

export type UserDefaultsData = {
  // Allgemein
  birth_year: number;
  assumed_annual_return: number;
  contract_duration_years: number;

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

  // Rentenlücke
  retirement_age: number;
  desired_monthly_income: number;
  expected_statutory_pension: number;

  // Entnahmeplan
  withdrawal_amount: number;
  withdrawal_start_age: number;
  withdrawal_end_age: number;
};

export const SYSTEM_DEFAULTS: UserDefaultsData = {
  birth_year: 1985,
  assumed_annual_return: 5.0,
  contract_duration_years: 25,

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

  retirement_age: 67,
  desired_monthly_income: 3000,
  expected_statutory_pension: 1500,

  withdrawal_amount: 12000,
  withdrawal_start_age: 65,
  withdrawal_end_age: 85,
};

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
