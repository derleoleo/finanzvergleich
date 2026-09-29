import { supabase } from '@/lib/supabase'
import type { ModellStempel } from '@/lib/finance/modell'

/**
 * Gespeicherter Entnahmeplan. Eingaben liegen als `form`, damit die Seite sie
 * unverändert wieder laden kann; `results` hält die Kennzahlen für die Übersicht.
 */
export type WithdrawalPlanResults = {
  start_capital: number;
  annual_withdrawal: number;
  /** Alter, in dem das Kapital aufgebraucht ist – null, wenn es bis zum Planende reicht. */
  depleted_at_age: number | null;
  end_capital: number;
  end_age: number;
  /** Summe aller Entnahmen über den Plan (seit Audit N02/N03 mitgespeichert). */
  total_withdrawn?: number;
} & Partial<ModellStempel>;

export type WithdrawalPlanModel = {
  id: string;
  created_date: string;
  name: string;
  form: Record<string, unknown>;
  results?: WithdrawalPlanResults;
};

const TABELLE = 'withdrawal_plans'

export class WithdrawalPlanEntry {
  static async list(sort?: string): Promise<WithdrawalPlanModel[]> {
    const { data, error } = await supabase
      .from(TABELLE)
      .select('*')
      .order('created_date', { ascending: sort === 'created_date' })
    if (error) throw error
    return (data ?? []) as WithdrawalPlanModel[]
  }

  static async get(id: string): Promise<WithdrawalPlanModel | null> {
    const { data } = await supabase.from(TABELLE).select('*').eq('id', id).single()
    return data as WithdrawalPlanModel | null
  }

  static async create(input: Omit<WithdrawalPlanModel, 'id' | 'created_date'>): Promise<WithdrawalPlanModel> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from(TABELLE)
      .insert({ ...input, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as WithdrawalPlanModel
  }

  static async update(id: string, changes: Partial<WithdrawalPlanModel>): Promise<WithdrawalPlanModel> {
    const { data, error } = await supabase
      .from(TABELLE)
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as WithdrawalPlanModel
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABELLE).delete().eq('id', id)
    if (error) throw error
  }
}
