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

export const MODELL_VERSION = "2026-10-27b" as const;

export const MODELL_HISTORIE: { version: string; aenderung: string }[] = [
  {
    version: "2026-10-27b",
    aenderung:
      "Altersvorsorgedepot, Todesfall: Zwei Annahmen sind jetzt Angaben. " +
      "Beantragte, aber noch nicht gutgeschriebene Zulagen werden nicht mehr " +
      "zurueckgefordert - sie stecken nicht im ausgezahlten Vermoegen " +
      "(§ 93 Abs. 1 S. 1 EStG); in der Auszahlphase aendert sich nichts, dort " +
      "sind die Nachzuegler gebucht. Und die garantierte Restrente wird mit " +
      "dem Steuersatz der Hinterbliebenen gerechnet, nicht mit dem des " +
      "Verstorbenen; ohne Angabe bleibt es beim Satz des Sparers, dann aber " +
      "als ausgewiesene Annahme. Der Krankenversicherungsabzug des Sparers " +
      "faellt fuer die Hinterbliebenen weg, ihr eigener ist nicht abgebildet.",
  },
  {
    version: "2026-10-27",
    aenderung:
      "Drei Fehler der Nachpruefung vom 26.10.2026. Rentenluecke: Bei festen " +
      "Einnahmen zum Rentenbeginn entscheidet jetzt der ganze " +
      "Entnahmehorizont darueber, ob eine Luecke besteht - vorher brach die " +
      "Rechnung am Rentenbeginn ab und meldete \"gedeckt\", obwohl der " +
      "steigende Bedarf die festen Einnahmen wenige Jahre spaeter uebersteigt " +
      "(im geprueften Fall 64.394 EUR Kapitalbedarf statt null). Das Alter, " +
      "ab dem die Luecke auftritt, steht jetzt in Ergebnis und Oberflaeche. " +
      "Todesfall: Das freie Depot rechnet mit dem vollen steuerlichen " +
      "Einstand einschliesslich der ueber die Vorabpauschale versteuerten " +
      "Betraege (§ 19 Abs. 1 InvStG) - sonst wurde derselbe Gewinn zweimal " +
      "belastet. Und die anteilige Rueckforderung bezieht sich auf das " +
      "gesamte Kapital zum Auszahlungsbeginn: Nach einer planmaessigen " +
      "Teilentnahme von 30 Prozent bleiben 70 Prozent der Foerderung im Raum, " +
      "vorher die ganze.",
  },
  {
    version: "2026-10-26e",
    aenderung:
      "Rentenluecke: Der Geldwert der Einnahmen ist jetzt eine Angabe und " +
      "keine stille Annahme. Bisher galt immer heutige Kaufkraft - die " +
      "Einnahmen stiegen also mit der Inflation. Wer feste Zusagen zum " +
      "Rentenbeginn eintrug, bekam eine Luecke zu einer anderen Annahme. " +
      "Neu waehlbar: fester Betrag zum Rentenbeginn; dann wird nur der Bedarf " +
      "hochgerechnet, und das Zielkapital traegt die im Ruhestand wachsende " +
      "Luecke. Dazu ein Feld fuer Abzuege auf die gesetzliche Rente (Steuer " +
      "und KV/PV), weil die Renteninformation der DRV brutto ausweist. " +
      "Vorgaben unveraendert: heutige Kaufkraft, keine Abzuege - gespeicherte " +
      "Faelle rechnen damit Zahl fuer Zahl wie bisher.",
  },
  {
    version: "2026-10-26d",
    aenderung:
      "BestAdvice: Der Wechsel kostet jetzt auch Steuer. Der Rueckkauf eines " +
      "Bestandsvertrags ist steuerpflichtig (§ 20 Abs. 1 Nr. 6 EStG), und " +
      "dabei zaehlt das heutige Alter - nicht das Alter bei Auszahlung. " +
      "Vorher wanderte der Rueckkaufswert abzueglich der Wechselkosten " +
      "ungeschmaelert in die Fonds-LV, waehrend die Ablaufsteuer bei " +
      "Fortfuehrung gerechnet wurde; der Wechsel stand damit um die " +
      "Kuendigungssteuer zu gut da. Die Oberflaeche zeigt den Weg vom " +
      "Rueckkaufswert zum Startkapital offen und laesst sich auf einen " +
      "bereits bekannten Netto-Auszahlungsbetrag umschalten.",
  },
  {
    version: "2026-10-26c",
    aenderung:
      "BestAdvice: Bestandsvertraege tragen jetzt ihre eigene Vertragsart und " +
      "ihr Abschlussjahr. Die 15-%-Teilfreistellung gilt nur noch fuer " +
      "fondsgebundene Policen (§ 20 Abs. 1 Nr. 6 S. 9 EStG) - eine klassische " +
      "Kapitallebensversicherung hat keine Investmentertraege. Und die " +
      "beguenstigte Altersgrenze liegt erst bei Vertraegen ab 2012 bei 62, " +
      "davor bei 60 (§ 52 Abs. 28 S. 7 EStG). Vorher galt pauschal " +
      "fondsgebunden und 62: Ein klassischer Vertrag wurde zu niedrig " +
      "besteuert, ein Altvertrag mit Auszahlung vor 62 zu hoch. Gespeicherte " +
      "Faelle ohne das neue Merkmal werden weiter als Fondspolice gerechnet, " +
      "damit Kennzahlen und Kurve zusammenpassen.",
  },
  {
    version: "2026-10-26b",
    aenderung:
      "Altersvorsorgedepot: neuer Abschnitt zum Todesfall. Fuer drei eingebbare " +
      "Alter wird gezeigt, was den Hinterbliebenen bleibt - getrennt nach " +
      "Uebertragung auf einen Vertrag des Ehegatten (foerderunschaedlich) und " +
      "Auszahlung an sonstige Erben (Rueckforderung der Foerderung nach " +
      "§ 93 Abs. 1 EStG und Steuer auf die Ertraege). Gespeicherte Auswertungen " +
      "tragen die drei Szenarien und eine Kurve ueber alle Alter. Die " +
      "bisherigen Rechenwege und Kennzahlen bleiben unveraendert. " +
      "Ausserdem endet die Kinderzulage jetzt mit dem Kindergeld: Je Kind " +
      "laesst sich das letzte Jahr mit Kindergeldfestsetzung eintragen " +
      "(§ 85 EStG). Vorher rechnete die Prognose dieselbe Kinderzahl bis zum " +
      "Rentenbeginn weiter. Ohne Angabe bleibt es dabei - dann weist der " +
      "Rechner die Annahme aber aus.",
  },
  {
    version: "2026-10-26",
    aenderung:
      "Altersvorsorgedepot: Der Aufteilungsvorschlag bleibt bei einem Budget " +
      "mit Centbeträgen im Rahmen. Vorher wurde der Betrag zuerst auf das " +
      "Budget begrenzt und danach auf ganze Euro gerundet - bei 29,80 € " +
      "Budget empfahl der Rechner 30 € und für den zweiten Vertrag blieben " +
      "-0,20 €. Dasselbe galt für die Spanne gleichwertiger Aufteilungen. " +
      "Rentenlücke: Gespeicherte Auswertungen tragen zusätzlich die " +
      "verwendete Teuerung; die Rechenwege bleiben unverändert.",
  },
  {
    version: "2026-10-05c",
    aenderung:
      "BestAdvice: Die Verlaufskurve der Bestandsverträge rechnet jeden Vertrag " +
      "einzeln mit seinem eigenen Vertragsbeginn und seiner eigenen " +
      "Steuerfreiheit, statt alle zusammenzufassen. Die Kennzahlen taten das " +
      "schon; bei unterschiedlichen Verträgen wich die Kurve davon ab. " +
      "Gespeicherte Auswertungen tragen dafür die Eingaben je Vertrag.",
  },
  {
    version: "2026-10-05b",
    aenderung:
      "Altersvorsorgedepot: Die Entnahme des Vergleichs heißt jetzt nach ihrem " +
      "Produkt (freies Depot) statt allgemein „Vergleich“. Gespeicherte " +
      "Auswertungen tragen zusätzlich den Aufteilungsvorschlag samt Spanne, " +
      "Toleranz und Zielgröße. Die Rechenwege bleiben unverändert.",
  },
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
