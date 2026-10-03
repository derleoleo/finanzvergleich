import { createClient } from '@supabase/supabase-js'

// Fehlen die Zugangsdaten, warf createClient bisher beim Laden des Moduls.
// Damit war die komplette Seite weiß – auch Impressum und Datenschutz, die
// erreichbar sein müssen. Jetzt startet die App mit einem Platzhalter; Anmeldung
// und Speichern scheitern dann sichtbar, die öffentlichen Seiten bleiben stehen.
/**
 * Zugangsdaten aus der Umgebung lesen und bereinigen.
 *
 * Beim Hinterlegen als Secret oder beim Kopieren aus .env.local rutscht leicht
 * ein Zeilenumbruch, ein Leerzeichen oder ein Anführungszeichen mit.
 */
function ausUmgebung(wert: string | undefined): string {
  return (wert ?? "").trim().replace(/^["']|["']$/g, "")
}

const url = ausUmgebung(import.meta.env.VITE_SUPABASE_URL)
const anonKey = ausUmgebung(import.meta.env.VITE_SUPABASE_ANON_KEY)

/** True, wenn die Adresse eine brauchbare HTTP(S)-Adresse ist. */
function istAdresse(wert: string): boolean {
  try {
    const u = new URL(wert)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const adresseGueltig = istAdresse(url)

/** False, wenn die Umgebung unvollständig oder unbrauchbar ist. */
export const supabaseKonfiguriert = Boolean(adresseGueltig && anonKey)

if (!supabaseKonfiguriert) {
  console.error(
    url && !adresseGueltig
      ? `Supabase ist falsch konfiguriert: VITE_SUPABASE_URL ist keine gültige Adresse (${url.slice(0, 40)}…). ` +
          'Erwartet wird nur die Adresse selbst, ohne Variablennamen und ohne Anführungszeichen.'
      : 'Supabase ist nicht konfiguriert: VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt. ' +
          'Anmeldung und gespeicherte Berechnungen stehen nicht zur Verfügung.'
  )
}

// Eine unbrauchbare Adresse darf nicht die ganze Seite weiß machen. createClient
// wirft dabei beim Laden des Moduls – auch Impressum und Datenschutz wären dann
// nicht mehr erreichbar, obwohl sie es sein müssen.
export const supabase = createClient(
  adresseGueltig ? url : 'https://nicht-konfiguriert.invalid',
  anonKey || 'nicht-konfiguriert'
)
