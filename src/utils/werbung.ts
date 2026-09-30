// Weiterempfehlung auf der Clientseite.
//
// Der Empfehlungslink trägt den Code als ?ref=. Weil zwischen Klick und
// Registrierung noch Seitenwechsel, Bestätigungsmail und ein zweiter
// Browserstart liegen können, wird der Code lokal gemerkt und erst nach der
// Anmeldung an den Server gemeldet. Zugeordnet wird er dort nur einmal und nur
// bei frischen Konten.

const SCHLUESSEL = "fv_ref_code";

/** Liest ?ref= aus der Adresse und merkt sich den Code. */
export function werbecodeAusAdresseMerken(): void {
  try {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (!code) return;
    const sauber = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (sauber) localStorage.setItem(SCHLUESSEL, sauber);
  } catch {
    /* privater Modus o. Ä. – dann eben ohne Empfehlung */
  }
}

export function gemerkterWerbecode(): string | null {
  try {
    return localStorage.getItem(SCHLUESSEL);
  } catch {
    return null;
  }
}

export function werbecodeVergessen(): void {
  try {
    localStorage.removeItem(SCHLUESSEL);
  } catch {
    /* ignorieren */
  }
}

/**
 * Meldet den gemerkten Code nach der Anmeldung. Fehler bleiben still: Eine
 * fehlgeschlagene Zuordnung darf die Anmeldung nicht stören. Der Code wird
 * nur bei einer eindeutigen Antwort verworfen, damit ein Netzfehler die
 * Empfehlung nicht verschluckt.
 */
export async function werbungMelden(accessToken: string): Promise<void> {
  const code = gemerkterWerbecode();
  if (!code) return;
  try {
    const res = await fetch("/api/referral", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code }),
    });
    // Nur bei Erfolg oder einer inhaltlichen Ablehnung (400: Code unbekannt,
    // eigener Code, Konto zu alt) ist die Sache erledigt. Bei 401, 404 oder
    // Serverfehlern bleibt der Code liegen – das kann eine vorübergehende
    // Störung sein, und eine verworfene Empfehlung bekommt niemand zurück.
    if (res.ok || res.status === 400) werbecodeVergessen();
  } catch {
    /* beim nächsten Anmelden erneut versuchen */
  }
}
