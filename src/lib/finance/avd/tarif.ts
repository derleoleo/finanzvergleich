// src/lib/finance/avd/tarif.ts
// Einkommensteuertarif 2026 nach § 32a EStG (Fassung Steuerfortentwicklungsgesetz).
// Grundfreibetrag 12.348 €, Spitzensteuersatz ab 69.879 €, "Reichensteuer" ab 277.826 €.
//
// Gesetzliche Rundungsregeln: zvE auf volle Euro abrunden, Ergebnis auf volle
// Euro abrunden (§ 32a Abs. 1 S. 6).

/** Tarifliche Einkommensteuer 2026, Grundtarif, in Euro (abgerundet). */
export function estGrundtarif2026(zvE: number): number {
  return Math.floor(estGrundtarifRoh2026(Math.floor(Math.max(0, zvE))));
}

/**
 * Tariffunktion ohne Abrundung – für Stetigkeitstests und Grenzsteuersätze.
 * Nicht für die Steuerberechnung selbst verwenden.
 */
export function estGrundtarifRoh2026(zvE: number): number {
  const x = Math.max(0, zvE);
  if (x <= 12348) return 0;
  if (x <= 17799) {
    const y = (x - 12348) / 10000;
    return (914.51 * y + 1400) * y;
  }
  if (x <= 69878) {
    const z = (x - 17799) / 10000;
    return (173.1 * z + 2397) * z + 1034.87;
  }
  if (x <= 277825) return 0.42 * x - 11135.63;
  return 0.45 * x - 19470.38;
}

/** Tarifliche ESt 2026 mit Ehegattensplitting (§ 32a Abs. 5). */
export function estTarif2026(zvE: number, splitting: boolean): number {
  if (!splitting) return estGrundtarif2026(zvE);
  return 2 * estGrundtarif2026(Math.floor(Math.max(0, zvE) / 2));
}

export type SteuerZuschlaege = {
  /** Solidaritätszuschlag auf die tarifliche ESt (Freigrenze wird berücksichtigt). */
  soli?: boolean;
  /** 0 | 0.08 | 0.09 */
  kirchensteuersatz?: number;
};

/**
 * Steuerentlastung durch ein zusätzliches Abzugsvolumen `abzug`,
 * inkl. Soli und Kirchensteuer. Basis der Günstigerprüfung (§ 10a Abs. 2).
 */
export function steuerentlastung(
  zvE: number,
  abzug: number,
  splitting: boolean,
  zuschlaege: SteuerZuschlaege = {}
): number {
  const vorher = gesamtsteuer(zvE, splitting, zuschlaege);
  const nachher = gesamtsteuer(Math.max(0, zvE - Math.max(0, abzug)), splitting, zuschlaege);
  return Math.max(0, vorher - nachher);
}

/** Tarifliche ESt zzgl. Soli und Kirchensteuer. */
export function gesamtsteuer(
  zvE: number,
  splitting: boolean,
  zuschlaege: SteuerZuschlaege = {}
): number {
  const est = estTarif2026(zvE, splitting);
  const soli = zuschlaege.soli ? soliBetrag(est, splitting) : 0;
  const kirche = Math.max(0, zuschlaege.kirchensteuersatz ?? 0) * est;
  return est + soli + kirche;
}

/**
 * Solidaritätszuschlag auf die tarifliche ESt mit Freigrenze und Milderungszone
 * (§ 3, § 4 SolZG 2026). Anders als bei der Abgeltungsteuer greift hier die
 * Freigrenze – die meisten Steuerzahler zahlen keinen Soli auf die ESt.
 */
export function soliBetrag(est: number, splitting: boolean): number {
  const freigrenze = splitting ? 40700 : 20350; // [ANNAHME] Werte 2026, vor Release prüfen
  if (est <= freigrenze) return 0;
  const voll = 0.055 * est;
  const milderung = 0.119 * (est - freigrenze); // Überleitungszone
  return Math.min(voll, milderung);
}

/** Grenzsteuersatz am zvE (numerisch, für Anzeige/Plausibilisierung). */
export function grenzsteuersatz2026(zvE: number, splitting: boolean): number {
  const d = 100;
  const basis = splitting ? Math.max(0, zvE) / 2 : Math.max(0, zvE);
  return (estGrundtarifRoh2026(basis + d) - estGrundtarifRoh2026(basis)) / d;
}
