import { supabase } from '@/lib/supabase'

export type SinglePaymentResults = {
  lump_sum: number;
  life_insurance_gross: number;
  life_insurance_net: number;
  depot_gross: number;
  depot_net: number;
  total_contributions: number;
  li_total_costs: number;
  depot_total_costs: number;
  li_acquisition_costs: number;
  li_fund_costs: number;
  li_admin_costs: number;
  depot_initial_charges: number;
  depot_fund_costs: number;
  depot_depot_costs: number;
  li_tax: number;
  depot_tax: number;
};

export type SinglePaymentModel = {
  id: string;
  created_date: string;
  name: string;
  lump_sum: number;
  contract_duration_years: number;
  birth_year: number;
  assumed_annual_return: number;
  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur: number;
  lv_effective_costs_percent: number;
  lv_fund_ongoing_costs_percent: number;
  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;
  depot_costs_annual: number;
  results?: SinglePaymentResults;
};

export class SinglePaymentCalculation {
  static async list(_sort?: string): Promise<SinglePaymentModel[]> {
    const { data, error } = await supabase
      .from('single_payment_calculations')
      .select('*')
      .order('created_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as SinglePaymentModel[]
  }

  static async get(id: string): Promise<SinglePaymentModel | null> {
    const { data } = await supabase
      .from('single_payment_calculations')
      .select('*')
      .eq('id', id)
      .single()
    return data as SinglePaymentModel | null
  }

  static async create(
    input: Omit<SinglePaymentModel, 'id' | 'created_date'>
  ): Promise<SinglePaymentModel> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('single_payment_calculations')
      .insert({ ...input, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as SinglePaymentModel
  }

  static async update(id: string, changes: Partial<SinglePaymentModel>): Promise<SinglePaymentModel> {
    const { data, error } = await supabase
      .from('single_payment_calculations')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as SinglePaymentModel
  }
}
