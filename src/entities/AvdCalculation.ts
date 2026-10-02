import { supabase } from '@/lib/supabase'

/**
 * Gespeicherte Altersvorsorgedepot-Berechnung. Eingaben liegen als `form`,
 * damit der Rechner sie unverändert wieder laden kann; `results` hält die
 * Kennzahlen für die Übersicht samt Modellstempel (siehe lib/finance/modell).
 */
export type AvdResults = {
  endkapital_nach_steuer: number;
  vergleich_nach_steuer: number;
  vergleich_name: string;
  summe_foerderung: number;
  /** Kombinationsstrategie – null, wenn der Beitrag den Aufteilungspunkt nicht übersteigt. */
  kombination_nach_steuer?: number | null;
  aufteilung_monatlich?: number;
  zweitvertrag?: 'depot' | 'fonds_lv';
  modell_version?: string;
  bewertet_am?: string;
  rechtsstand?: string;
};

export type AvdModel = {
  id: string;
  created_date: string;
  name: string;
  form: Record<string, unknown>;
  results?: AvdResults;
};

const TABELLE = 'avd_calculations'

export class AvdCalculation {
  static async list(sort?: string): Promise<AvdModel[]> {
    const { data, error } = await supabase
      .from(TABELLE)
      .select('*')
      .order('created_date', { ascending: sort === 'created_date' })
    if (error) throw error
    return (data ?? []) as AvdModel[]
  }

  static async get(id: string): Promise<AvdModel | null> {
    const { data } = await supabase.from(TABELLE).select('*').eq('id', id).single()
    return data as AvdModel | null
  }

  static async create(input: Omit<AvdModel, 'id' | 'created_date'>): Promise<AvdModel> {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from(TABELLE)
      .insert({ ...input, user_id: user!.id })
      .select()
      .single()
    if (error) throw error
    return data as AvdModel
  }

  static async update(id: string, changes: Partial<AvdModel>): Promise<AvdModel> {
    const { data, error } = await supabase
      .from(TABELLE)
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as AvdModel
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase.from(TABELLE).delete().eq('id', id)
    if (error) throw error
  }
}
