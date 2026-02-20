const NON_NAME_WORDS = new Set([
  'Test', 'Muster', 'Kunde', 'Kundin', 'Szenario', 'Beispiel', 'Entwurf',
  'Plan', 'Analyse', 'Berechnung', 'Rechner', 'Vergleich', 'Depot', 'Fonds',
  'Familie', 'Haushalt', 'Vertrag', 'Simulation', 'Fall', 'Variante',
]);

/**
 * Erkennt, ob ein Berechnungsname wie ein Klarname (Vor- + Nachname) aussieht.
 * Gibt true zurück, wenn mindestens zwei großgeschriebene Wörter (ohne Ziffern,
 * ohne bekannte Fachbegriffe) gefunden werden.
 */
export function looksLikeName(value: string): boolean {
  if (!value || value.length < 5) return false;
  if (/\d/.test(value)) return false;
  const words = value.trim().split(/\s+/);
  if (words.length < 2) return false;
  const allCapitalized = words.every((w) => /^[A-ZÄÖÜ]/.test(w) && w.length >= 2);
  const containsKnownTerm = words.some((w) => NON_NAME_WORDS.has(w));
  return allCapitalized && !containsKnownTerm;
}
