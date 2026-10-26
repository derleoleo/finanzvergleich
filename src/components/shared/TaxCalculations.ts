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
  /**
   * Fondsgebundene Police? Nur dann greift die 15-%-Teilfreistellung
   * (§ 20 Abs. 1 Nr. 6 S. 9 EStG) – sie setzt Investmenterträge voraus. Eine
   * klassische Kapitallebensversicherung hat keine, dort sind die Erträge
   * ungeschmälert anzusetzen.
   *
   * Vorgabe `true`: Die Rechner dieses Produkts vergleichen fondsgebundene
   * Policen. Der Bestandsvergleich fragt es je Vertrag ab (Audit C02).
   */
  fondsgebunden?: boolean;
  /**
   * Jahr des Vertragsabschlusses – entscheidet über die begünstigte
   * Altersgrenze: Verträge ab 2012 verlangen Alter 62
   * (§ 52 Abs. 28 S. 7 EStG), davor genügt Alter 60
   * (§ 20 Abs. 1 Nr. 6 S. 2 EStG).
   *
   * Ohne Angabe wird 62 angesetzt, weil neu abgeschlossene Verträge der
   * Regelfall dieser Rechner sind.
   */
  vertragsBeginnJahr?: number | null;
};

/** Ab diesem Abschlussjahr gilt die höhere Altersgrenze (§ 52 Abs. 28 S. 7 EStG). */
export const LV_ALTERSGRENZE_AB_2012 = 62;
/** Für früher abgeschlossene Verträge (§ 20 Abs. 1 Nr. 6 S. 2 EStG). */
export const LV_ALTERSGRENZE_BIS_2011 = 60;

/**
 * Welche Altersgrenze gilt für das Halbeinkünfteverfahren?
 *
 * Getrennte Funktion, weil die Oberfläche sie nennen muss: Wer einen Vertrag
 * von 2008 eingibt, soll lesen, dass dort 60 gilt – sonst sieht eine
 * scheinbar zu niedrige Steuer wie ein Fehler aus.
 */
export function lvAltersgrenze(vertragsBeginnJahr?: number | null): number {
  const jahr = Number(vertragsBeginnJahr);
  if (!Number.isFinite(jahr) || jahr <= 1900) return LV_ALTERSGRENZE_AB_2012;
  return jahr >= 2012 ? LV_ALTERSGRENZE_AB_2012 : LV_ALTERSGRENZE_BIS_2011;
}

/**
 * Steuer auf die Erträge einer Lebens-/Rentenversicherung bei Kapitalauszahlung.
 *
 * Zwei Merkmale des Vertrags entscheiden mit, und beide waren vorher fest
 * verdrahtet (Audit C02):
 *
 * 1. **Fondsgebunden oder klassisch.** Die 15-%-Teilfreistellung
 *    (§ 20 Abs. 1 Nr. 6 S. 9 EStG) setzt Investmenterträge voraus. Für eine
 *    klassische Police gibt es sie nicht. Pauschal angewandt sprach die
 *    Rechnung einem klassischen Bestandsvertrag eine Freistellung zu, die
 *    ihm nicht zusteht: 1.700 € statt 2.000 € bei 20.000 € Gewinn.
 * 2. **Jahr des Vertragsabschlusses.** Die begünstigte Altersgrenze liegt
 *    erst für Verträge ab 2012 bei 62 (§ 52 Abs. 28 S. 7 EStG), davor bei 60.
 *    Mit festen 62 fiel ein Vertrag von 2008 mit Auszahlung bei 60 aus dem
 *    Halbeinkünfteverfahren heraus – 4.250 € statt 2.000 €.
 *
 * Rechenweg:
 * - Laufzeit >= 12 Jahre UND Alter bei Auszahlung >= Altersgrenze:
 *   halber Unterschiedsbetrag zum persönlichen Satz (Vorgabe 20 %), bei
 *   fondsgebundenen Policen zusätzlich die Teilfreistellung
 *   (50 % × 85 % = 42,5 % der Erträge).
 * - sonst: Abgeltungsteuer 25 % auf die Erträge, bei fondsgebundenen
 *   Policen auf 85 % davon.
 * - SolZ und Kirchensteuer kommen in beiden Fällen als Zuschlag auf die
 *   Steuer.
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

  // Nur fondsgebundene Policen tragen die Teilfreistellung (Satz 9).
  const fondsgebunden = options.fondsgebunden ?? true;
  const nachTeilfreistellung = fondsgebunden ? 0.85 : 1;
  const altersgrenze = lvAltersgrenze(options.vertragsBeginnJahr);
  const qualifiesHEV = dur >= 12 && age >= altersgrenze;

  if (!qualifiesHEV) {
    return g * nachTeilfreistellung * 0.25 * surcharge;
  }

  const personalRate = options.personalIncomeTaxRate ?? 0.20; // Default 20%
  // Halber Unterschiedsbetrag, bei Fondspolicen nach Teilfreistellung
  return g * 0.5 * nachTeilfreistellung * personalRate * surcharge;
}
