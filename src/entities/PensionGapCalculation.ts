import { supabase } from '@/lib/supabase'

export type PensionGapResults = {
  current_age: number;
  years_to_retirement: number;
  monthly_gap: number;
  capital_needed_at_retirement: number;
  future_value_of_existing: number;
  additional_capital_needed: number;
  monthly_savings_needed: number;
  gap_already_covered: boolean;
};

export type PensionGapModel = {
  id: string;
  created_date: string;
  name: string;
  birth_year: number;
  retirement_age: number;
  desired_monthly_income: number;
  expected_statutory_pension: number;
  occupational_pension_bav: number;
  basis_rente: number;
  rental_income: number;
  existing_capital: number;
  assumed_annual_return: number;
  results?: PensionGapResults;
};

export class PensionGapCalculation {
  static async list(_sort?: string): Promise<PensionGapModel[]> {
    const { data, error } = await supabase
      .from('pension_gap_calculations')
      .select('*')
      .order('created_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as PensionGapModel[]
  }

  static async get(id: string): Promise<PensionGapModel | null> {
    const { data } = await supabase
      .from('pension_gap_calculations')
      .select('*')
      .eq('id', id)
      .single()
    return data as PensionGapModel | null
  }

  static async create(
    input: Omit<PensionGapModel, 'id' | 'created_date'>
  ): Promise<PensionGapModel> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('pension_gap_calculations')
      .insert({ ...input, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as PensionGapModel
  }

  static async update(id: string, changes: Partial<PensionGapModel>): Promise<PensionGapModel> {
    const { data, error } = await supabase
      .from('pension_gap_calculations')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PensionGapModel
  }
}
