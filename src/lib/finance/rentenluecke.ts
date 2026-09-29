// Rentenlücke: Wie viel Kapital fehlt zum Rentenbeginn, und welche Sparrate
// schließt die Lücke? (Audit F15)
//
// Modell:
// - Die Lücke ist in heutiger Kaufkraft angegeben und wird bis zum Rentenbeginn
//   mit der Inflation hochgerechnet.
// - In der Rentenphase bleibt die Kaufkraft erhalten: gerechnet wird mit dem
//   realen Zins (Rendite abzüglich Inflation), nicht mit dem nominalen.
// - Der Planungshorizont ist eingebbar (Vorgabe: Alter 90).
//
// Bewusste Vereinfachungen, die sichtbar bleiben müssen:
// - Steuern auf Entnahmen sind nicht abgebildet; die Lücke versteht sich netto.
// - Gesetzliche Rente und Betriebsrente werden ohne eigene Dynamik fortgeschrieben.
import { calculateMonthlyReturn } from "@/components/shared/TaxCalculations";

export type RentenlueckeEingabe = {
  birth_year: number;
  retirement_age: number;
  /** Bis zu welchem Alter das Kapital reichen soll. */
  withdrawal_end_age: number;
  desired_monthly_income: number;
  expected_statutory_pension: number;
  occupational_pension_bav: number;
  basis_rente: number;
  rental_income: number;
  existing_capital: number;
  assumed_annual_return: number;
  /** Jährliche Teuerung in Prozent. */
  inflation_percent: number;
};

export type RentenlueckeErgebnis = {
  current_age: number;
  years_to_retirement: number;
  monthly_gap: number;
  /** Lücke zum Rentenbeginn, also mit Inflation hochgerechnet. */
  monthly_gap_at_retirement: number;
  capital_needed_at_retirement: number;
  future_value_of_existing: number;
  additional_capital_needed: number;
  monthly_savings_needed: number;
  gap_already_covered: boolean;
  /** Rentenbeginn liegt nicht mehr in der Zukunft – Ansparen entfällt. */
  retirement_reached: boolean;
  withdrawal_end_age: number;
};

const zahl = (wert: unknown): number => {
  const n = Number(wert);
  return Number.isFinite(n) ? n : 0;
};

export function berechneRentenluecke(
  eingabe: RentenlueckeEingabe,
  heute: Date = new Date()
): RentenlueckeErgebnis {
  const current_age = heute.getFullYear() - zahl(eingabe.birth_year);
  const retirement_age = zahl(eingabe.retirement_age);
  const withdrawal_end_age = Math.max(retirement_age + 1, zahl(eingabe.withdrawal_end_age) || 90);
  const years_to_retirement = Math.max(0, retirement_age - current_age);
  const retirement_reached = years_to_retirement === 0;

  const monthly_gap =
    zahl(eingabe.desired_monthly_income) -
    (zahl(eingabe.expected_statutory_pension) +
      zahl(eingabe.occupational_pension_bav) +
      zahl(eingabe.basis_rente) +
      zahl(eingabe.rental_income));

  if (monthly_gap <= 0) {
    return {
      current_age,
      years_to_retirement,
      monthly_gap: 0,
      monthly_gap_at_retirement: 0,
      capital_needed_at_retirement: 0,
      future_value_of_existing: 0,
      additional_capital_needed: 0,
      monthly_savings_needed: 0,
      gap_already_covered: true,
      retirement_reached,
      withdrawal_end_age,
    };
  }

  const rendite = zahl(eingabe.assumed_annual_return) / 100;
  const inflation = zahl(eingabe.inflation_percent) / 100;

  // Die Lücke von heute kostet bei Rentenbeginn mehr
  const monthly_gap_at_retirement =
    monthly_gap * Math.pow(1 + inflation, years_to_retirement);

  // Realzins nach Fisher; damit bleibt die Kaufkraft der Entnahme erhalten
  const realzinsJahr = inflation > -1 ? (1 + rendite) / (1 + inflation) - 1 : rendite;
  const realzinsMonat = calculateMonthlyReturn(realzinsJahr * 100);
  const monate_rente = Math.max(1, Math.round((withdrawal_end_age - retirement_age) * 12));

  const capital_needed_at_retirement =
    Math.abs(realzinsMonat) > 1e-9
      ? (monthly_gap_at_retirement * (1 - Math.pow(1 + realzinsMonat, -monate_rente))) /
        realzinsMonat
      : monthly_gap_at_retirement * monate_rente;

  const future_value_of_existing =
    zahl(eingabe.existing_capital) * Math.pow(1 + rendite, years_to_retirement);

  const additional_capital_needed = Math.max(
    0,
    capital_needed_at_retirement - future_value_of_existing
  );

  // Sparrate: nominal verzinst bis zum Rentenbeginn
  const monate_ansparen = years_to_retirement * 12;
  const nominalMonat = calculateMonthlyReturn(zahl(eingabe.assumed_annual_return));
  let monthly_savings_needed = 0;
  if (additional_capital_needed > 0 && monate_ansparen > 0) {
    monthly_savings_needed =
      Math.abs(nominalMonat) > 1e-9
        ? (additional_capital_needed * nominalMonat) /
          (Math.pow(1 + nominalMonat, monate_ansparen) - 1)
        : additional_capital_needed / monate_ansparen;
  }

  return {
    current_age,
    years_to_retirement,
    monthly_gap: Math.round(monthly_gap),
    monthly_gap_at_retirement: Math.round(monthly_gap_at_retirement),
    capital_needed_at_retirement: Math.round(capital_needed_at_retirement),
    future_value_of_existing: Math.round(future_value_of_existing),
    additional_capital_needed: Math.round(additional_capital_needed),
    monthly_savings_needed: Math.round(monthly_savings_needed),
    gap_already_covered: false,
    // Wichtig: Bei erreichtem Rentenbeginn ist die Sparrate 0, obwohl Kapital
    // fehlt. Die Oberfläche muss das benennen statt „nichts zu tun“ anzuzeigen.
    retirement_reached,
    withdrawal_end_age,
  };
}
