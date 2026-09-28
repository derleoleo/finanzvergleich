// Lokale Entwürfe und Voreinstellungen gehören zur angemeldeten Person.
// Ohne Aufräumen sähe das nächste Konto im selben Browser die Entwürfe des
// vorigen – inklusive Mandantendaten.

const PRAEFIXE = ["fv_", "wp_"];
/** Merkt sich, für wen die lokalen Daten gelten. */
const BESITZER_KEY = "fv_lokaler_besitzer";

function lokaleSchluessel(): string[] {
  const treffer: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key !== BESITZER_KEY && PRAEFIXE.some((p) => key.startsWith(p))) {
      treffer.push(key);
    }
  }
  return treffer;
}

/** Entfernt alle Entwürfe und Voreinstellungen aus diesem Browser. */
export function lokaleDatenLoeschen(): void {
  try {
    lokaleSchluessel().forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(BESITZER_KEY);
  } catch {
    // Privater Modus oder gesperrter Speicher: nichts zu tun
  }
}

/**
 * Räumt auf, wenn sich ein anderes Konto anmeldet als zuletzt.
 * Beim gleichen Konto bleiben die Entwürfe erhalten.
 */
export function lokaleDatenFuerNutzerPruefen(userId: string): void {
  try {
    const bisher = localStorage.getItem(BESITZER_KEY);
    if (bisher && bisher !== userId) lokaleDatenLoeschen();
    localStorage.setItem(BESITZER_KEY, userId);
  } catch {
    // s. o.
  }
}
