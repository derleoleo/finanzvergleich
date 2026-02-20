// src/components/shared/TaxCalculations.ts
// Vereinfachte, fachlich plausible Steuer-/Hilfsfunktionen für die App.
// Kein rechtlicher Anspruch.

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

export function calculateCapitalGainsTax(gains: number): number {
  // Vereinfachung: 25% KapESt auf 100% Gewinn (SolZ/KiSt ignoriert)
  const g = Math.max(0, gains ?? 0);
  return g * 0.25;
}

type LifeInsuranceTaxOptions = {
  // optional: wenn du später individuellen Steuersatz einbauen willst
  personalIncomeTaxRate?: number; // z.B. 0.20 = 20%
};

/**
 * LV-Steuer:
 * - Wenn Laufzeit >= 12 Jahre UND Alter bei Auszahlung >= 62:
 *   Teileinkünfteverfahren (vereinfacht): effektiv 35% des Gewinns steuerpflichtig
 *   (50% * (1 - 0.15 Freibetrag) = 42.5% – du nutzt in deinem Fachmodell 35%.
 *    Wir nehmen deine App-Logik: 35% steuerpflichtig * persönlicher Satz (Default 20%))
 * - Sonst: wie KapESt (25% auf 100% Gewinn) – vereinfachend
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

  const qualifiesTEV = dur >= 12 && age >= 62;

  if (!qualifiesTEV) {
    return g * 0.25;
  }

  const personalRate = options.personalIncomeTaxRate ?? 0.20; // Default 20%
  // Halbeinkünfteverfahren: 50% steuerpflichtig, davon 15% Sparerpauschbetrag-Abschlag
  // → 50% * (1 - 0.15) = 42,5% der Gewinne steuerpflichtig
  const taxableShare = 0.50 * 0.85; // = 0.425
  return g * taxableShare * personalRate;
}
