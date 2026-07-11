// src/components/shared/TaxCalculations.ts
// Vereinfachte, fachlich plausible Steuer-/Hilfsfunktionen für die App.
// Kein rechtlicher Anspruch.
//
// Bewusste Vereinfachungen des Modells:
// - Keine Vorabpauschale (jährliche Vorwegbesteuerung thesaurierender Fonds entfällt).
// - Kirchensteuer wird als Zuschlag auf 25% KapESt gerechnet; real mindert KiSt die
//   KapESt auf ~24,45%/24,51% – der Unterschied ist für den Vergleich vernachlässigbar.
// - Sparerpauschbetrag wird einmalig bei Auszahlung abgezogen (nicht jährlich).

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
  // Sparerpauschbetrag (1.000 € p.P.), einmalig bei Auszahlung abgezogen
  sparerpauschbetrag_eur?: number;
  // Solidaritätszuschlag: +5,5% auf die Steuer
  solidaritaetszuschlag?: boolean;
  // Kirchensteuer: 8% oder 9% als Zuschlag auf die Steuer
  kirchensteuer_percent?: number;
};

/**
 * Abgeltungsteuer auf Depot-Gewinne.
 * Ohne options: 25% KapESt auf 100% Gewinn (Verhalten wie bisher).
 * Mit options: Teilfreistellung + Sparerpauschbetrag mindern die Bemessungsgrundlage,
 * SolZ/KiSt erhöhen die Steuer.
 */
export function calculateCapitalGainsTax(gains: number, options: DepotTaxOptions = {}): number {
  const g = Math.max(0, gains ?? 0);
  const tfs = Math.min(100, Math.max(0, options.teilfreistellung_percent ?? 0));
  const pauschbetrag = Math.max(0, options.sparerpauschbetrag_eur ?? 0);

  const taxable = Math.max(0, g * (1 - tfs / 100) - pauschbetrag);
  const baseTax = taxable * 0.25;

  const soliFactor = options.solidaritaetszuschlag ? 0.055 : 0;
  const kistFactor = Math.max(0, options.kirchensteuer_percent ?? 0) / 100;
  return baseTax * (1 + soliFactor + kistFactor);
}

export type LifeInsuranceTaxOptions = {
  // persönlicher Einkommensteuersatz bei Halbeinkünfteverfahren, z.B. 0.20 = 20%
  personalIncomeTaxRate?: number;
};

/**
 * LV-Steuer:
 * - Wenn Laufzeit >= 12 Jahre UND Alter bei Auszahlung >= 62:
 *   Halbeinkünfteverfahren (vereinfacht): 50% der Gewinne steuerpflichtig,
 *   abzgl. 15% pauschalem Freibetrag → 50% × 85% = 42,5% der Gewinne
 *   steuerpflichtig, versteuert mit dem persönlichen Satz (Default 20%).
 * - Sonst: wie KapESt (25% auf 100% Gewinn) – bewusste Vereinfachung,
 *   keine Teilfreistellung für nicht-qualifizierende Policen.
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

  const qualifiesHEV = dur >= 12 && age >= 62;

  if (!qualifiesHEV) {
    return g * 0.25;
  }

  const personalRate = options.personalIncomeTaxRate ?? 0.20; // Default 20%
  // Halbeinkünfteverfahren: 50% × 85% = 42,5% der Gewinne steuerpflichtig
  const taxableShare = 0.50 * 0.85; // = 0.425
  return g * taxableShare * personalRate;
}
