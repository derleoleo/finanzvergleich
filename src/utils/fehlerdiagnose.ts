// Hilfen für die Fehlerdiagnose (Sentry). Getrennt von main.tsx, damit die
// Regeln testbar sind (Audit F20).

/**
 * Entfernt Abfrageteile aus Adressen. Sie enthalten Kennungen gespeicherter
 * Berechnungen (?id=…) und gehören nicht in Fehlermeldungen.
 */
export function ohneParameter(adresse?: string): string | undefined {
  if (!adresse) return adresse;
  try {
    const url = new URL(adresse, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return adresse.split("?")[0];
  }
}
