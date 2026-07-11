// src/components/shared/TaxCalculations.ts
// Vereinfachte, fachlich plausible Steuer-/Hilfsfunktionen für die App.
// Kein rechtlicher Anspruch.
//
// Bewusste Vereinfachungen des Modells:
// - Keine Vorabpauschale (jährliche Vorwegbesteuerung thesaurierender Fonds entfällt).
//   Hinweis zur Richtung des Bias: real würden Steuern vorgezogen (Nachteil Depot),
//   dafür würde der Sparerpauschbetrag jährlich wirken (Vorteil Depot).
// - Kein Sparerpauschbetrag: wird bewusst gar nicht angesetzt, da nicht bekannt ist,
//   ob er bereits anderweitig (Zinsen, Festgeld, Ausschüttungen, Bausparer) verbraucht
//   ist. Konservative Annahme zulasten des Depots.
// - Kirchensteuer wird als Zuschlag auf 25% KapESt gerechnet; real mindert KiSt die
//   KapESt auf ~24,45%/24,51% – der Unterschied ist für den Vergleich vernachlässigbar.
// - Die 15%-Teilfreistellung für fondsgebundene Policen (§ 20 Abs. 1 Nr. 6 Satz 9 EStG)
//   wird in beiden LV-Fällen angesetzt; klassische (nicht fondsgebundene) Policen
//   würden real ohne diese Teilfreistellung besteuert.

export function calculateMonthlyReturn(annualReturnPercent: number): number {
  // Effektiver Monatszins aus Jahreszins (Zinseszins konsistent)
  const r = (annualReturnPercent ?? 0) / 100;
  return Math.pow(1 + r, 1 / 12) - 1;
}

export function calculateZillmerMonths(totalMonths: number): number {
  // Abschlusskosten i.d.R. über max. 60 Monate (5 Jahre) verteilt,
  // aber natürlich nicht länger als die Vertragslaufzeit.
  return Math.max(1, Math.min(60, Math.floor(totalMonths)));
}

export function calculateAgeAtPayout(birthYear: number, contractDurationYears: number): number {
  const by = Number(birthYear);
  const dur = Number(contractDurationYears);
  if (!Number.isFinite(by) || !Number.isFinite(dur)) return 0;
  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - by;
  return currentAge + dur;
}

export type DepotTaxOptions = {
  // Teilfreistellung nach InvStG: 30% Aktienfonds, 15% Mischfonds, 0% sonstige
  teilfreistellung_percent?: number;
  // Solidaritätszuschlag: +5,5% auf die Steuer
  // (fällt auf die Abgeltungsteuer immer an – keine Freigrenze bei Kapitalerträgen)
  solidaritaetszuschlag?: boolean;
  // Kirchensteuer: 8% oder 9% als Zuschlag auf die Steuer
  kirchensteuer_percent?: number;
};

/**
 * Abgeltungsteuer auf Depot-Gewinne.
 * Ohne options: 25% KapESt auf 100% Gewinn.
 * Mit options: Teilfreistellung mindert die Bemessungsgrundlage,
 * SolZ/KiSt erhöhen die Steuer. Ein Sparerpauschbetrag wird bewusst
 * nicht angesetzt (siehe Kopfkommentar).
 */
export function calculateCapitalGainsTax(gains: number, options: DepotTaxOptions = {}): number {
  const g = Math.max(0, gains ?? 0);
  const tfs = Math.min(100, Math.max(0, options.teilfreistellung_percent ?? 0));

  const taxable = g * (1 - tfs / 100);
  const baseTax = taxable * 0.25;

  const soliFactor = options.solidaritaetszuschlag ? 0.055 : 0;
  const kistFactor = Math.max(0, options.kirchensteuer_percent ?? 0) / 100;
  return baseTax * (1 + soliFactor + kistFactor);
}

export type LifeInsuranceTaxOptions = {
  // persönlicher Einkommensteuersatz bei Halbeinkünfteverfahren, z.B. 0.20 = 20%
  personalIncomeTaxRate?: number;
  // Solidaritätszuschlag: +5,5% auf die Steuer (KapESt wie tarifliche ESt)
  solidaritaetszuschlag?: boolean;
  // Kirchensteuer: 8% oder 9% als Zuschlag auf die Steuer
  kirchensteuer_percent?: number;
};

/**
 * LV-Steuer (fondsgebundene Police):
 * - Wenn Laufzeit >= 12 Jahre UND Alter bei Auszahlung >= 62:
 *   Halbeinkünfteverfahren: 50% der Gewinne steuerpflichtig, davor 15%
 *   Teilfreistellung (§ 20 Abs. 1 Nr. 6 Satz 9 EStG) → 50% × 85% = 42,5%
 *   der Gewinne steuerpflichtig, versteuert mit dem persönlichen Satz
 *   (Default 20%).
 * - Sonst: Abgeltungsteuer 25% auf 85% der Gewinne (15% Teilfreistellung
 *   gilt auch ohne Halbeinkünfte-Qualifikation).
 * In beiden Fällen erhöhen SolZ/KiSt (falls gesetzt) die Steuer als Zuschlag.
 */
export function calculateLifeInsuranceTax(
  gains: number,
  contractDurationYears: number,
  ageAtPayout: number,
  options: LifeInsuranceTaxOptions = {}
): number {
  const g = Math.max(0, gains ?? 0);
  const dur = Number(contractDurationYears);
  const age = Number(ageAtPayout);

  const soliFactor = options.solidaritaetszuschlag ? 0.055 : 0;
  const kistFactor = Math.max(0, options.kirchensteuer_percent ?? 0) / 100;
  const surcharge = 1 + soliFactor + kistFactor;

  const qualifiesHEV = dur >= 12 && age >= 62;

  if (!qualifiesHEV) {
    // Abgeltungsteuer auf 85% der Gewinne (15% Teilfreistellung, Satz 9)
    return g * 0.85 * 0.25 * surcharge;
  }

  const personalRate = options.personalIncomeTaxRate ?? 0.20; // Default 20%
  // Halbeinkünfteverfahren: 50% × 85% = 42,5% der Gewinne steuerpflichtig
  const taxableShare = 0.50 * 0.85; // = 0.425
  return g * taxableShare * personalRate * surcharge;
}
