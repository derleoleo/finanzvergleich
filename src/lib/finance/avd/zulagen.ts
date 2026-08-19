// src/lib/finance/avd/zulagen.ts
// Zulagenberechnung und Günstigerprüfung für das Altersvorsorgedepot
// (Beitragsjahre ab 2027) sowie die alte Riester-Förderung (Bestandsverträge
// bis 2026) für den Wechselvergleich.

import { GESETZ, RECHTS_FLAGS_DEFAULT, type RechtsFlags } from './config';
import { steuerentlastung, type SteuerZuschlaege } from './tarif';

export type Berechtigung = 'unmittelbar' | 'mittelbar' | 'keine';

export type ZulagenEingabe = {
  /** Eigenbeitrag des Zulageberechtigten im Beitragsjahr (§ 82 EStG, ohne Zulagen). */
  eigenbeitrag: number;
  /** Nur bei mittelbarer Berechtigung: Eigenbeitrag des unmittelbar berechtigten Ehegatten. */
  eigenbeitragEhegatteUnmittelbar?: number;
  /** Kinder, für die dem Berechtigten die Kinderzulage zugeordnet ist. */
  kinder?: number;
  alterZuBeitragsjahresbeginn?: number;
  bebBereitsGenutzt?: boolean;
  berechtigung?: Berechtigung;
  flags?: RechtsFlags;
};

export type ZulagenErgebnis = {
  grundzulage: number;
  berufseinsteigerbonus: number;
  kinderzulage: number;
  zulageGesamt: number;
  mindestbeitragErfuellt: boolean;
  /** Bemessungsgrundlage der Zulagen (bei mittelbar: Beitrag des Ehegatten). */
  bemessungsgrundlage: number;
};

/**
 * Zulagen nach neuem Recht (§§ 84, 85, 86 EStG n.F.).
 *
 * Grund- und Kinderzulage greifen auf denselben Eigenbeitrag zu; es gibt keine
 * Aufteilungsregel. Bei 300 € Beitrag und 2 Kindern sind das 750 € Zulage
 * (Förderquote 250 %) – gewollt laut Gesetzesbegründung.
 */
export function berechneZulagen(p: ZulagenEingabe): ZulagenErgebnis {
  const flags = p.flags ?? RECHTS_FLAGS_DEFAULT;
  const berechtigung = p.berechtigung ?? 'unmittelbar';
  const eigenbeitrag = Math.max(0, Number(p.eigenbeitrag) || 0);
  const kinder = Math.max(0, Math.floor(Number(p.kinder) || 0));

  const leer: ZulagenErgebnis = {
    grundzulage: 0,
    berufseinsteigerbonus: 0,
    kinderzulage: 0,
    zulageGesamt: 0,
    mindestbeitragErfuellt: false,
    bemessungsgrundlage: 0,
  };

  if (berechtigung === 'keine') return leer;

  // § 86 EStG n.F. bzw. § 79 S. 2 Nr. 4: harte Schwelle, keine anteilige Kürzung
  const schwelle =
    berechtigung === 'mittelbar'
      ? GESETZ.MITTELBAR_MINDESTBEITRAG
      : GESETZ.MINDESTEIGENBEITRAG;
  if (eigenbeitrag < schwelle) return leer;

  // Bemessungsgrundlage: bei mittelbar Berechtigten die Beiträge des
  // unmittelbar berechtigten Ehegatten (§ 84 S. 4, § 85 Abs. 1 S. 2)
  const basis =
    berechtigung === 'mittelbar'
      ? Math.max(0, Number(p.eigenbeitragEhegatteUnmittelbar) || 0)
      : eigenbeitrag;
  const basisGefoerdert = Math.min(basis, GESETZ.GZ_STUFE2_GRENZE);

  let grundzulage =
    GESETZ.GZ_STUFE1_SATZ * Math.min(basis, GESETZ.GZ_STUFE1_GRENZE) +
    GESETZ.GZ_STUFE2_SATZ * Math.max(0, basisGefoerdert - GESETZ.GZ_STUFE1_GRENZE);
  if (berechtigung === 'mittelbar') {
    grundzulage = Math.min(grundzulage, GESETZ.GZ_MAX_MITTELBAR);
  }

  // § 84 S. 2: Berufseinsteigerbonus nur für unmittelbar Berechtigte (§ 79 S. 1)
  const berufseinsteigerbonus =
    berechtigung === 'unmittelbar' &&
    (p.alterZuBeitragsjahresbeginn ?? 99) < GESETZ.BEB_ALTERSGRENZE &&
    !p.bebBereitsGenutzt
      ? GESETZ.BEB_BETRAG
      : 0;

  // § 85 Abs. 1 S. 1. Auslegung offen, siehe RechtsFlags:
  // - unabhängig (Default, Wortlaut): jedes Kind bemisst sich auf den vollen Beitrag
  // - alternativ: der Beitrag wird durch die Kinder "verbraucht"
  const kinderzulage = flags.kinderzulageProKindUnabhaengig
    ? kinder * Math.min(GESETZ.KZ_MAX_PRO_KIND, GESETZ.KZ_SATZ * basisGefoerdert)
    : Math.min(
        kinder * GESETZ.KZ_MAX_PRO_KIND,
        GESETZ.KZ_SATZ * basisGefoerdert
      );

  return {
    grundzulage,
    berufseinsteigerbonus,
    kinderzulage,
    zulageGesamt: grundzulage + berufseinsteigerbonus + kinderzulage,
    mindestbeitragErfuellt: true,
    bemessungsgrundlage: basis,
  };
}

export type GuenstigerEingabe = {
  eigenbeitrag: number;
  zulageGesamt: number;
  /**
   * Der Sonderausgabenabzug nach § 10a Abs. 1 EStG setzt die Förderberechtigung
   * voraus. Ohne sie gibt es weder Zulage noch Abzug. Default: berechtigt.
   */
  berechtigung?: Berechtigung;
  /** Nur Grundzulage + BEB – nötig, wenn die Kinderzulage das SA-Volumen nicht erhöht. */
  zulageOhneKinder?: number;
  zvE: number;
  splitting?: boolean;
  /** § 10a Abs. 3 S. 2–4 n.F.: +120 € Höchstbetrag, wenn ein Ehegatte mittelbar berechtigt ist. */
  ehegatteMittelbarBerechtigt?: boolean;
  zuschlaege?: SteuerZuschlaege;
  flags?: RechtsFlags;
};

export type GuenstigerErgebnis = {
  /** Sonderausgaben-Volumen nach § 10a Abs. 1 S. 1 n.F. */
  sonderausgabenVolumen: number;
  /** Tarifliche Entlastung durch den Sonderausgabenabzug. */
  steuerentlastung: number;
  /** Tatsächlich ausgezahlte zusätzliche Erstattung: max(0, Entlastung − Zulage). */
  zusaetzlicheErstattung: number;
  ergebnis: 'zulage' | 'sonderausgabenabzug';
  /** Zulage (fließt in den Vertrag) + Erstattung (fließt dem Sparer zu). */
  gesamtfoerderung: number;
  foerderquote: number;
};

/**
 * Sonderausgabenabzug und Günstigerprüfung (§ 10a Abs. 1, 2 EStG n.F.).
 * Von Amts wegen: Ist die tarifliche Entlastung höher als der Zulagenanspruch,
 * wird der Sonderausgabenabzug gewährt und die ESt um den Zulagenanspruch
 * erhöht – ausgezahlt wird nur die Differenz.
 */
export function guenstigerpruefung(p: GuenstigerEingabe): GuenstigerErgebnis {
  const flags = p.flags ?? RECHTS_FLAGS_DEFAULT;
  const eigenbeitrag = Math.max(0, Number(p.eigenbeitrag) || 0);
  const zulage = Math.max(0, Number(p.zulageGesamt) || 0);

  // Der Sonderausgabenabzug steht nur unmittelbar Berechtigten zu. Beim
  // mittelbar Berechtigten (Par. 79 S. 2) laeuft der Abzug ueber den
  // unmittelbar berechtigten Ehegatten (Par. 10a Abs. 3 S. 2-4) - dort werden
  // die Beitraege und Zulagen beider Ehegatten beruecksichtigt.
  if ((p.berechtigung ?? 'unmittelbar') !== 'unmittelbar') {
    // Die Zulage selbst fliesst weiterhin in den Vertrag, nur der eigene
    // Sonderausgabenabzug entfaellt.
    return {
      sonderausgabenVolumen: 0,
      steuerentlastung: 0,
      zusaetzlicheErstattung: 0,
      ergebnis: 'zulage',
      gesamtfoerderung: zulage,
      foerderquote: eigenbeitrag > 0 ? zulage / eigenbeitrag : 0,
    };
  }

  const hoechstbetrag =
    GESETZ.GEFOERDERTER_EIGENBEITRAG_MAX +
    (p.ehegatteMittelbarBerechtigt ? GESETZ.SA_ERHOEHUNG_EHEGATTEN : 0);

  // Zulagenanteil, der das SA-Volumen erhöht (§ 10a Abs. 1 S. 1:
  // "1.800 Euro zuzüglich der zustehenden Zulage")
  const zulageImVolumen = flags.kinderzulageErhoehtSaVolumen
    ? zulage
    : Math.max(0, Number(p.zulageOhneKinder ?? zulage) || 0);

  const sonderausgabenVolumen = Math.min(eigenbeitrag, hoechstbetrag) + zulageImVolumen;

  const entlastung = steuerentlastung(
    p.zvE,
    sonderausgabenVolumen,
    p.splitting ?? false,
    p.zuschlaege ?? {}
  );

  const zusaetzlicheErstattung = Math.max(0, entlastung - zulage);
  const gesamtfoerderung = zulage + zusaetzlicheErstattung;

  return {
    sonderausgabenVolumen,
    steuerentlastung: entlastung,
    zusaetzlicheErstattung,
    ergebnis: entlastung > zulage ? 'sonderausgabenabzug' : 'zulage',
    gesamtfoerderung,
    foerderquote: eigenbeitrag > 0 ? gesamtfoerderung / eigenbeitrag : 0,
  };
}

/**
 * Förderoptimaler Eigenbeitrag: Ab hier bringt jeder weitere Euro keine
 * Grenzförderung mehr (§ 10a Abs. 1 – über 1.800 € gibt es keine Förderung).
 * Mit Kindern reichen bereits 300 € für die volle Kinderzulage.
 */
export function foerderoptimalerBeitrag(kinder: number): {
  vollGefoerdert: number;
  kinderzulageVoll: number;
  grenzeGrundzulageStufe1: number;
} {
  return {
    vollGefoerdert: GESETZ.GZ_STUFE2_GRENZE,
    kinderzulageVoll: kinder > 0 ? GESETZ.KZ_MAX_PRO_KIND : 0,
    grenzeGrundzulageStufe1: GESETZ.GZ_STUFE1_GRENZE,
  };
}

// ---------------------------------------------------------------------------
// Alte Riester-Förderung (Bestandsverträge, §§ 84, 85, 86 EStG a.F.)
// Wird für den Wechselvergleich benötigt: Anders als neu gibt es hier eine
// anteilige Kürzung statt einer harten Schwelle, dafür einen Sockelbetrag.
// ---------------------------------------------------------------------------

export const RIESTER_ALT = {
  GRUNDZULAGE: 175,
  BEB_BETRAG: 200,
  KZ_AB_2008: 300,
  KZ_VOR_2008: 185,
  SOCKELBETRAG: 60,
  MEB_SATZ: 0.04,
  MEB_MAX: 2100,
  SA_HOECHSTBETRAG: 2100,
} as const;

export type RiesterAltEingabe = {
  eigenbeitrag: number;
  beitragspflEinnahmenVorjahr: number;
  kinderGeborenAb2008?: number;
  kinderGeborenVor2008?: number;
  alterZuBeitragsjahresbeginn?: number;
  bebBereitsGenutzt?: boolean;
};

export type RiesterAltErgebnis = {
  zulagenanspruch: number;
  mindesteigenbeitrag: number;
  /** Anteilig gekürzt, wenn der Eigenbeitrag den Mindesteigenbeitrag unterschreitet. */
  zulage: number;
  sonderausgabenVolumen: number;
};

export function berechneZulagenRiesterAlt(p: RiesterAltEingabe): RiesterAltErgebnis {
  const eigenbeitrag = Math.max(0, Number(p.eigenbeitrag) || 0);
  const kAb = Math.max(0, Math.floor(Number(p.kinderGeborenAb2008) || 0));
  const kVor = Math.max(0, Math.floor(Number(p.kinderGeborenVor2008) || 0));

  const zulagenanspruch =
    RIESTER_ALT.GRUNDZULAGE +
    ((p.alterZuBeitragsjahresbeginn ?? 99) < 25 && !p.bebBereitsGenutzt
      ? RIESTER_ALT.BEB_BETRAG
      : 0) +
    RIESTER_ALT.KZ_AB_2008 * kAb +
    RIESTER_ALT.KZ_VOR_2008 * kVor;

  // § 86 Abs. 1 a.F.: 4 % der beitragspflichtigen Einnahmen des Vorjahres,
  // gedeckelt bei 2.100 €, abzüglich Zulagenanspruch, mindestens Sockelbetrag
  const mindesteigenbeitrag = Math.max(
    RIESTER_ALT.SOCKELBETRAG,
    Math.min(
      RIESTER_ALT.MEB_MAX,
      RIESTER_ALT.MEB_SATZ * Math.max(0, Number(p.beitragspflEinnahmenVorjahr) || 0)
    ) - zulagenanspruch
  );

  const zulage =
    zulagenanspruch * Math.min(1, mindesteigenbeitrag > 0 ? eigenbeitrag / mindesteigenbeitrag : 1);

  // § 10a Abs. 1 a.F.: Höchstbetrag INKLUSIVE Zulagenanspruch (nicht zuzüglich)
  const sonderausgabenVolumen = Math.min(
    eigenbeitrag + zulagenanspruch,
    RIESTER_ALT.SA_HOECHSTBETRAG
  );

  return { zulagenanspruch, mindesteigenbeitrag, zulage, sonderausgabenVolumen };
}
