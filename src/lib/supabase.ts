import { createClient } from '@supabase/supabase-js'

// Fehlen die Zugangsdaten, warf createClient bisher beim Laden des Moduls.
// Damit war die komplette Seite weiß – auch Impressum und Datenschutz, die
// erreichbar sein müssen. Jetzt startet die App mit einem Platzhalter; Anmeldung
// und Speichern scheitern dann sichtbar, die öffentlichen Seiten bleiben stehen.
// Getrimmt: Beim Hinterlegen als Secret oder beim Kopieren aus .env.local
// rutscht leicht ein Zeilenumbruch oder Leerzeichen mit. Eine Adresse mit
// angehaengtem Umbruch laesst createClient werfen – und dann ist die ganze
// Seite weiss, ohne erkennbaren Grund.
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** False, wenn die Umgebung unvollständig ist (z. B. Build ohne Secrets). */
export const supabaseKonfiguriert = Boolean(url && anonKey)

if (!supabaseKonfiguriert) {
  console.error(
    'Supabase ist nicht konfiguriert: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt. ' +
      'Anmeldung und gespeicherte Berechnungen stehen nicht zur Verfügung.'
  )
}

export const supabase = createClient(
  url || 'https://nicht-konfiguriert.invalid',
  anonKey || 'nicht-konfiguriert'
)
