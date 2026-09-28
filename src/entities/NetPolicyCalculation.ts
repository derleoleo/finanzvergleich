import { supabase } from '@/lib/supabase'

/**
 * Gespeicherter Vergleich Netto- gegen Bruttopolice. Eingaben liegen als `form`,
 * damit der Rechner sie unverändert wieder laden kann; `results` hält die
 * Kennzahlen für die Übersicht samt Modellstempel (siehe lib/finance/modell).
 */
export type NetPolicyResults = {
  brutto_net: number;
  netto_net: number;
  vorteil_nettopolice: number;
  honorar: number;
  modell_version?: string;
  bewertet_am?: string;
  rechtsstand?: string;
};

export type NetPolicyModel = {
  id: string;
  created_date: string;
  name: string;
  form: Record<string, unknown>;
  results?: NetPolicyResults;
};

const TABELLE = 'net_policy_calculations'

export class NetPolicyCalculation {
  static async list(sort?: string): Promise<NetPolicyModel[]> {
    const { data, error } = await supabase
      .from(TABELLE)
      .select('*')
      .order('created_date', { ascending: sort === 'created_date' })
    if (error) throw error
    return (data ?? []) as NetPolicyModel[]
  }

  static async get(id: string): Promise<NetPolicyModel | null> {
    const { data } = await supabase.from(TABELLE).select('*').eq('id', id).single()
    return data as NetPolicyModel | null
  }

  static async create(input: Omit<NetPolicyModel, 'id' | 'created_date'>): Promise<NetPolicyModel> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from(TABELLE)
      .insert({ ...input, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as NetPolicyModel
  }

  static async update(id: string, changes: Partial<NetPolicyModel>): Promise<NetPolicyModel> {
    const { data, error } = await supabase
      .from(TABELLE)
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as NetPolicyModel
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABELLE).delete().eq('id', id)
    if (error) throw error
  }
}
