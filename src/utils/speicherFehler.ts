// Fehlermeldungen beim Speichern von Berechnungen in verständliche Sätze übersetzen.
// Die Datenbank wirft beim Überschreiten des Free-Kontingents eine eigene Meldung
// (siehe supabase/migrations/20260928090000_free_limit_serverseitig.sql).

import { fehlerMelden } from "./fehlermelder";

export const KONTINGENT_TEXT =
  "Im kostenlosen Plan sind drei Berechnungen pro Monat möglich. Mit Premium rechnen Sie unbegrenzt – 30 Tage kostenlos testen.";

/**
 * Das Schema passt nicht zum Code – ein Fehler auf unserer Seite.
 *
 * Am 09.11.2026 gemeldet: Der Rentenlückenrechner speicherte seit dem
 * 29.09.2026 nicht mehr, weil drei Formularfelder ohne Migration dazugekommen
 * waren. PostgREST lehnt den Insert dann mit `PGRST204` ab und nennt die
 * fehlende Spalte beim Namen – aber diese Funktion kannte den Fall nicht und
 * gab den Allgemeinplatz unten zurück. Der Berater las „Ein Fehler ist
 * aufgetreten", suchte den Fehler bei sich, und die Meldung mit der Antwort
 * stand nur in der Browser-Konsole. Sechs Wochen lang.
 *
 * Deshalb ein eigener Text: Er sagt, dass es nicht an der Eingabe liegt, und
 * er nennt die Spalte – wer ihn weitermeldet, liefert die Diagnose gleich mit.
 */
const SCHEMA_TEXT =
  "Diese Berechnung lässt sich gerade nicht speichern – in der Datenbank fehlt ein Feld. " +
  "Das liegt nicht an Ihrer Eingabe. Bitte melden Sie uns diese Meldung:";

/** `PGRST204` oder die Postgres-Variante „column … does not exist". */
function istSchemafehler(meldung: string, code: string): boolean {
  return (
    code === "PGRST204" ||
    /Could not find the '.*' column/i.test(meldung) ||
    /column .* does not exist/i.test(meldung)
  );
}

export function speicherFehlerText(fehler: unknown): string {
  const alsObjekt =
    typeof fehler === "object" && fehler !== null
      ? (fehler as { message?: unknown; code?: unknown })
      : null;
  const meldung =
    fehler instanceof Error ? fehler.message : alsObjekt ? String(alsObjekt.message ?? "") : "";
  const code = alsObjekt?.code ? String(alsObjekt.code) : "";

  if (meldung.includes("Kontingent erreicht")) return KONTINGENT_TEXT;

  if (istSchemafehler(meldung, code)) {
    /*
     * Melden, nicht nur anzeigen.
     *
     * Vorher stand an jeder Aufrufstelle nur `console.error(e)`. Ein Fehler,
     * den niemand sieht, lebt so lange, bis ein Nutzer ihn meldet – hier
     * waren es sechs Wochen. `fehlerMelden` führt zu Sentry, sofern
     * `VITE_SENTRY_DSN` gesetzt ist, und tut sonst nichts.
     */
    fehlerMelden(fehler, { bereich: "speichern", art: "schema", meldung, code });
    return `${SCHEMA_TEXT} ${meldung || code}`;
  }

  // Auch der unbekannte Fall wird gemeldet. Sonst bleibt die nächste neue
  // Fehlerart wieder so lange unsichtbar wie diese.
  fehlerMelden(fehler, { bereich: "speichern", art: "unbekannt", meldung, code });
  return "Ein Fehler ist beim Speichern der Berechnung aufgetreten.";
}
