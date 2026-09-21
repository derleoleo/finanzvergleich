// src/utils/preise.ts
// Einzige Quelle für die angezeigten Abo-Preise (Preisseite und Landingpage).
// Die Beträge müssen mit den Preisen in Stripe übereinstimmen.
//
// Endpreise: Der Anbieter ist Kleinunternehmer nach § 19 UStG, es wird keine
// Umsatzsteuer berechnet. Entfällt die Regelung, AGB § 4 beachten.

export const PREIS_MONAT = 59;
export const PREIS_JAHR = 590;

/** Ersparnis des Jahresabos gegenüber zwölf Monatsraten. */
export const ERSPARNIS_JAHR = PREIS_MONAT * 12 - PREIS_JAHR;

/** Ersparnis in Monatsraten – nur als Etikett verwenden, wenn ganzzahlig. */
export const GRATIS_MONATE = ERSPARNIS_JAHR / PREIS_MONAT;

export const KLEINUNTERNEHMER_HINWEIS =
  "Endpreis · keine Umsatzsteuer (Kleinunternehmer, § 19 UStG)";

/** Formatiert Euro-Beträge ohne überflüssige Nachkommastellen. */
export function eur(betrag: number): string {
  return `${betrag.toLocaleString("de-DE", {
    minimumFractionDigits: Number.isInteger(betrag) ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`;
}

/** Monatsäquivalent des Jahresabos, auf Cent gerundet. */
export const MONATSAEQUIVALENT_JAHR = Math.round((PREIS_JAHR / 12) * 100) / 100;

/** "2 Monate gratis" nur, wenn es exakt stimmt – sonst die Ersparnis in Euro. */
export function ersparnisEtikett(): string {
  return Number.isInteger(GRATIS_MONATE)
    ? `${GRATIS_MONATE} Monate gratis`
    : `spare ${eur(ERSPARNIS_JAHR)}`;
}
