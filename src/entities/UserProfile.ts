import { supabase } from '@/lib/supabase'

export type UserProfileData = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
};

function makeEmpty(): UserProfileData {
  return { name: '', company: '', email: '', phone: '', address: '', city: '', zip: '' }
}

export class UserProfile {
  static async load(): Promise<UserProfileData> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return makeEmpty()
    const { data } = await supabase
      .from('user_profiles')
      .select('name, company, email, phone, address, city, zip')
      .eq('user_id', user.id)
      .single()
    if (!data) return makeEmpty()
    return { ...makeEmpty(), ...data }
  }

  static async save(profileData: UserProfileData): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('user_profiles')
      .upsert(
        { ...profileData, user_id: user.id, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
  }
}
