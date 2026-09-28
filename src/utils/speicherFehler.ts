// Fehlermeldungen beim Speichern von Berechnungen in verständliche Sätze übersetzen.
// Die Datenbank wirft beim Überschreiten des Free-Kontingents eine eigene Meldung
// (siehe supabase/migrations/20260928090000_free_limit_serverseitig.sql).

export const KONTINGENT_TEXT =
  "Im kostenlosen Plan sind drei Berechnungen pro Monat möglich. Mit Premium rechnen Sie unbegrenzt – 30 Tage kostenlos testen.";

export function speicherFehlerText(fehler: unknown): string {
  const meldung =
    fehler instanceof Error
      ? fehler.message
      : typeof fehler === "object" && fehler !== null && "message" in fehler
        ? String((fehler as { message: unknown }).message)
        : "";

  if (meldung.includes("Kontingent erreicht")) return KONTINGENT_TEXT;
  return "Ein Fehler ist beim Speichern der Berechnung aufgetreten.";
}
