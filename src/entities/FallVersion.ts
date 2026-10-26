import { supabase } from '@/lib/supabase'

/**
 * Unveränderliche Version einer Berechnung (Audit O08).
 *
 * Jedes Speichern schreibt eine Version fest: Eingaben, Kennzahlen und die
 * Ausgabereihen. Nur damit lässt sich später zeigen, was dem Kunden
 * tatsächlich vorlag – das Nachrechnen aus den Eingaben liefert das Ergebnis
 * des *heutigen* Modells, nicht das von damals.
 *
 * Versionen werden nie geändert. Die Datenbank erlaubt dafür kein UPDATE.
 */

export const FALL_TABELLEN = [
  'calculations',
  'single_payment_calculations',
  'best_advice_calculations',
  'pension_gap_calculations',
  'avd_calculations',
  'net_policy_calculations',
  'withdrawal_plans',
] as const

export type FallTabelle = (typeof FALL_TABELLEN)[number]

export type FallVersionModel = {
  id: string
  fall_tabelle: FallTabelle
  fall_id: string
  version: number
  name: string
  form: Record<string, unknown>
  results: Record<string, unknown>
  /** Alles, was die Anzeige zum Zeichnen braucht – Form je Rechner verschieden. */
  reihen?: unknown
  created_at: string
}

const TABELLE = 'fall_versionen'

export class FallVersion {
  /** Alle Versionen eines Falls, neueste zuerst. */
  static async list(fallTabelle: FallTabelle, fallId: string): Promise<FallVersionModel[]> {
    const { data, error } = await supabase
      .from(TABELLE)
      .select('*')
      .eq('fall_tabelle', fallTabelle)
      .eq('fall_id', fallId)
      .order('version', { ascending: false })
    if (error) throw error
    return (data ?? []) as FallVersionModel[]
  }

  static async get(id: string): Promise<FallVersionModel | null> {
    const { data } = await supabase.from(TABELLE).select('*').eq('id', id).single()
    return data as FallVersionModel | null
  }

  /**
   * Schreibt die nächste Version fest.
   *
   * Angelegt wird ausschließlich über `fassung_anlegen` in der Datenbank. Die
   * Funktion prüft, dass der Fall dem angemeldeten Konto gehört, und zieht die
   * Nummer selbst. Direktes Einfügen ist seit der Migration vom 26.10.2026
   * nicht mehr erlaubt: Vorher ließ sich eine Fassung zu einer fremden
   * Fall-Kennung ablegen, die der Eigentümer nie sah - sein nächstes Speichern
   * lief dann in die Eindeutigkeitsverletzung (Audit D01).
   *
   * Kollidieren zwei gleichzeitige Aufrufe auf demselben Fall, greift die
   * Eindeutigkeit der Spalte und der zweite Versuch holt die neue Nummer. Ein
   * Fehlschlag darf das Speichern des Falls nicht scheitern lassen - die
   * Version ist eine Beigabe, kein Ersatz.
   */
  static async anlegen(eingabe: {
    fallTabelle: FallTabelle
    fallId: string
    name: string
    form: Record<string, unknown>
    results: Record<string, unknown>
    reihen?: unknown
  }): Promise<FallVersionModel | null> {
    for (let versuch = 0; versuch < 3; versuch++) {
      const { data, error } = await supabase.rpc('fassung_anlegen', {
        p_fall_tabelle: eingabe.fallTabelle,
        p_fall_id: eingabe.fallId,
        p_name: eingabe.name,
        p_form: eingabe.form,
        p_results: eingabe.results,
        p_reihen: eingabe.reihen ?? null,
      })

      if (!error) return (data ?? null) as FallVersionModel | null
      // 23505 = Eindeutigkeitsverletzung: jemand war schneller, neu versuchen
      if (error.code !== '23505') {
        console.error('FallVersion: konnte nicht angelegt werden', error)
        return null
      }
    }
    return null
  }

  /** Versionen eines gelöschten Falls mit entfernen. */
  static async loescheFall(fallTabelle: FallTabelle, fallId: string): Promise<void> {
    const { error } = await supabase
      .from(TABELLE)
      .delete()
      .eq('fall_tabelle', fallTabelle)
      .eq('fall_id', fallId)
    if (error) console.error('FallVersion: Aufräumen fehlgeschlagen', error)
  }
}
