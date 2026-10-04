// Darstellung gespeicherter Fassungen (Audit O08).
//
// Panel und Fassungsansicht lesen dieselben Daten und müssen sie gleich
// benennen – sonst heißt dieselbe Zahl an zwei Stellen verschieden.

/**
 * Die gespeicherten Schlüssel sind Datenbanknamen ohne Umlaute. Generisch
 * umgeformt ergäbe `summe_foerderung` „Summe foerderung" – auf einer
 * Unterlage, die beim Kunden landet, liest sich das schlampig. Deshalb die
 * gängigen Schlüssel ausgeschrieben, alles Übrige über die allgemeine
 * Umformung.
 */
const BESCHRIFTUNGEN: Record<string, string> = {
  endkapital_nach_steuer: 'Endkapital nach Steuern',
  vergleich_nach_steuer: 'Vergleich nach Steuern',
  kombination_nach_steuer: 'Kombination nach Steuern',
  summe_foerderung: 'Förderung gesamt',
  aufteilung_monatlich: 'Aufteilung monatlich',
  life_insurance_net: 'Lebensversicherung netto',
  life_insurance_gross: 'Lebensversicherung brutto',
  depot_net: 'Depot netto',
  depot_gross: 'Depot brutto',
  lv_net: 'Lebensversicherung netto',
  fund_net: 'Fondsdepot netto',
  total_contributions: 'Eingezahlt gesamt',
  li_total_costs: 'Kosten Lebensversicherung',
  depot_total_costs: 'Kosten Depot',
  li_tax: 'Steuer Lebensversicherung',
  depot_tax: 'Steuer Depot',
  start_capital: 'Startkapital',
  annual_withdrawal: 'Entnahme pro Jahr',
  end_capital: 'Restkapital am Ende',
  total_withdrawn: 'Gesamtentnahme',
  brutto_net: 'Bruttopolice nach Steuern',
  netto_net: 'Nettopolice nach Steuern',
  vorteil_nettopolice: 'Unterschied',
  honorar: 'Honorar',
  li_acquisition_costs: 'LV: Abschlusskosten',
  li_admin_costs: 'LV: Verwaltung',
  li_effective_costs: 'LV: Vertragskosten',
  li_fund_costs: 'LV: Fondskosten',
  li_riy_percent: 'LV: Effektivkosten',
  depot_initial_charges: 'Depot: Ausgabeaufschlag',
  depot_depot_costs: 'Depot: Depotkosten',
  depot_fund_costs: 'Depot: Fondskosten',
  depot_riy_percent: 'Depot: Effektivkosten',
  wechselkosten_gesamt: 'Wechselkosten gesamt',
  eingezahlt_bisher_gesamt: 'Bisher eingezahlt',
  break_even_rendite: 'Break-even-Rendite',
  // Reihen
  avd: 'Altersvorsorgedepot',
  depot: 'Depot',
  lv: 'Lebensversicherung',
  eingezahlt: 'Eingezahlt',
  kombination: 'Kombination',
  jahr: 'Jahr',
  alter: 'Alter',
  year: 'Jahr',
  age: 'Alter',
  withdrawal: 'Entnahme',
  growth: 'Wachstum',
  startCapital: 'Startkapital',
  endCapital: 'Restkapital',
  totalWithdrawn: 'Entnommen gesamt',
};

/** `kapitalGesamt` → `Kapital gesamt`, damit Legenden lesbar bleiben. */
export function beschriftung(schluessel: string): string {
  const bekannt = BESCHRIFTUNGEN[schluessel];
  if (bekannt) return bekannt;
  const mitLuecken = schluessel
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return mitLuecken.charAt(0).toUpperCase() + mitLuecken.slice(1);
}

/** Schlüssel, die als Achse taugen – sie beschreiben den Zeitpunkt, nicht den Wert. */
const ACHSEN_SCHLUESSEL = ['jahr', 'year', 'alter', 'age', 'monat', 'month'];

/** Felder des Modellstempels; sie gehören nicht in die Kennzahlen. */
const STEMPEL_FELDER = ['modell_version', 'bewertet_am', 'rechtsstand', 'alter_bei_auszahlung'];

/**
 * Doppelt gespeicherte Werte. `li_admin_costs` und `li_effective_costs` tragen
 * denselben Betrag unter zwei Namen – historisch, weil verschiedene Seiten
 * verschieden lesen (siehe lib/finance/series.ts). In einer Unterlage für den
 * Kunden wäre dieselbe Zahl zweimal mit zwei Beschriftungen ein Ärgernis.
 */
const DOPPELT = ['li_admin_costs'];

export type GezeichneteReihen = {
  daten: Record<string, number>[];
  achse: string;
  linien: string[];
};

/**
 * Die Reihen sehen je Rechner anders aus. Statt sieben Spezialfälle zu pflegen
 * wird die Form gelesen: der erste Zeitschlüssel ist die Achse, jeder weitere
 * Zahlenwert eine Linie.
 */
export function reihenLesen(reihen: unknown): GezeichneteReihen | null {
  if (!Array.isArray(reihen) || reihen.length === 0) return null;
  const erste = reihen[0];
  if (typeof erste !== 'object' || erste === null) return null;

  const schluessel = Object.keys(erste as Record<string, unknown>);
  const achse = schluessel.find((k) => ACHSEN_SCHLUESSEL.includes(k.toLowerCase()));
  if (!achse) return null;

  const linien = schluessel.filter(
    (k) => k !== achse && typeof (erste as Record<string, unknown>)[k] === 'number'
  );
  if (linien.length === 0) return null;

  return { daten: reihen as Record<string, number>[], achse, linien };
}

/** Zahlenwerte aus `results`, ohne die Felder des Modellstempels. */
export function kennzahlenLesen(results: Record<string, unknown>): [string, number][] {
  return Object.entries(results).filter(
    ([schluessel, wert]) =>
      typeof wert === 'number' &&
      !STEMPEL_FELDER.includes(schluessel) &&
      !DOPPELT.includes(schluessel)
  ) as [string, number][];
}

/**
 * Nicht jede Zahl ist ein Betrag. Effektivkosten und Renditen stehen als
 * Prozentpunkte in den Ergebnissen; als Euro ausgegeben ergäben sie Unsinn
 * („Effektivkosten 1 €").
 */
export function istProzent(schluessel: string): boolean {
  return /_percent$|rendite|quote/i.test(schluessel);
}

/**
 * Reihenfolge der Kennzahlen: Erst das Ergebnis, dann die Bestandteile.
 * Unbekannte Schlüssel hängen hinten an, alphabetisch nach Beschriftung.
 */
const VORNE = [
  'endkapital_nach_steuer',
  'vergleich_nach_steuer',
  'kombination_nach_steuer',
  'life_insurance_net',
  'depot_net',
  'lv_net',
  'fund_net',
  'brutto_net',
  'netto_net',
  'vorteil_nettopolice',
  'start_capital',
  'end_capital',
  'total_withdrawn',
  'annual_withdrawal',
  'summe_foerderung',
  'total_contributions',
];

export function sortiereKennzahlen(eintraege: [string, number][]): [string, number][] {
  const rang = (k: string) => {
    const i = VORNE.indexOf(k);
    return i === -1 ? VORNE.length : i;
  };
  return [...eintraege].sort((a, b) => {
    const unterschied = rang(a[0]) - rang(b[0]);
    if (unterschied !== 0) return unterschied;
    return beschriftung(a[0]).localeCompare(beschriftung(b[0]), 'de');
  });
}

/** Datum und Uhrzeit, wie sie in der Oberfläche erscheinen sollen. */
export function zeitpunkt(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
