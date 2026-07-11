import { supabase } from '@/lib/supabase'
import type { FundEntry } from '@/components/calculator/MultiFundEditor'

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
  // Effektivkosten (Reduction in Yield) in %-Punkten p.a.; ältere Datensätze: undefined
  li_riy_percent?: number;
  depot_riy_percent?: number;
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
  // Multi-Fonds-Konfiguration – Spalten existieren evtl. noch nicht in der DB
  // (siehe stripUnknownColumns-Fallback in create/update)
  lv_funds?: FundEntry[];
  depot_funds?: FundEntry[];
  results?: SinglePaymentResults;
};

// Die Tabelle single_payment_calculations hat die JSONB-Spalten lv_funds/depot_funds
// evtl. noch nicht (Migration ausstehend). Wenn PostgREST eine unbekannte Spalte
// meldet, wird der Schreibvorgang ohne diese Felder wiederholt, damit das Speichern
// nicht komplett fehlschlägt. Sobald die Spalten existieren, greift der Fallback nicht mehr.
function isUnknownColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /column|spalte/i.test(error.message ?? '')
  );
}

function withoutFundArrays<T extends { lv_funds?: unknown; depot_funds?: unknown }>(obj: T) {
  const { lv_funds: _lv, depot_funds: _depot, ...rest } = obj;
  return rest;
}

export class SinglePaymentCalculation {
  static async list(sort?: string): Promise<SinglePaymentModel[]> {
    // "created_date" = aufsteigend, "-created_date" (Default) = absteigend
    const { data, error } = await supabase
      .from('single_payment_calculations')
      .select('*')
      .order('created_date', { ascending: sort === 'created_date' })
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
    const row = { ...input, user_id: user!.id }
    let { data, error } = await supabase
      .from('single_payment_calculations')
      .insert(row)
      .select()
      .single()
    if (error && isUnknownColumnError(error)) {
      ({ data, error } = await supabase
        .from('single_payment_calculations')
        .insert(withoutFundArrays(row))
        .select()
        .single())
    }
    if (error) throw error
    return data as SinglePaymentModel
  }

  static async update(id: string, changes: Partial<SinglePaymentModel>): Promise<SinglePaymentModel> {
    let { data, error } = await supabase
      .from('single_payment_calculations')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error && isUnknownColumnError(error)) {
      ({ data, error } = await supabase
        .from('single_payment_calculations')
        .update(withoutFundArrays(changes))
        .eq('id', id)
        .select()
        .single())
    }
    if (error) throw error
    return data as SinglePaymentModel
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('single_payment_calculations')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
