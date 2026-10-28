// src/utils/avdEntwurf.ts
// Was ältere Entwürfe und gespeicherte Fälle des Altersvorsorgedepot-Rechners
// nicht wissen können.
//
// `hatRiesterBestand` gibt es erst seit der Einstiegsleiste. Ein vor ihr
// gespeicherter Riester-Fall trägt das Feld nicht — ohne Ableitung stünde er
// beim Öffnen auf „kein Bestand" und verlöre damit seinen Vergleichspartner.
//
// Eigene Datei, nicht in der Seite: Eine Komponentendatei, die auch Funktionen
// ausführt, bricht das schnelle Neuladen im Entwicklungsserver (eslint-Regel
// react-refresh/only-export-components) — und hier ist die Funktion ohnehin
// besser aufgehoben, weil sie ohne React prüfbar ist.

/** Nur die Felder, auf die es bei der Ableitung ankommt. */
type MitVergleich = {
  vergleichspartner?: string;
  hatRiesterBestand?: boolean;
};

/**
 * Legt `roh` über `defaults` und ergänzt, was fehlt.
 *
 * Eine ausdrückliche Angabe in `roh` hat Vorrang; fehlt sie, folgt der
 * Riester-Bestand dem Vergleichspartner.
 */
export function ergaenzeFehlendes<T extends MitVergleich>(roh: Partial<T>, defaults: T): T {
  const zusammen = { ...defaults, ...roh };
  return {
    ...zusammen,
    hatRiesterBestand:
      roh.hatRiesterBestand ?? zusammen.vergleichspartner === 'riester_alt',
  };
}
