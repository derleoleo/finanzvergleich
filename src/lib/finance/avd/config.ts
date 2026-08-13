// src/lib/finance/avd/config.ts
// Gesetzlich fixierte Konstanten und Modellannahmen für das Altersvorsorgedepot.
// Rechtsstand: Altersvorsorgereformgesetz, BGBl. 2026 I Nr. 156 v. 29.05.2026,
// Förderregeln anwendbar ab Beitragsjahr 2027.
//
// Konvention: Was hier als GESETZ_* steht, ist normfixiert (Norm im Kommentar).
// Was in ANNAHMEN oder RECHTS_FLAGS steht, ist Modellannahme bzw. noch nicht
// amtlich geklärt und muss in der UI als solche kenntlich sein.

/** Normfixierte Werte der neuen Förderung (ab Beitragsjahr 2027). */
export const GESETZ = {
  ERSTES_BEITRAGSJAHR: 2027,

  MINDESTEIGENBEITRAG: 120, // § 86 EStG n.F. – harte Schwelle, keine anteilige Kürzung
  GZ_STUFE1_GRENZE: 360, // § 84 S. 1 Nr. 1
  GZ_STUFE1_SATZ: 0.5,
  GZ_STUFE2_GRENZE: 1800, // § 84 S. 1 Nr. 2
  GZ_STUFE2_SATZ: 0.25,
  GZ_MAX: 540,
  BEB_BETRAG: 200, // § 84 S. 2 – einmalig
  BEB_ALTERSGRENZE: 25,
  KZ_SATZ: 1.0, // § 85 Abs. 1 S. 1 (Fassung Finanzausschuss)
  KZ_MAX_PRO_KIND: 300,
  GZ_MAX_MITTELBAR: 175, // § 84 S. 3
  MITTELBAR_MINDESTBEITRAG: 120, // § 79 S. 2 Nr. 4 n.F. (vorher 60 €)

  GEFOERDERTER_EIGENBEITRAG_MAX: 1800, // § 10a Abs. 1 S. 1
  SA_ERHOEHUNG_EHEGATTEN: 120, // § 10a Abs. 3 S. 2–4 n.F. (vorher 60 €)
  EINZAHLUNG_MAX: 6840, // § 1 Abs. 1 S. 1 Nr. 5 AltZertG n.F.
  MAX_NEUE_VERTRAEGE: 2, // § 82 Abs. 5 EStG n.F.

  AUSZAHLUNG_ALTER_MIN: 65, // § 1 Abs. 1 S. 1 Nr. 2a AltZertG n.F.
  AUSZAHLUNG_ALTER_MAX: 70,
  AUSZAHLPLAN_ENDALTER_MIN: 85, // § 1 Abs. 1 S. 1 Nr. 4b aa
  AUSZAHLPLAN_MINDESTRATE_FAKTOR: 0.8,
  TEILKAPITAL_MAX_ANTEIL: 0.3, // § 1 Abs. 1 S. 1 Nr. 4
  EFFEKTIVKOSTEN_DECKEL_STANDARDDEPOT: 0.01, // § 2a Abs. 2 AltZertG – NUR Standarddepot

  WERBUNGSKOSTEN_PAUSCHBETRAG_RENTE: 102, // § 9a S. 1 Nr. 3 EStG
  KLEINBETRAGSRENTE_ANTEIL_BEZUGSGROESSE: 0.015, // § 93 Abs. 3 EStG n.F. (seit 30.05.2026)
  BEZUGSGROESSE_MONAT_2026: 3955, // § 18 SGB IV, SVBezGrV 2026 (bundeseinheitlich)
} as const;

/** Freies Depot – Vergleichsseite (§ 20 EStG, InvStG). */
export const DEPOT_STEUER = {
  ABGELTUNGSTEUER: 0.25,
  SOLI_ZUSCHLAG: 0.055, // fällt auf Kapitalerträge immer an (keine Freigrenze)
  TEILFREISTELLUNG_AKTIENFONDS: 0.3, // § 20 InvStG
  VORABPAUSCHALE_FAKTOR: 0.7, // § 18 Abs. 1 InvStG
} as const;

/**
 * Basiszins für die Vorabpauschale (§ 18 Abs. 4 InvStG), jährlicher BMF-Wert.
 * Bewusst als Lookup, nicht als Konstante – ändert sich jedes Jahr.
 */
const BASISZINS: Record<number, number> = {
  2025: 0.0253,
  2026: 0.032, // BMF-Schreiben v. 13.01.2026
};
const BASISZINS_FALLBACK = 0.032;

export function basiszinsFuer(jahr: number): number {
  return BASISZINS[jahr] ?? BASISZINS_FALLBACK;
}

/**
 * Ertragsanteile für Leibrenten nach § 22 Nr. 1 S. 3 Buchst. a bb EStG,
 * maßgeblich für den UNGEFÖRDERTEN Vertragsteil (Alter bei Rentenbeginn).
 */
const ERTRAGSANTEIL: Record<number, number> = {
  60: 0.22, 61: 0.22, 62: 0.21, 63: 0.2, 64: 0.19, 65: 0.18, 66: 0.18,
  67: 0.17, 68: 0.16, 69: 0.15, 70: 0.15, 71: 0.14, 72: 0.13, 73: 0.13,
  74: 0.12, 75: 0.11,
};

export function ertragsanteilFuer(alter: number): number {
  const a = Math.round(alter);
  if (a <= 60) return 0.22;
  if (a >= 75) return 0.11;
  return ERTRAGSANTEIL[a] ?? 0.17;
}

/**
 * Punkte, die zum Rechtsstand 13.08.2026 nicht amtlich geklärt sind.
 * Das BMF-Anwendungsschreiben zum AltVRefG stand noch aus. Jeder Wert hier
 * muss in der UI als Annahme sichtbar sein.
 */
export type RechtsFlags = {
  /**
   * § 85 Abs. 1 S. 1 wörtlich: je Kind volle Bemessung auf den Eigenbeitrag,
   * gedeckelt bei 300 €. Kein Beitragsverbrauch durch vorherige Kinder.
   */
  kinderzulageProKindUnabhaengig: boolean;
  /**
   * Erhöht die Kinderzulage das Sonderausgaben-Volumen (§ 10a Abs. 1 S. 1:
   * „1.800 Euro zuzüglich der zustehenden Zulage")? Der Gesetzeswortlaut
   * spricht dafür; die BMF-FAQ nennt als Höchstbetrag nur 2.340 € und damit
   * den kinderlosen Fall. Bei false wird bei 1.800 + Grundzulage gedeckelt.
   */
  kinderzulageErhoehtSaVolumen: boolean;
  /** Besteuerung des ungeförderten Vertragsteils in der Auszahlphase. */
  ungefoerderterTeilBesteuerung: 'ertragsanteil' | 'halbeinkuenfte';
};

export const RECHTS_FLAGS_DEFAULT: RechtsFlags = {
  kinderzulageProKindUnabhaengig: true,
  kinderzulageErhoehtSaVolumen: true, // Gesetzeswortlaut
  ungefoerderterTeilBesteuerung: 'ertragsanteil', // BMF-FAQ-Wortlaut
};

/** Reine Modellannahmen (keine Rechtsfragen), zentral änderbar. */
export const ANNAHMEN = {
  RENDITE_BRUTTO: 0.07,
  INFLATION: 0.02,
  STEUERSATZ_IM_ALTER: 0.22,
  ZULAGEN_ZUFLUSS_VERZOEGERUNG_JAHRE: 1 as 0 | 1 | 2,
  RENTENFAKTOR_PRO_10K: 30, // €/Monat je 10.000 € Kapital
  /**
   * Sparerpauschbetrag im Vergleichsdepot. Default 0: Es ist nicht bekannt,
   * ob der Kunde ihn bereits anderweitig (Zinsen, Festgeld, andere Depots)
   * ausgeschöpft hat – konservativ zulasten des Depots, konsistent mit der
   * übrigen Steuerlogik der App.
   */
  SPARERPAUSCHBETRAG: 0,
  KV_BEITRAGSSATZ_FREIWILLIG: 0.12, // KV+PV auf Versorgungsbezüge, grobe Näherung
} as const;
