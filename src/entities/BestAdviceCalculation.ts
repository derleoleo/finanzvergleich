import { supabase } from '@/lib/supabase'

export type BestAdviceResults = {
  total_contributions: number;
  // Fonds-LV (the alternative)
  life_insurance_gross: number;
  life_insurance_net: number;
  li_total_costs: number;
  li_acquisition_costs: number;
  li_fund_costs: number;
  li_admin_costs: number;
  li_tax: number;
  // Bestandsvertrag (the current product)
  depot_gross: number; // = guaranteed_end_capital
  depot_net: number;
  depot_tax: number;
};

export type BestAdviceModel = {
  id: string;
  created_date: string;
  name: string;
  // Current product inputs
  current_monthly_contribution: number;
  current_product_tax_free: boolean;
  contract_duration_years: number;
  current_capital: number;
  guaranteed_end_capital: number;
  // Fonds-LV inputs
  birth_year: number;
  assumed_annual_return: number;
  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur: number;
  lv_effective_costs_percent: number;
  lv_fund_ongoing_costs_percent: number;
  results?: BestAdviceResults;
};

export class BestAdviceCalculation {
  static async list(_sort?: string): Promise<BestAdviceModel[]> {
    const { data, error } = await supabase
      .from('best_advice_calculations')
      .select('*')
      .order('created_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as BestAdviceModel[]
  }

  static async get(id: string): Promise<BestAdviceModel | null> {
    const { data } = await supabase
      .from('best_advice_calculations')
      .select('*')
      .eq('id', id)
      .single()
    return data as BestAdviceModel | null
  }

  static async create(
    input: Omit<BestAdviceModel, 'id' | 'created_date'>
  ): Promise<BestAdviceModel> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('best_advice_calculations')
      .insert({ ...input, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as BestAdviceModel
  }

  static async update(id: string, changes: Partial<BestAdviceModel>): Promise<BestAdviceModel> {
    const { data, error } = await supabase
      .from('best_advice_calculations')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as BestAdviceModel
  }
}
