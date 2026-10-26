import { describe, expect, it } from "vitest";
import { berechneRentenluecke, type RentenlueckeEingabe } from "./rentenluecke";

const heute = new Date(2026, 5, 15);

const basis = (over: Partial<RentenlueckeEingabe> = {}): RentenlueckeEingabe => ({
  birth_year: 1986,          // 40 Jahre in 2026
  retirement_age: 67,
  withdrawal_end_age: 90,
  desired_monthly_income: 3000,
  expected_statutory_pension: 1500,
  occupational_pension_bav: 0,
  basis_rente: 0,
  rental_income: 0,
  existing_capital: 0,
  assumed_annual_return: 5,
  inflation_percent: 2,
  ...over,
});

describe("Rentenlücke (F15)", () => {
  it("meldet keine Lücke, wenn die Einkünfte reichen", () => {
    const r = berechneRentenluecke(basis({ expected_statutory_pension: 3200 }), heute);
    expect(r.gap_already_covered).toBe(true);
    expect(r.monthly_savings_needed).toBe(0);
  });

  it("gibt die verwendete Teuerung zurück, auch ohne Lücke (C08)", () => {
    // Der Satz kommt aus den Voreinstellungen und stand deshalb in keinem
    // gespeicherten Fall. Wer die Voreinstellung spaeter aenderte, konnte die
    // Annahme einer alten Berechnung nicht mehr nachlesen.
    const mit = berechneRentenluecke(basis({ inflation_percent: 2.5 }), heute);
    expect(mit.inflation_percent).toBe(2.5);
    const ohne = berechneRentenluecke(
      basis({ expected_statutory_pension: 3200, inflation_percent: 3 }),
      heute
    );
    expect(ohne.gap_already_covered).toBe(true);
    expect(ohne.inflation_percent).toBe(3);
  });

  it("rechnet die Lücke mit Inflation auf den Rentenbeginn hoch", () => {
    const r = berechneRentenluecke(basis(), heute);
    expect(r.monthly_gap).toBe(1500);
    // 1500 € × 1,02^27 ≈ 2560 €
    expect(r.monthly_gap_at_retirement).toBeGreaterThan(2500);
    expect(r.monthly_gap_at_retirement).toBeLessThan(2620);
  });

  it("berücksichtigt den eingestellten Planungshorizont", () => {
    const bis90 = berechneRentenluecke(basis(), heute);
    const bis100 = berechneRentenluecke(basis({ withdrawal_end_age: 100 }), heute);
    expect(bis100.capital_needed_at_retirement).toBeGreaterThan(bis90.capital_needed_at_retirement);
    expect(bis100.monthly_savings_needed).toBeGreaterThan(bis90.monthly_savings_needed);
  });

  it("kennzeichnet einen bereits erreichten Rentenbeginn statt 0 € Sparrate zu behaupten", () => {
    const r = berechneRentenluecke(basis({ birth_year: 1955 }), heute); // 71 Jahre
    expect(r.retirement_reached).toBe(true);
    expect(r.additional_capital_needed).toBeGreaterThan(0);
    expect(r.monthly_savings_needed).toBe(0);
  });

  it("rechnet nach Rentenbeginn nur noch die verbleibenden Jahre (N05)", () => {
    // 75 Jahre alt, Rentenbeginn 67, Planende 90, 1.000 € Lücke, ohne Zins
    const r = berechneRentenluecke(
      basis({
        birth_year: 1951,
        desired_monthly_income: 1000,
        expected_statutory_pension: 0,
        assumed_annual_return: 0,
        inflation_percent: 0,
      }),
      heute
    );
    expect(r.current_age).toBe(75);
    expect(r.entnahmemonate).toBe(180); // 15 Jahre, nicht 23
    expect(r.capital_needed_at_retirement).toBe(180_000);
  });

  it("zieht vorhandenes Kapital ab", () => {
    const ohne = berechneRentenluecke(basis(), heute);
    const mit = berechneRentenluecke(basis({ existing_capital: 100_000 }), heute);
    expect(mit.future_value_of_existing).toBeGreaterThan(100_000);
    expect(mit.additional_capital_needed).toBeLessThan(ohne.additional_capital_needed);
  });

  it("verkraftet Rendite gleich Inflation", () => {
    const r = berechneRentenluecke(basis({ assumed_annual_return: 2, inflation_percent: 2 }), heute);
    expect(Number.isFinite(r.capital_needed_at_retirement)).toBe(true);
    // Ohne Realzins entspricht der Bedarf der Summe der Entnahmen
    expect(r.capital_needed_at_retirement).toBeCloseTo(r.monthly_gap_at_retirement * 276, -3);
  });
});

describe("Geldwert der Einnahmen (Audit C04)", () => {
  // Die Probe aus dem Audit: 3.000 EUR Bedarf heute, 2.000 EUR Einnahmen,
  // 27 Jahre bis zur Rente (Fixture), 2 % Inflation.
  const probe = (over = {}) =>
    basis({
      desired_monthly_income: 3000,
      expected_statutory_pension: 2000,
      ...over,
    });

  it("rechnet mit heutiger Kaufkraft wie bisher", () => {
    const r = berechneRentenluecke(probe({ einnahmen_basis: "heute" }), heute);
    expect(r.einnahmen_basis).toBe("heute");
    // Differenz zuerst, dann hochrechnen: 1.000 EUR x 1,02^27
    expect(r.monthly_gap).toBe(1000);
    expect(r.monthly_gap_at_retirement).toBe(Math.round(1000 * 1.02 ** 27));
  });

  it("rechnet feste Betraege zum Rentenbeginn anders - und sagt es", () => {
    const r = berechneRentenluecke(probe({ einnahmen_basis: "rentenbeginn" }), heute);
    expect(r.einnahmen_basis).toBe("rentenbeginn");
    // Nur der Bedarf steigt: 3.000 x 1,02^27 - 2.000
    expect(r.monthly_gap_at_retirement).toBe(Math.round(3000 * 1.02 ** 27 - 2000));
    // In heutiger Kaufkraft werden die Einnahmen abgezinst
    expect(r.monthly_gap).toBe(Math.round(3000 - 2000 / 1.02 ** 27));
    // Die Konvention macht den Unterschied, nicht die Subtraktion
    const heuteBasis = berechneRentenluecke(probe({ einnahmen_basis: "heute" }), heute);
    expect(r.monthly_gap_at_retirement).toBeGreaterThan(
      heuteBasis.monthly_gap_at_retirement
    );
  });

  it("fordert bei festen Einnahmen mehr Kapital, weil die Luecke waechst", () => {
    // Im Ruhestand verlieren feste Einnahmen Kaufkraft: Der Bedarf steigt
    // weiter, die Einnahmen nicht. Eine konstante Rate wuerde das Kapital zu
    // klein rechnen.
    const fest = berechneRentenluecke(probe({ einnahmen_basis: "rentenbeginn" }), heute);
    const mitwachsend = berechneRentenluecke(probe({ einnahmen_basis: "heute" }), heute);
    expect(fest.capital_needed_at_retirement).toBeGreaterThan(
      mitwachsend.capital_needed_at_retirement
    );
    expect(Number.isFinite(fest.capital_needed_at_retirement)).toBe(true);
  });

  it("gilt ohne Angabe weiter als heutige Kaufkraft", () => {
    const r = berechneRentenluecke(probe(), heute);
    expect(r.einnahmen_basis).toBe("heute");
  });

  it("entscheidet die Deckung am Rentenbeginn", () => {
    // Heute reichen die 3.100 EUR, zum Rentenbeginn nicht mehr: Wird die
    // Deckung am heutigen Betrag geprueft, verschwindet die Luecke zu Unrecht.
    const r = berechneRentenluecke(
      probe({ expected_statutory_pension: 3100, einnahmen_basis: "rentenbeginn" }),
      heute
    );
    expect(r.gap_already_covered).toBe(false);
    expect(r.monthly_gap_at_retirement).toBeGreaterThan(0);
  });
});

describe("Abzuege auf die gesetzliche Rente (Audit C04)", () => {
  it("nimmt die Eingabe ohne Angabe als netto", () => {
    const r = berechneRentenluecke(basis(), heute);
    expect(r.abzuege_gesetzliche_rente_percent).toBe(0);
    expect(r.einnahmen_monatlich).toBe(1500);
  });

  it("zieht Kranken-, Pflegeversicherung und Steuer ab", () => {
    // Die Renteninformation der DRV ist brutto - 1.500 EUR brutto sind bei
    // 12 % Abzuegen 1.320 EUR netto, und die Luecke waechst entsprechend.
    const r = berechneRentenluecke(
      basis({ abzuege_gesetzliche_rente_percent: 12 }),
      heute
    );
    expect(r.einnahmen_monatlich).toBe(1320);
    expect(r.monthly_gap).toBe(3000 - 1320);
    const ohne = berechneRentenluecke(basis(), heute);
    expect(r.monthly_savings_needed).toBeGreaterThan(ohne.monthly_savings_needed);
  });

  it("laesst nur sinnvolle Abzuege zu", () => {
    expect(
      berechneRentenluecke(basis({ abzuege_gesetzliche_rente_percent: -5 }), heute)
        .abzuege_gesetzliche_rente_percent
    ).toBe(0);
    expect(
      berechneRentenluecke(basis({ abzuege_gesetzliche_rente_percent: 150 }), heute)
        .abzuege_gesetzliche_rente_percent
    ).toBe(100);
  });

  it("betrifft nur die gesetzliche Rente", () => {
    const r = berechneRentenluecke(
      basis({
        expected_statutory_pension: 1000,
        occupational_pension_bav: 500,
        abzuege_gesetzliche_rente_percent: 20,
      }),
      heute
    );
    // 1.000 x 0,8 + 500 = 1.300
    expect(r.einnahmen_monatlich).toBe(1300);
  });
});

describe("Später entstehende Lücke (Audit E01)", () => {
  /**
   * Der Fall aus der Nachprüfung: Heute reichen die festen Einnahmen, in
   * wenigen Jahren nicht mehr. Die Rechnung meldete "gedeckt" und null
   * Kapitalbedarf, weil sie am Rentenbeginn abbrach.
   */
  const spaetereLuecke = (over: Partial<RentenlueckeEingabe> = {}) =>
    berechneRentenluecke(
      basis({
        birth_year: 1959,
        retirement_age: 67,
        withdrawal_end_age: 90,
        desired_monthly_income: 2000,
        expected_statutory_pension: 2100,
        occupational_pension_bav: 0,
        existing_capital: 0,
        assumed_annual_return: 4,
        inflation_percent: 2,
        einnahmen_basis: "rentenbeginn",
        ...over,
      }),
      new Date(2026, 9, 26)
    );

  it("meldet den Kapitalbedarf, obwohl die Lücke bei Rentenbeginn null ist", () => {
    const r = spaetereLuecke();
    expect(r.gap_already_covered).toBe(false);
    expect(r.monthly_gap_at_retirement).toBe(0);
    // Unabhängige monatliche Gegenrechnung: rund 64.394 €
    expect(r.capital_needed_at_retirement).toBeGreaterThan(64_000);
    expect(r.capital_needed_at_retirement).toBeLessThan(64_800);
    // Der Rentenbeginn ist hier schon erreicht - zu sparen ist nichts mehr,
    // das Kapital muesste bereits da sein. Genau diese Lage soll der Rechner
    // benennen, statt "gedeckt" zu melden.
    expect(r.retirement_reached).toBe(true);
    expect(r.additional_capital_needed).toBeGreaterThan(64_000);
  });

  it("sagt, ab welchem Alter die Lücke auftritt", () => {
    const r = spaetereLuecke();
    // 2.000 € x 1,02^t übersteigt 2.100 € nach gut zweieinhalb Jahren
    expect(r.luecke_ab_alter).toBeGreaterThan(69);
    expect(r.luecke_ab_alter).toBeLessThan(70);
  });

  it("bleibt gedeckt, wenn die Einnahmen dauerhaft reichen", () => {
    // Ohne Inflation wächst der Bedarf nicht - dann gibt es wirklich nichts
    // zu schließen.
    const ohneTeuerung = spaetereLuecke({ inflation_percent: 0 });
    expect(ohneTeuerung.gap_already_covered).toBe(true);
    expect(ohneTeuerung.capital_needed_at_retirement).toBe(0);
    expect(ohneTeuerung.luecke_ab_alter).toBeUndefined();

    // Und auch mit Teuerung, wenn der Abstand groß genug ist
    const reichlich = spaetereLuecke({ expected_statutory_pension: 6000 });
    expect(reichlich.gap_already_covered).toBe(true);
    expect(reichlich.luecke_ab_alter).toBeUndefined();
  });

  it("nennt bei sofortiger Lücke den Rentenbeginn", () => {
    const r = spaetereLuecke({ expected_statutory_pension: 1000 });
    expect(r.gap_already_covered).toBe(false);
    // Der erste Monat der Entnahme, also unmittelbar zum Rentenbeginn
    expect(r.luecke_ab_alter).toBeCloseTo(67 + 1 / 12, 6);
  });

  it("lässt die Konvention 'heute' unberührt", () => {
    // Dort ist die Frage am Rentenbeginn entschieden, weil die Einnahmen
    // mitwachsen: Wer heute genug hat, hat auch später genug.
    const r = berechneRentenluecke(
      basis({
        desired_monthly_income: 2000,
        expected_statutory_pension: 2100,
        einnahmen_basis: "heute",
      }),
      heute
    );
    expect(r.gap_already_covered).toBe(true);
    expect(r.capital_needed_at_retirement).toBe(0);
  });
});
