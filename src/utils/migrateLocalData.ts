import { Calculation } from '@/entities/Calculation'
import { SinglePaymentCalculation } from '@/entities/SinglePaymentCalculation'
import { BestAdviceCalculation } from '@/entities/BestAdviceCalculation'
import { PensionGapCalculation } from '@/entities/PensionGapCalculation'
import { UserProfile } from '@/entities/UserProfile'
import type { CalculationModel } from '@/entities/Calculation'
import type { SinglePaymentModel } from '@/entities/SinglePaymentCalculation'
import type { BestAdviceModel } from '@/entities/BestAdviceCalculation'
import type { PensionGapModel } from '@/entities/PensionGapCalculation'
import type { UserProfileData } from '@/entities/UserProfile'

const MIGRATION_KEY = 'fv_migrated_to_supabase'

function readLocalArray<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readLocalProfile(): UserProfileData | null {
  const raw = localStorage.getItem('finanzvergleich_userprofile')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function migrateLocalDataToSupabase(): Promise<void> {
  if (localStorage.getItem(MIGRATION_KEY)) return

  const calculations = readLocalArray<CalculationModel>('finanzvergleich_calculations')
  const singlePayments = readLocalArray<SinglePaymentModel>('finanzvergleich_singlepayment')
  const bestAdvice = readLocalArray<BestAdviceModel>('finanzvergleich_bestadvice')
  const pensionGaps = readLocalArray<PensionGapModel>('finanzvergleich_pensiongap')
  const localProfile = readLocalProfile()

  const hasData =
    calculations.length > 0 ||
    singlePayments.length > 0 ||
    bestAdvice.length > 0 ||
    pensionGaps.length > 0 ||
    localProfile !== null

  if (!hasData) {
    localStorage.setItem(MIGRATION_KEY, '1')
    return
  }

  try {
    // Insert in reverse so newest ends up on top (create() inserts newest first in Supabase)
    for (const item of [...calculations].reverse()) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_date: _cd, ...rest } = item as CalculationModel & Record<string, unknown>
      await Calculation.create(rest as Omit<CalculationModel, 'id' | 'created_date'>)
    }
    for (const item of [...singlePayments].reverse()) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_date: _cd, ...rest } = item as SinglePaymentModel & Record<string, unknown>
      await SinglePaymentCalculation.create(rest as Omit<SinglePaymentModel, 'id' | 'created_date'>)
    }
    for (const item of [...bestAdvice].reverse()) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_date: _cd, ...rest } = item as BestAdviceModel & Record<string, unknown>
      await BestAdviceCalculation.create(rest as Omit<BestAdviceModel, 'id' | 'created_date'>)
    }
    for (const item of [...pensionGaps].reverse()) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, created_date: _cd, ...rest } = item as PensionGapModel & Record<string, unknown>
      await PensionGapCalculation.create(rest as Omit<PensionGapModel, 'id' | 'created_date'>)
    }
    if (localProfile) {
      await UserProfile.save(localProfile)
    }
    localStorage.setItem(MIGRATION_KEY, '1')
  } catch (err) {
    console.error('Migration fehlgeschlagen:', err)
  }
}
