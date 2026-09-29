// Aufteilung einer langen Bildaufnahme auf A4-Seiten (Audit F22).
// Bisher entstand eine einzige Seite in Inhaltshöhe – am Bildschirm brauchbar,
// gedruckt oder in fremden Betrachtern aber unhandlich.
// Reine Rechnung, damit sie ohne DOM testbar ist.

export const A4_BREITE_MM = 210;
export const A4_HOEHE_MM = 297;
/** Platz am Seitenfuß für Marke, Seitenzahl und Stand. */
export const FUSSZEILE_MM = 12;

export type Seitenschnitt = {
  /** Erste Bildzeile dieser Seite (Pixel). */
  vonPx: number;
  /** Höhe des Ausschnitts (Pixel). */
  hoehePx: number;
  /** Höhe im PDF (mm). */
  hoeheMm: number;
};

/**
 * Teilt ein Bild der Breite `breitePx` in A4-Seiten.
 * Die Bildbreite füllt die Seitenbreite; die Höhe folgt daraus.
 */
export function berechneSeiten(
  breitePx: number,
  hoehePx: number,
  fusszeileMm: number = FUSSZEILE_MM
): Seitenschnitt[] {
  if (!(breitePx > 0) || !(hoehePx > 0)) return [];

  const mmProPixel = A4_BREITE_MM / breitePx;
  const nutzhoeheMm = Math.max(10, A4_HOEHE_MM - fusszeileMm);
  const seitenhoehePx = Math.max(1, Math.floor(nutzhoeheMm / mmProPixel));

  const seiten: Seitenschnitt[] = [];
  for (let von = 0; von < hoehePx; von += seitenhoehePx) {
    const hoehe = Math.min(seitenhoehePx, hoehePx - von);
    seiten.push({ vonPx: von, hoehePx: hoehe, hoeheMm: hoehe * mmProPixel });
  }
  return seiten;
}
