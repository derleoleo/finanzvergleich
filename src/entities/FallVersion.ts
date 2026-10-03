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
   * Die Nummer kommt aus der Datenbank, nicht aus dem Browser: Zwei offene
   * Fenster würden sonst dieselbe ziehen. Kollidieren zwei Aufrufe trotzdem,
   * greift die Eindeutigkeit der Spalte und der zweite Versuch holt die neue
   * Nummer. Ein Fehlschlag darf das Speichern des Falls nicht scheitern
   * lassen – die Version ist eine Beigabe, kein Ersatz.
   */
  static async anlegen(eingabe: {
    fallTabelle: FallTabelle
    fallId: string
    name: string
    form: Record<string, unknown>
    results: Record<string, unknown>
    reihen?: unknown
  }): Promise<FallVersionModel | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    for (let versuch = 0; versuch < 3; versuch++) {
      const { data: naechste, error: nummerFehler } = await supabase.rpc(
        'naechste_fallversion',
        { p_fall_tabelle: eingabe.fallTabelle, p_fall_id: eingabe.fallId }
      )
      if (nummerFehler) {
        console.error('FallVersion: Nummer nicht ermittelbar', nummerFehler)
        return null
      }

      const { data, error } = await supabase
        .from(TABELLE)
        .insert({
          user_id: user.id,
          fall_tabelle: eingabe.fallTabelle,
          fall_id: eingabe.fallId,
          version: (naechste as number) ?? 1,
          name: eingabe.name,
          form: eingabe.form,
          results: eingabe.results,
          reihen: eingabe.reihen ?? null,
        })
        .select()
        .single()

      if (!error) return data as FallVersionModel
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
