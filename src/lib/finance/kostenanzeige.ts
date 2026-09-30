// Anzeige der Vertragskosten einer Lebensversicherung (Audit N08).
//
// Wer Abschluss- und Verwaltungskosten in Euro eingibt, bekommt beide Posten
// getrennt zurück. Wer nur eine Effektivkostenquote eingibt, bekommt genau eine
// Zahl – die Aufteilung ist aus dieser Eingabe nicht ableitbar. Früher wurde
// sie nach einer festen Formel geschätzt und wie ein ermittelter Wert
// dargestellt; das hat einen Vertragsposten vorgetäuscht, den niemand
// eingegeben hat.

export type Vertragskosten = {
  /** true, wenn Abschluss und Verwaltung getrennt eingegeben wurden. */
  splitBekannt: boolean;
  /** Vertragskosten insgesamt, ohne Fondskosten. */
  gesamt: number;
  /** Nur bei bekanntem Split. */
  abschluss: number;
  /** Nur bei bekanntem Split. */
  verwaltung: number;
  /** Beschriftung für die ungeteilte Anzeige. */
  label: string;
  /** Erklärung, warum nicht aufgeteilt wird – null bei bekanntem Split. */
  hinweis: string | null;
};

export const KOSTEN_HINWEIS_PROZENT =
  'Bei Eingabe als Effektivkosten ist nur die Gesamtbelastung bekannt. ' +
  'Wie sie sich auf Abschluss- und Verwaltungskosten verteilt, geht aus der ' +
  'Quote nicht hervor – für eine Aufteilung die Kosten in Euro eingeben.';

/**
 * `abschluss` und `verwaltung` kommen aus den gespeicherten Ergebnissen. Ältere
 * Berechnungen im Prozentmodus haben dort noch den geschätzten Split stehen;
 * die Summe stimmt aber in beiden Fällen, deshalb wird sie zusammengefasst.
 */
export function vertragskosten(args: {
  kostenart?: 'eur' | 'percent' | null;
  abschluss?: number | null;
  verwaltung?: number | null;
}): Vertragskosten {
  const zahl = (v: unknown) => {
    const x = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return Number.isFinite(x) ? x : 0;
  };
  const abschluss = zahl(args.abschluss);
  const verwaltung = zahl(args.verwaltung);
  const gesamt = abschluss + verwaltung;
  const splitBekannt = args.kostenart !== 'percent';

  return {
    splitBekannt,
    gesamt,
    abschluss: splitBekannt ? abschluss : 0,
    verwaltung: splitBekannt ? verwaltung : 0,
    label: splitBekannt ? 'Verwaltung' : 'Vertragskosten (Effektivkosten)',
    hinweis: splitBekannt ? null : KOSTEN_HINWEIS_PROZENT,
  };
}
