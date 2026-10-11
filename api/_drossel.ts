// Drosselung der Endpunkte je Nutzer.
//
// Alle Endpunkte verlangen eine Anmeldung, aber das allein bremst niemanden:
// Ein kostenloses Konto genuegt, um `send-feedback` in einer Schleife zu
// rufen und damit Mails ueber den Resend-Zugang des Betreibers zu verschicken.
// Das kostet Geld und beschaedigt den Ruf der Absenderdomain.
//
// Gezaehlt wird in der Datenbank (Migration 20261011120000), nicht im
// Arbeitsspeicher: Serverlose Funktionen laufen in beliebig vielen Instanzen,
// ein Zaehler im Prozess waere deshalb wirkungslos.

import type { SupabaseClient } from "@supabase/supabase-js";

/** Grenzen je Endpunkt: wie viele Aufrufe in welchem Zeitraum. */
export const GRENZEN = {
  /** Jeder Aufruf verschickt eine Mail - hier ist die Grenze am engsten. */
  feedback: { fensterSekunden: 3600, grenze: 5 },
  willkommensmail: { fensterSekunden: 3600, grenze: 5 },
  /** Gegen das Durchprobieren von Testcodes. */
  code: { fensterSekunden: 3600, grenze: 10 },
  /** Kontolöschung ist selten und endgültig. */
  konto: { fensterSekunden: 3600, grenze: 5 },
  /** Zahlungsvorgaenge: grosszuegiger, aber nicht unbegrenzt. */
  kasse: { fensterSekunden: 3600, grenze: 20 },
  /** Den eigenen Code lesen ist harmlos - hier geht es nur um Missbrauch. */
  empfehlung: { fensterSekunden: 3600, grenze: 60 },
  /** Einen fremden Code eintragen: dieselbe Logik wie beim Testcode. */
  empfehlung_code: { fensterSekunden: 3600, grenze: 10 },
} as const;

export type Endpunkt = keyof typeof GRENZEN;

/**
 * Zaehlt den Aufruf und sagt, ob er noch erlaubt ist.
 *
 * Bei einem Datenbankfehler wird **durchgelassen**: Eine kaputte Drosselung
 * darf die Anwendung nicht lahmlegen. Der Fehler gehoert ins Protokoll, damit
 * ein dauerhafter Ausfall auffaellt und nicht als stille Freigabe endet.
 */
export async function darfAufrufen(
  supabaseAdmin: SupabaseClient,
  userId: string,
  endpunkt: Endpunkt
): Promise<boolean> {
  const { fensterSekunden, grenze } = GRENZEN[endpunkt];
  const { data, error } = await supabaseAdmin.rpc("drossel_zaehlen", {
    p_user: userId,
    p_endpunkt: endpunkt,
    p_fenster_sekunden: fensterSekunden,
    p_grenze: grenze,
  });
  if (error) {
    console.error("[drossel] Zaehlen fehlgeschlagen", { endpunkt, error });
    return true;
  }
  return data !== false;
}

/** Einheitliche Antwort, damit die Oberflaeche sie ueberall gleich behandeln kann. */
export function zuVieleAufrufe(endpunkt: Endpunkt): { error: string } {
  const { grenze } = GRENZEN[endpunkt];
  return {
    error:
      `Zu viele Anfragen: Mehr als ${grenze} Vorgänge pro Stunde sind nicht möglich. ` +
      `Bitte versuchen Sie es später erneut.`,
  };
}
