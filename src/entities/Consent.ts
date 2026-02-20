import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { ConsentType } from '@/utils/legalVersion'

type ConsentInput = {
  consent_type: ConsentType
  document_version: string
}

type ConsentInsert = {
  user_id: string
  consent_type: ConsentType
  document_version: string
  user_agent: string
}

export class Consent {
  static async saveConsents(consents: ConsentInput[], session: Session): Promise<void> {
    const rows: ConsentInsert[] = consents.map((c) => ({
      user_id: session.user.id,
      consent_type: c.consent_type,
      document_version: c.document_version,
      user_agent: navigator.userAgent,
    }))
    const { error } = await supabase
      .from('finanzvergleich_consents')
      .upsert(rows, { ignoreDuplicates: true, onConflict: 'user_id,consent_type,document_version' })
    if (error) throw error
  }

  static async hasRequiredConsents(
    userId: string,
    docVersion: string,
    types: readonly ConsentType[]
  ): Promise<boolean> {
    const { count, error } = await supabase
      .from('finanzvergleich_consents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('document_version', docVersion)
      .in('consent_type', [...types])
    if (error) throw error
    return (count ?? 0) >= types.length
  }
}
