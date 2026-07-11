import { supabase } from '@/lib/supabase'
import type { FundEntry } from '@/components/calculator/MultiFundEditor'

export type CalculationResults = {
  life_insurance_gross: number;
  life_insurance_net: number;
  depot_gross: number;
  depot_net: number;

  total_contributions: number;

  li_total_costs: number;
  depot_total_costs: number;

  // LV Breakdown
  li_acquisition_costs: number; // Abschlusskosten (nur wenn lv_cost_type === "eur")
  li_fund_costs: number; // TER innerhalb LV
  li_effective_costs: number; // Effektivkosten-Abzug (nur wenn lv_cost_type === "percent")

  // Depot Breakdown
  depot_initial_charges: number; // Ausgabeaufschläge (Summe)
  depot_fund_costs: number; // TER im Depot
  depot_depot_costs: number; // Depotgebühren

  li_tax?: number;
  depot_tax?: number;

  // Effektivkosten (Reduction in Yield) in %-Punkten p.a.; ältere Datensätze: undefined
  li_riy_percent?: number;
  depot_riy_percent?: number;

  withdrawal_years?: number;
};

export type CalculationModel = {
  id: string;
  created_date: string;

  name: string;
  monthly_contribution: number;
  contract_duration_years: number;

  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur?: number;
  lv_effective_costs_percent: number;

  lv_fund_identifier: string;
  lv_fund_ongoing_costs_percent: number;

  depot_fund_identifier: string;
  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;

  // Multi-Fonds-Konfiguration (neuere Berechnungen)
  lv_funds?: FundEntry[];
  depot_funds?: FundEntry[];

  depot_costs_annual: number;
  depot_provider: string;

  assumed_annual_return: number;
  birth_year: number;
  dynamik_percent?: number; // jährliche Beitragssteigerung (%); ältere Datensätze: undefined = 0

  annual_withdrawal?: number;

  // Multi-Fonds (neuere Datensätze); ältere haben nur die Einzelfonds-Felder
  lv_funds?: FundEntry[];
  depot_funds?: FundEntry[];

  results?: CalculationResults;
};

export class Calculation {
  static async list(sort?: string): Promise<CalculationModel[]> {
    // "created_date" = aufsteigend, "-created_date" (Default) = absteigend
    const { data, error } = await supabase
      .from('calculations')
      .select('*')
      .order('created_date', { ascending: sort === 'created_date' })
    if (error) throw error
    return (data ?? []) as CalculationModel[]
  }

  static async get(id: string): Promise<CalculationModel | null> {
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .eq('id', id)
      .single()
    return data as CalculationModel | null
  }

  static async create(
    input: Omit<CalculationModel, 'id' | 'created_date'>
  ): Promise<CalculationModel> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('calculations')
      .insert({ ...input, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as CalculationModel
  }

  static async update(id: string, changes: Partial<CalculationModel>): Promise<CalculationModel> {
    const { data, error } = await supabase
      .from('calculations')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as CalculationModel
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('calculations')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
