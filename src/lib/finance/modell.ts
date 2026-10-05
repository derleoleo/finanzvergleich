// Stempel für gespeicherte Berechnungen: Mit welchem Rechenmodell und zu
// welchem Stichtag wurde gerechnet?
//
// Warum: Ergebnisse werden gespeichert, die Grafik wird beim Öffnen aber neu
// gezeichnet. Ändert sich das Modell (z. B. Effektivkosten als Renditeminderung
// statt Bestandsgebühr) oder der Kalender (Alter aus Geburtsjahr), passen
// gespeicherte und neu gerechnete Werte sonst unbemerkt nicht mehr zusammen.
//
// Regel: Bei jeder Änderung, die Ergebnisse verschiebt, MODELL_VERSION erhöhen
// und eine Zeile in MODELL_HISTORIE ergänzen.

export const MODELL_VERSION = "2026-10-05" as const;

export const MODELL_HISTORIE: { version: string; aenderung: string }[] = [
  {
    version: "2026-10-05",
    aenderung:
      "Altersvorsorgedepot: Gespeicherte Auswertungen tragen zusätzlich die " +
      "Ergebnisse der Auszahlphase (Monatsrente brutto und netto, Steuer und " +
      "KV/PV je Monat, Teilkapital samt Steuer, gesetzliche Mindestrate) sowie " +
      "die Verläufe der drei Strategien. Die Rechenwege bleiben unverändert.",
  },
  {
    version: "2026-10-04",
    aenderung:
      "Entnahmeplan: Liegen Beginn und Ende auf demselben Alter, folgt die " +
      "einzige Planperiode der gewählten Entnahme. Vorher wurde dort " +
      "unabhängig von der Einstellung das gesamte Kapital ausgezahlt.",
  },
  {
    version: "2026-10-03",
    aenderung:
      "Depot-Auszahlplan: Entnahme nachschüssig wie die zugrunde liegende " +
      "Annuitätenformel (vorher vorschüssig, dadurch trug das Kapital die " +
      "letzte Rate nicht). Ausgewiesen wird die tatsächlich gezahlte Rate. " +
      "Fondspolice folgt der Beitragsdynamik.",
  },
  {
    version: "2026-10-02",
    aenderung:
      "Altersvorsorgedepot: Fondsgebundene Lebensversicherung als dritter " +
      "Vergleichspartner und Kombinationsstrategie (geförderter Teil ins AVD, " +
      "Rest in Depot oder Police). Gespeicherte Auswertungen tragen zusätzlich " +
      "das Ergebnis der Aufteilung.",
  },
  {
    version: "2026-09-30b",
    aenderung:
      "Effektivkosten werden nicht mehr in einen geschätzten Abschluss- und " +
      "Verwaltungsanteil aufgeteilt. Die Gesamthöhe der Kosten und alle " +
      "Kapitalwerte bleiben unverändert; ausgewiesen wird nur noch, was die " +
      "Eingabe hergibt.",
  },
  {
    version: "2026-09-30",
    aenderung:
      "Altersvorsorgedepot: Die Entnahmen des Vergleichsdepots werden in der " +
      "Auszahlphase besteuert (Abgeltungsteuer auf den realisierten Gewinn je " +
      "Entnahme). Vorher blieben diese Erträge steuerfrei, während die AVD-Rente " +
      "besteuert wurde.",
  },
  {
    version: "2026-09-29d",
    aenderung:
      "Rentenlücke nach erreichtem Rentenbeginn rechnet nur noch die verbleibenden " +
      "Jahre; Entnahmeformel behandelt negative Zinssätze korrekt statt als Nullzins.",
  },
  {
    version: "2026-09-29c",
    aenderung:
      "Altersvorsorgedepot: Vorabpauschale des Vergleichsdepots berücksichtigt " +
      "unterjährige Käufe zeitanteilig (§ 18 Abs. 4 InvStG).",
  },
  {
    version: "2026-09-29b",
    aenderung:
      "BestAdvice: steuerliche Basis aus den bisher eingezahlten Beiträgen statt " +
      "aus dem heutigen Vertragswert, Wechselkosten mindern das übertragene Kapital, " +
      "Break-even-Rendite gegenüber der Garantie ausgewiesen.",
  },
  {
    version: "2026-09-29",
    aenderung:
      "Rentenlücke: Planungshorizont einstellbar (vorher fest Alter 90), Lücke wird " +
      "mit der Inflation auf den Rentenbeginn hochgerechnet und in der Rentenphase " +
      "real verzinst; erreichter Rentenbeginn wird ausgewiesen.",
  },
  {
    version: "2026-09-28",
    aenderung:
      "Effektivkosten wirken als Renditeminderung (vorher Abzug vom Kapital); " +
      "Honorar der Nettopolice mit Zeitwert; AVD-Depotentnahme mit Verzinsung; " +
      "keine Kosten auf negatives Kapital.",
  },
  { version: "vor 2026-09-28", aenderung: "Ausgangsstand ohne Modellstempel." },
];

/** Rechtsstand, auf dem Steuer- und Förderlogik beruhen. */
export const RECHTSSTAND =
  "EStG-Tarif 2026 (§ 32a); Altersvorsorgereformgesetz, BGBl. 2026 I Nr. 156";

export type ModellStempel = {
  /** Version des Rechenmodells zum Zeitpunkt des Speicherns. */
  modell_version: string;
  /** Stichtag der Bewertung (ISO-Datum). */
  bewertet_am: string;
  /** Rechtsstand als Klartext für Auswertungen und PDF. */
  rechtsstand: string;
  /** Alter bei Auszahlung zum Stichtag – sonst wandert es mit dem Kalenderjahr. */
  alter_bei_auszahlung?: number;
};

export function modellStempel(alterBeiAuszahlung?: number): ModellStempel {
  return {
    modell_version: MODELL_VERSION,
    bewertet_am: new Date().toISOString().slice(0, 10),
    rechtsstand: RECHTSSTAND,
    ...(alterBeiAuszahlung !== undefined
      ? { alter_bei_auszahlung: Math.round(alterBeiAuszahlung) }
      : {}),
  };
}

/** True, wenn die Berechnung mit einem anderen Modell erstellt wurde als dem heutigen. */
export function stammtAusAelteremModell(stempel?: Partial<ModellStempel>): boolean {
  return (stempel?.modell_version ?? "") !== MODELL_VERSION;
}

/** Anzeigetext für den Hinweis über abweichende Modellstände. */
export function modellHinweis(stempel?: Partial<ModellStempel>): string {
  const stand = stempel?.bewertet_am
    ? `vom ${new Date(stempel.bewertet_am).toLocaleDateString("de-DE")}`
    : "aus einer früheren Fassung";
  return (
    `Diese Berechnung stammt ${stand} und wurde mit einem älteren Rechenmodell erstellt. ` +
    `Die gespeicherten Werte bleiben unverändert erhalten; Grafik und Tabelle zeichnet die App ` +
    `mit dem aktuellen Modell. Für eine durchgehend aktuelle Auswertung neu berechnen.`
  );
}
