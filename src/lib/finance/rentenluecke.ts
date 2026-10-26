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
// Welche Konvention gilt, sagt `einnahmen_basis` (Audit C04). Vorher war sie
// unsichtbar: Die Rechnung unterstellte, dass auch die Einnahmen in heutiger
// Kaufkraft angegeben sind und bis zum Rentenbeginn mit der Inflation steigen.
// Wer stattdessen einen fest zugesagten Betrag zum Rentenbeginn eintrug, bekam
// eine Lücke, die zu einer anderen Annahme gehört - bei 3.000 EUR Bedarf,
// 2.000 EUR Einnahmen, 30 Jahren und 2 % Inflation 1.811 EUR statt 3.434 EUR.
// Beide Zahlen sind richtig, aber nur eine passt zur Eingabe.
//
// Bewusste Vereinfachungen, die sichtbar bleiben müssen:
// - Steuern auf Entnahmen sind nicht abgebildet; die Lücke versteht sich netto.
//   Für die gesetzliche Rente gibt es `abzuege_gesetzliche_rente_percent`:
//   Die Renteninformation der DRV weist brutto aus, ohne Steuern und ohne
//   Kranken- und Pflegeversicherung.
// - Betriebsrente, Basisrente und Mieteinnahmen werden ohne eigene Dynamik
//   fortgeschrieben; sie folgen der gewählten Konvention.
import { calculateMonthlyReturn } from "@/components/shared/TaxCalculations";

/**
 * In welchem Geldwert stehen die Einnahmen im Formular?
 *
 * `heute`: in heutiger Kaufkraft; sie steigen bis zum Rentenbeginn mit der
 * Inflation (die bisherige, unausgesprochene Annahme).
 * `rentenbeginn`: fest zugesagte Beträge zum Rentenbeginn, die danach nominal
 * gleich bleiben - ihre Kaufkraft sinkt also im Ruhestand.
 */
export type EinnahmenBasis = 'heute' | 'rentenbeginn';

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
  /** Geldwert der Einnahmen; Vorgabe `heute` (Audit C04). */
  einnahmen_basis?: EinnahmenBasis;
  /**
   * Abzüge auf die gesetzliche Rente in Prozent: Kranken- und
   * Pflegeversicherung sowie Steuer. Vorgabe 0 - dann gilt die Eingabe als
   * Nettobetrag. Die Renteninformation der DRV ist brutto.
   */
  abzuege_gesetzliche_rente_percent?: number;
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
  /** Monate, für die das Kapital ab Entnahmebeginn reichen muss. */
  entnahmemonate: number;
  /** Die Konvention, mit der gerechnet wurde (Audit C04). */
  einnahmen_basis: EinnahmenBasis;
  /**
   * Alter, ab dem die Luecke auftritt - undefined, wenn keine entsteht.
   *
   * Bei festen Einnahmen kann sie erst Jahre nach dem Rentenbeginn beginnen
   * (Audit E01). Ohne diese Angabe stuende in der Oberflaeche eine Luecke von
   * 0 EUR neben einem Kapitalbedarf von mehreren zehntausend Euro.
   */
  luecke_ab_alter?: number;
  /** Die angesetzten Abzüge auf die gesetzliche Rente, in Prozent. */
  abzuege_gesetzliche_rente_percent: number;
  /** Summe der Einnahmen nach Abzügen, wie sie in die Rechnung eingeht. */
  einnahmen_monatlich: number;
  /**
   * Die Teuerung, mit der tatsächlich gerechnet wurde.
   *
   * Sie kommt aus den Voreinstellungen, nicht aus dem Formular. Ohne diesen
   * Rückgabewert stand sie in keinem gespeicherten Fall – wer eine alte
   * Berechnung später ansah, konnte die wichtigste Annahme nicht nachlesen
   * (Audit C08).
   */
  inflation_percent: number;
};

const zahl = (wert: unknown): number => {
  const n = Number(wert);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Barwert einer Luecke, die im Ruhestand waechst.
 *
 * Gebraucht nur fuer `einnahmen_basis: 'rentenbeginn'`: Dort bleiben die
 * Einnahmen nominal gleich, waehrend der Bedarf weiter mit der Inflation
 * steigt. Die Luecke des Monats m ist also
 * `Bedarf * (1+i)^(m/12) - Einnahmen`, abgezinst mit dem Nominalzins. Eine
 * Annuitaet mit konstanter Rate wuerde das Kapital zu klein rechnen.
 *
 * Monatsweise und nicht in geschlossener Form, weil die Luecke in den ersten
 * Jahren noch null sein kann (wenn die Einnahmen anfangs reichen) - ein
 * geschlossener Ausdruck wuerde dort negative Betraege gegenrechnen.
 */
function barwertWachsenderLuecke(args: {
  bedarfBeiRentenbeginn: number;
  einnahmenFest: number;
  inflation: number;
  nominalzinsJahr: number;
  monate: number;
}): { barwert: number; ersterMonatMitLuecke: number | null } {
  const monate = Math.max(0, Math.round(args.monate));
  if (monate === 0) return { barwert: 0, ersterMonatMitLuecke: null };
  const iMonat = calculateMonthlyReturn(args.inflation * 100);
  const zMonat = calculateMonthlyReturn(args.nominalzinsJahr * 100);
  let barwert = 0;
  let bedarf = args.bedarfBeiRentenbeginn;
  let ersterMonatMitLuecke: number | null = null;
  for (let m = 1; m <= monate; m++) {
    const luecke = Math.max(0, bedarf - args.einnahmenFest);
    if (luecke > 0 && ersterMonatMitLuecke === null) ersterMonatMitLuecke = m;
    barwert += luecke / Math.pow(1 + zMonat, m);
    bedarf *= 1 + iMonat;
  }
  return { barwert, ersterMonatMitLuecke };
}

export function berechneRentenluecke(
  eingabe: RentenlueckeEingabe,
  heute: Date = new Date()
): RentenlueckeErgebnis {
  const current_age = heute.getFullYear() - zahl(eingabe.birth_year);
  const retirement_age = zahl(eingabe.retirement_age);
  const withdrawal_end_age = Math.max(retirement_age + 1, zahl(eingabe.withdrawal_end_age) || 90);
  const years_to_retirement = Math.max(0, retirement_age - current_age);
  const retirement_reached = years_to_retirement === 0;

  const inflation_percent = zahl(eingabe.inflation_percent);
  const einnahmen_basis: EinnahmenBasis =
    eingabe.einnahmen_basis === 'rentenbeginn' ? 'rentenbeginn' : 'heute';
  const abzuege_gesetzliche_rente_percent = Math.min(
    100,
    Math.max(0, zahl(eingabe.abzuege_gesetzliche_rente_percent))
  );

  // Die Renteninformation der DRV weist brutto aus. Wer sie ungeprueft
  // uebernimmt, rechnet mit einem Netto, das es nicht gibt (Audit C04).
  const gesetzlicheNetto =
    zahl(eingabe.expected_statutory_pension) *
    (1 - abzuege_gesetzliche_rente_percent / 100);

  const einnahmen_monatlich =
    gesetzlicheNetto +
    zahl(eingabe.occupational_pension_bav) +
    zahl(eingabe.basis_rente) +
    zahl(eingabe.rental_income);

  const bedarf = zahl(eingabe.desired_monthly_income);
  const inflationFaktor = Math.pow(
    1 + inflation_percent / 100,
    years_to_retirement
  );

  /*
   * Zwei Konventionen, zwei Rechenwege - und zwar bewusst getrennt:
   *
   * `heute`: Bedarf und Einnahmen stehen in derselben Kaufkraft. Die Differenz
   * wird gebildet und erst dann hochgerechnet. Das ist die bisherige Rechnung;
   * gespeicherte Faelle bleiben deshalb Zahl fuer Zahl gleich.
   *
   * `rentenbeginn`: Die Einnahmen sind feste Betraege zum Rentenbeginn. Dann
   * darf nur der Bedarf hochgerechnet werden, und die Luecke in heutiger
   * Kaufkraft ergibt sich umgekehrt durch Abzinsen der Einnahmen - sonst
   * stuenden in einer Differenz zwei verschiedene Geldwerte.
   */
  const monthly_gap =
    einnahmen_basis === 'heute'
      ? bedarf - einnahmen_monatlich
      : bedarf - einnahmen_monatlich / (inflationFaktor || 1);
  const monthly_gap_at_retirement_roh =
    einnahmen_basis === 'heute'
      ? monthly_gap * inflationFaktor
      : bedarf * inflationFaktor - einnahmen_monatlich;

  const rendite = zahl(eingabe.assumed_annual_return) / 100;
  const inflation = inflation_percent / 100;
  // Ist der Rentenbeginn erreicht, zählt die Zeit ab heute. Sonst würde für
  // eine 75-jährige Person weiterhin Kapital für 23 Jahre ab 67 gerechnet,
  // obwohl nur noch 15 Jahre bis zum Planende übrig sind.
  const beginnAlter = retirement_reached
    ? Math.max(current_age, retirement_age)
    : retirement_age;
  const monate_rente = Math.max(1, Math.round((withdrawal_end_age - beginnAlter) * 12));

  /*
   * Bei festen Einnahmen entscheidet nicht der Rentenbeginn, sondern der ganze
   * Entnahmehorizont (Audit E01).
   *
   * Vorher endete die Rechnung, sobald zum Rentenbeginn keine Luecke bestand -
   * und meldete "gedeckt". Genau in dieser Konvention ist das falsch: Der
   * Bedarf steigt weiter, die Einnahmen nicht. Bei 2.000 EUR Bedarf und
   * 2.100 EUR festen Einnahmen reicht es die ersten zweieinhalb Jahre und
   * danach nicht mehr; der Kapitalbedarf lag bei ueber 64.000 EUR, ausgewiesen
   * wurde null. Der Barwertrechner, der das haette auffangen koennen, wurde
   * gar nicht erreicht.
   */
  const wachsend =
    einnahmen_basis === 'rentenbeginn'
      ? barwertWachsenderLuecke({
          bedarfBeiRentenbeginn: bedarf * inflationFaktor,
          einnahmenFest: einnahmen_monatlich,
          inflation,
          nominalzinsJahr: rendite,
          monate: monate_rente,
        })
      : null;

  const luecke_ab_alter =
    wachsend?.ersterMonatMitLuecke != null
      ? beginnAlter + wachsend.ersterMonatMitLuecke / 12
      : monthly_gap_at_retirement_roh > 0
        ? beginnAlter
        : undefined;

  const gedeckt = wachsend
    ? wachsend.barwert <= 0
    : monthly_gap_at_retirement_roh <= 0;

  if (gedeckt) {
    return {
      current_age,
      years_to_retirement,
      inflation_percent,
      einnahmen_basis,
      abzuege_gesetzliche_rente_percent,
      einnahmen_monatlich: Math.round(einnahmen_monatlich),
      monthly_gap: 0,
      luecke_ab_alter: undefined,
      monthly_gap_at_retirement: 0,
      capital_needed_at_retirement: 0,
      future_value_of_existing: 0,
      additional_capital_needed: 0,
      monthly_savings_needed: 0,
      gap_already_covered: true,
      retirement_reached,
      withdrawal_end_age,
      entnahmemonate: 0,
    };
  }

  const monthly_gap_at_retirement = Math.max(0, monthly_gap_at_retirement_roh);

  // Realzins nach Fisher; damit bleibt die Kaufkraft der Entnahme erhalten
  const realzinsJahr = inflation > -1 ? (1 + rendite) / (1 + inflation) - 1 : rendite;
  const realzinsMonat = calculateMonthlyReturn(realzinsJahr * 100);

  const capital_needed_at_retirement = wachsend
    ? // Feste Einnahmen verlieren im Ruhestand Kaufkraft: Der Bedarf steigt
      // weiter, die Einnahmen nicht. Die Luecke waechst also jedes Jahr, und
      // eine Annuitaet mit konstanter Rate wuerde sie unterschaetzen.
      wachsend.barwert
    : // Reale Verzinsung haelt die Kaufkraft der Entnahme konstant - das passt,
      // weil in dieser Konvention auch die Einnahmen mit der Inflation steigen.
      Math.abs(realzinsMonat) > 1e-9
      ? (monthly_gap_at_retirement *
          (1 - Math.pow(1 + realzinsMonat, -monate_rente))) /
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
    inflation_percent,
    einnahmen_basis,
    abzuege_gesetzliche_rente_percent,
    einnahmen_monatlich: Math.round(einnahmen_monatlich),
    monthly_gap: Math.round(Math.max(0, monthly_gap)),
    luecke_ab_alter,
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
    entnahmemonate: monate_rente,
  };
}
