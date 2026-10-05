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
  // Auszahlphase des Altersvorsorgedepots
  auszahlform: 'Auszahlform',
  monatsrente_brutto: 'Monatsrente brutto',
  monatsrente_netto: 'Monatsrente netto',
  auszahlung_steuer_monat: 'Steuer je Monat',
  auszahlung_kv_monat: 'KV/PV je Monat',
  teilkapital: 'Teilkapital',
  teilkapital_steuer: 'Steuer auf das Teilkapital',
  gesetzliche_mindestrate: 'Gesetzliche Mindestrate',
  vergleich_monatsentnahme_netto: 'Vergleich: Entnahme netto',
  vergleich_name: 'Vergleich mit',
  // Eingabefelder des Altersvorsorgedepots
  geburtsjahr: 'Geburtsjahr',
  beitragsjahrStart: 'Erstes Beitragsjahr',
  auszahlungsbeginnAlter: 'Auszahlung ab Alter',
  auszahlplanEndalter: 'Auszahlplan bis Alter',
  berechtigung: 'Zulageberechtigung',
  splitting: 'Zusammenveranlagung',
  kinder: 'Kinder',
  ehegatteMittelbarBerechtigt: 'Ehegatte mittelbar berechtigt',
  eigenbeitragEhegatteUnmittelbar: 'Eigenbeitrag des Ehegatten',
  eigenbeitragMonatlich: 'Eigenbeitrag monatlich',
  beitragsdynamikPaJahr: 'Beitragsdynamik p. a.',
  zvEJahr: 'Zu versteuerndes Einkommen',
  kirchensteuersatz: 'Kirchensteuersatz',
  soliBeruecksichtigen: 'Solidaritätszuschlag',
  steuersatzImAlter: 'Steuersatz im Alter',
  effektivkostenPaJahr: 'Effektivkosten p. a.',
  fixkostenProJahr: 'Fixkosten pro Jahr',
  renditeBruttoPaJahr: 'Rendite brutto p. a.',
  teilkapitalAnteil: 'Teilkapitalanteil',
  rentenfaktorProZehntausend: 'Rentenfaktor je 10.000 €',
  kvStatusImAlter: 'Krankenversicherung im Alter',
  vergleichspartner: 'Vergleich mit',
  depotKostenPaJahr: 'Depotkosten p. a.',
  vergleichsmodus: 'Vergleichsbasis',
  sparerpauschbetrag: 'Sparerpauschbetrag',
  inflationPaJahr: 'Inflation p. a.',
  zulagenZuflussVerzoegerungJahre: 'Zulagen fließen verzögert zu (Jahre)',
  erstattungReinvestieren: 'Erstattung wieder anlegen',
  zweitvertrag: 'Zweiter Vertrag',
  // Eingabefelder der uebrigen Rechner
  contract_duration_years: 'Laufzeit',
  monthly_contribution: 'Monatlicher Beitrag',
  assumed_annual_return: 'Angenommene Rendite p. a.',
  lump_sum: 'Einmalanlage',
  birth_year: 'Geburtsjahr',
  depot_costs_annual: 'Depotkosten p. a.',
  lv_cost_type: 'Kostenangabe der Police',
  dynamik_percent: 'Beitragsdynamik',
  current_age: 'Alter heute',
  end_age: 'Endalter',
  start_age: 'Beginn-Alter',
  retirement_age: 'Rentenbeginn',
  depleted_at_age: 'Kapital aufgebraucht mit',
  withdrawal_start_age: 'Entnahme ab Alter',
  withdrawal_end_age: 'Entnahme bis Alter',
  years_to_retirement: 'Jahre bis zum Rentenbeginn',
  entnahmemonate: 'Entnahmedauer',
  monthly_gap: 'Monatliche Lücke',
  monthly_gap_at_retirement: 'Lücke bei Rentenbeginn',
  capital_needed_at_retirement: 'Benötigtes Kapital',
  monthly_savings_needed: 'Notwendige Sparrate',
  additional_capital_needed: 'Zusätzlich nötiges Kapital',
  future_value_of_existing: 'Vorhandenes Kapital bei Rentenbeginn',
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
  /**
   * Weitere Zeitangaben derselben Reihe, etwa das Alter neben dem Jahr. Sie
   * gehoeren in die Tabelle, aber nicht ins Diagramm und schon gar nicht in
   * eine Euro-Formatierung.
   */
  zeitspalten: string[];
  /**
   * Beschriftung einer Linie. Bringt die Fassung eigene Namen mit, gelten
   * diese - sonst die allgemeine Zuordnung.
   */
  beschriften: (schluessel: string) => string;
  /** Was die Reihe darstellt, z. B. "nominal, vor Steuern". */
  hinweis?: string;
  /** Ueberschrift, wenn eine Fassung mehrere Reihenbloecke traegt. */
  titel?: string;
};

/**
 * Form der gespeicherten Reihen.
 *
 * Frueher nur ein Array. Das reichte nicht: Im AVD heisst die zweite Kurve
 * immer `depot`, auch wenn sie eine Fondspolice oder einen Riester-Vertrag
 * abbildet - der allgemeine Renderer schrieb dann "Depot" darueber. Und ob
 * nominal oder real gerechnet wurde, stand nirgends. Die Fassung kann ihre
 * Beschriftungen deshalb mitbringen. Alte Fassungen bleiben lesbar.
 */
type ReihenUmschlag = {
  punkte: unknown;
  beschriftungen?: Record<string, string>;
  hinweis?: string;
  titel?: string;
};

/** Ein Umschlag erkennt sich am Feld `punkte`. */
function istUmschlag(wert: unknown): wert is ReihenUmschlag {
  return (
    !!wert &&
    typeof wert === 'object' &&
    !Array.isArray(wert) &&
    'punkte' in (wert as Record<string, unknown>)
  );
}

function auspacken(reihen: unknown): ReihenUmschlag {
  if (istUmschlag(reihen)) {
    return {
      punkte: reihen.punkte,
      beschriftungen: reihen.beschriftungen,
      hinweis: reihen.hinweis,
      titel: reihen.titel,
    };
  }
  return { punkte: reihen };
}

/**
 * Alle Reihenbloecke einer Fassung.
 *
 * Eine Fassung kann mehrere tragen - im Altersvorsorgedepot etwa den
 * Hauptverlauf und daneben die drei Strategien. Sie in ein Diagramm zu
 * legen waere falsch: Die Strategien rechnen ohne Beitragsdynamik und auf
 * gleichem Bruttobeitrag, der Hauptverlauf folgt den Eingaben. Gemeinsam
 * gezeichnet lassen sie sich nicht auseinanderhalten.
 *
 * Alte Fassungen mit nur einem Array oder einem einzelnen Umschlag bleiben
 * unveraendert lesbar.
 */
export function reihenGruppenLesen(eingabe: unknown): GezeichneteReihen[] {
  if (Array.isArray(eingabe) && eingabe.length > 0 && istUmschlag(eingabe[0])) {
    return eingabe
      .map((u) => reihenLesen(u))
      .filter((r): r is GezeichneteReihen => r !== null);
  }
  const einzeln = reihenLesen(eingabe);
  return einzeln ? [einzeln] : [];
}

/**
 * Die Reihen sehen je Rechner anders aus. Statt sieben Spezialfälle zu pflegen
 * wird die Form gelesen: der erste Zeitschlüssel ist die Achse, jeder weitere
 * Zahlenwert eine Linie.
 */
export function reihenLesen(eingabe: unknown): GezeichneteReihen | null {
  const { punkte: reihen, beschriftungen, hinweis, titel } = auspacken(eingabe);
  if (!Array.isArray(reihen) || reihen.length === 0) return null;
  const erste = reihen[0];
  if (typeof erste !== 'object' || erste === null) return null;

  const schluessel = Object.keys(erste as Record<string, unknown>);
  const achse = schluessel.find((k) => ACHSEN_SCHLUESSEL.includes(k.toLowerCase()));
  if (!achse) return null;

  const istZahl = (k: string) => typeof (erste as Record<string, unknown>)[k] === 'number';
  const istZeit = (k: string) => ACHSEN_SCHLUESSEL.includes(k.toLowerCase());

  // Die Reihen fuehren haeufig Jahr UND Alter. Frueher wurde der zweite
  // Zeitschluessel wie jeder andere Zahlenwert behandelt - also als Kurve
  // gezeichnet und als Euro-Betrag gesetzt ("Alter: 68 EUR"). Zeitangaben
  // sind deshalb von den Linien ausgenommen und stehen nur in der Tabelle.
  const linien = schluessel.filter((k) => k !== achse && !istZeit(k) && istZahl(k));
  const zeitspalten = schluessel.filter((k) => k !== achse && istZeit(k) && istZahl(k));
  if (linien.length === 0) return null;

  return {
    daten: reihen as Record<string, number>[],
    achse,
    linien,
    zeitspalten,
    beschriften: (k) => beschriftungen?.[k] ?? beschriftung(k),
    hinweis,
    titel,
  };
}

/** Zahlenwerte aus `results`, ohne die Felder des Modellstempels. */
export function kennzahlenLesen(
  results: Record<string, unknown>
): [string, number | string][] {
  return Object.entries(results).filter(
    ([schluessel, wert]) =>
      (typeof wert === 'number' || (typeof wert === 'string' && wert !== '')) &&
      !STEMPEL_FELDER.includes(schluessel) &&
      !DOPPELT.includes(schluessel)
  ) as [string, number | string][];
}

/**
 * Nicht jede Zahl ist ein Betrag. Effektivkosten und Renditen stehen als
 * Prozentpunkte in den Ergebnissen; als Euro ausgegeben ergäben sie Unsinn
 * („Effektivkosten 1 €").
 */
export type Einheit =
  | 'euro'
  | 'prozent'
  /** Dezimalanteil (0,005 = 0,5 %). Das AVD-Modul rechnet durchweg so. */
  | 'anteil'
  | 'alter'
  | 'jahre'
  | 'monate'
  /** Kalenderjahr - ohne Tausenderpunkt, sonst steht da "1.985". */
  | 'jahreszahl'
  /** Blanke Anzahl, etwa Kinder. */
  | 'anzahl';

/**
 * Die Einheit laesst sich aus dem Namen nicht zuverlaessig erraten:
 * `monthly_gap`, `monatsbeitrag` und `admin_costs_monthly_eur` tragen alle
 * "month" im Namen und sind doch Betraege, waehrend `entnahmemonate` eine
 * Anzahl ist. Deshalb eine ausdrueckliche Zuordnung; geraten wird nur dort,
 * wo das Muster eindeutig ist.
 */
const EINHEITEN: Record<string, Einheit> = {
  alter: 'alter',
  age: 'alter',
  current_age: 'alter',
  end_age: 'alter',
  start_age: 'alter',
  retirement_age: 'alter',
  depleted_at_age: 'alter',
  withdrawal_start_age: 'alter',
  withdrawal_end_age: 'alter',
  jahr: 'jahre',
  jahre: 'jahre',
  year: 'jahre',
  years: 'jahre',
  years_to_retirement: 'jahre',
  contract_duration_years: 'jahre',
  laufzeit_jahre: 'jahre',
  monat: 'monate',
  monate: 'monate',
  month: 'monate',
  months: 'monate',
  entnahmemonate: 'monate',
  // Kalenderjahre
  geburtsjahr: 'jahreszahl',
  birth_year: 'jahreszahl',
  beitragsjahrStart: 'jahreszahl',
  // Altersangaben des AVD-Moduls
  auszahlungsbeginnAlter: 'alter',
  auszahlplanEndalter: 'alter',
  alterBeiAuszahlung: 'alter',
  alter_heute: 'alter',
  retirement_age_input: 'alter',
  // Anzahlen, keine Betraege
  kinder: 'anzahl',
  kinderGeborenVor2008: 'anzahl',
  kinderGeborenAb2008: 'anzahl',
  zulagenZuflussVerzoegerungJahre: 'jahre',
  // Dezimalanteile des AVD-Moduls (0,005 = 0,5 %)
  effektivkostenPaJahr: 'anteil',
  renditeBruttoPaJahr: 'anteil',
  depotKostenPaJahr: 'anteil',
  inflationPaJahr: 'anteil',
  beitragsdynamikPaJahr: 'anteil',
  kirchensteuersatz: 'anteil',
  steuersatzImAlter: 'anteil',
  teilkapitalAnteil: 'anteil',
  terPaJahr: 'anteil',
};

export function einheitFuer(schluessel: string): Einheit {
  const bekannt = EINHEITEN[schluessel];
  if (bekannt) return bekannt;
  if (/_percent$|rendite|quote$/i.test(schluessel)) return 'prozent';
  // Das AVD-Modul fuehrt alle Saetze als Dezimalanteil und benennt sie
  // einheitlich auf "...PaJahr" oder "...satz".
  if (/PaJahr$|satz$/.test(schluessel)) return 'anteil';
  return 'euro';
}

export function istProzent(schluessel: string): boolean {
  return einheitFuer(schluessel) === 'prozent';
}

const zahl = (wert: number, nachkomma = 0) =>
  wert.toLocaleString('de-DE', {
    minimumFractionDigits: nachkomma,
    maximumFractionDigits: nachkomma,
  });

/**
 * Eine Kennzahl so setzen, wie ihre Einheit es verlangt. Eine Stelle fuer
 * Fassungsansicht und Verlaufsfeld, sonst steht dieselbe Zahl an zwei Orten
 * verschieden da.
 */
export function formatiereKennzahl(schluessel: string, wert: number | string): string {
  // Textwerte sind Auswahlen, keine Betraege - etwa der Name des
  // Vergleichspartners. Der lag bisher im Datensatz und wurde nie gezeigt.
  if (typeof wert === 'string') return wertText(wert);
  switch (einheitFuer(schluessel)) {
    case 'prozent':
      return `${zahl(wert, 2)} %`;
    case 'alter':
      return `${zahl(wert)} Jahre`;
    case 'jahre':
      return wert === 1 ? '1 Jahr' : `${zahl(wert)} Jahre`;
    case 'anteil':
      return `${zahl(wert * 100, 2)} %`;
    case 'monate':
      return wert === 1 ? '1 Monat' : `${zahl(wert)} Monate`;
    case 'jahreszahl':
      return String(Math.round(wert));
    case 'anzahl':
      return zahl(wert);
    default:
      return `${zahl(wert)} €`;
  }
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
  'monatsrente_netto',
  'monatsrente_brutto',
  'vergleich_monatsentnahme_netto',
  'teilkapital',
];

export function sortiereKennzahlen(
  eintraege: [string, number | string][]
): [string, number | string][] {
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

/**
 * Auswahlwerte, wie sie in der Datenbank stehen, in Beratungssprache. Ohne
 * das stuende in der Fassung "auszahlplan" oder "pflicht".
 */
const WERTE: Record<string, string> = {
  auszahlplan: 'Auszahlplan',
  leibrente: 'Leibrente',
  unmittelbar: 'unmittelbar zulageberechtigt',
  mittelbar: 'mittelbar zulageberechtigt',
  keine: 'nicht zulageberechtigt',
  pflicht: 'pflichtversichert',
  freiwillig: 'freiwillig versichert',
  privat: 'privat versichert',
  depot: 'freies Depot',
  fonds_lv: 'Fondspolice',
  riester_alt: 'Riester-Bestandsvertrag',
  gleicher_nettoaufwand: 'gleicher Netto-Aufwand',
  gleicher_bruttobeitrag: 'gleicher Bruttobeitrag',
  eur: 'tatsächliche Kosten (€)',
  prozent: 'Effektivkosten (%)',
  net: 'nach Steuern',
  gross: 'vor Steuern',
};

/** Ein gespeicherter Auswahlwert, lesbar gemacht. */
export function wertText(wert: string): string {
  return WERTE[wert] ?? wert;
}

/**
 * Die gespeicherten Eingaben einer Fassung, lesbar aufbereitet.
 *
 * Ohne sie zeigt die Fassung ein Ergebnis, aber nicht, womit gerechnet
 * wurde - und genau das macht einen Beratungsstand nachvollziehbar.
 *
 * Verschachteltes (Fondslisten, Bestandsvertraege) bleibt aussen vor: Es
 * sinnvoll darzustellen setzt Kenntnis des jeweiligen Rechners voraus, und
 * eine rohe JSON-Zeile vor einem Kunden waere schlimmer als nichts.
 */
export function eingabenLesen(form: unknown): [string, string][] {
  if (!form || typeof form !== 'object') return [];
  const eintraege: [string, string][] = [];
  for (const [schluessel, wert] of Object.entries(form as Record<string, unknown>)) {
    if (wert === null || wert === undefined || wert === '') continue;
    if (typeof wert === 'boolean') {
      eintraege.push([schluessel, wert ? 'ja' : 'nein']);
    } else if (typeof wert === 'number') {
      eintraege.push([schluessel, formatiereKennzahl(schluessel, wert)]);
    } else if (typeof wert === 'string') {
      eintraege.push([schluessel, wertText(wert)]);
    }
  }
  return eintraege.sort((a, b) => beschriftung(a[0]).localeCompare(beschriftung(b[0]), 'de'));
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
