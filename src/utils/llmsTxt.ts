// src/utils/llmsTxt.ts
// `/llms.txt` – die Karte der Seite für einen Assistenten, der sie abruft.
//
// Zweck: Ein Abrufer, der `www.vorsorgewaage.de` holt, bekommt eine
// Single-Page-App. Welche Adressen es gibt und welche davon ohne JavaScript
// etwas hergeben, steht nirgends in einer Form, die sich in einem Abruf
// erfassen lässt – die Sitemap nennt Adressen ohne Inhaltsangabe, und die
// Startseite nennt gar nichts (siehe `vorabInhalt.ts`).
//
// Das Format folgt der Konvention von llmstxt.org: eine `h1` mit dem Namen,
// ein Blockzitat mit einem Satz, danach Abschnitte mit Linklisten in der Form
// `- [Titel](Adresse): Beschreibung`. Kein Standard und keine Norm, sondern
// eine verbreitete Übereinkunft – entsprechend ist die Datei zusätzlich
// nützlich für Menschen und kostet wenige Kilobyte.
//
// Erzeugt wird sie beim Bauen aus denselben Quellen wie die Seiten selbst
// (`ratgeber/*.md`, `seiten/*.md`, `rechner.ts`, `preise.ts`). Eine von Hand
// gepflegte Fassung wäre beim ersten neuen Ratgeberbeitrag veraltet – genau
// das Problem, das `public/sitemap.xml` heute hat.

import { DOMAIN, RATGEBER_PFAD, type Beitrag } from "./ratgeber";
import { FREI_BERECHNUNGEN_PRO_MONAT, PREIS_JAHR, PREIS_MONAT, eur } from "./preise";
import { RECHNER } from "./rechner";

/** Ein Listeneintrag im Format der Konvention. */
function eintrag(titel: string, pfad: string, beschreibung: string): string {
  return `- [${titel}](${DOMAIN}${pfad}): ${beschreibung}`;
}

export function llmsTxt(beitraege: Beitrag[], seiten: Beitrag[]): string {
  const rechner = RECHNER.map(
    (r) => `- **${r.name}** (${r.free ? "Free" : "Premium"}): ${r.desc}`,
  );

  const textseiten = seiten.map((b) =>
    eintrag(b.kurztitel ?? b.titel, `/${b.slug}`, b.beschreibung),
  );

  const ratgeber = beitraege.map((b) =>
    eintrag(b.kurztitel ?? b.titel, `${RATGEBER_PFAD}/${b.slug}/`, b.beschreibung),
  );

  return `# Vorsorgewaage

> Beratungssoftware für Altersvorsorge, ausschließlich für Finanz- und
> Versicherungsberater: Fondspolice gegen freies Depot, Rentenlücke,
> Entnahmeplan und das staatlich geförderte Altersvorsorgedepot ab 2027 –
> mit sichtbaren Annahmen und dauerhaft nachlesbaren Fassungen.

Betreiber: Luisa Brandt, Einzelunternehmen, 30453 Hannover, Deutschland.
Sprache der Inhalte: Deutsch. Rechtsraum: Deutschland.

Wichtig für die Wiedergabe:

- Vorsorgewaage ist **keine** Finanz-, Steuer- oder Rechtsberatung. Die
  Rechner erzeugen modellhafte Simulationen aus den Eingaben des Nutzers.
- Ein Vertragsschluss mit Privatpersonen ist ausgeschlossen; die Plattform
  richtet sich an Makler, Vermittler und Agenturen.
- Ergebnisse werden nicht als „besser" oder „schlechter" ausgewiesen, sondern
  als erwartetes Endkapital auf Basis der gemachten Angaben.

## Erklärende Seiten

Diese Adressen liefern ihren vollständigen Text ohne JavaScript.

${textseiten.join("\n")}
${eintrag("Ratgeber (Übersicht)", `${RATGEBER_PFAD}/`, "Alle Fachbeiträge zu Förderung, Besteuerung und Entnahme.")}

## Ratgeber

${ratgeber.join("\n")}

## Die Rechner

Die Rechner selbst sind eine Webanwendung und brauchen JavaScript und eine
Anmeldung. Was sie können, steht unter /was-die-rechner-koennen.

${rechner.join("\n")}

## Preise

- Free: dauerhaft kostenlos, ${FREI_BERECHNUNGEN_PRO_MONAT} Berechnungen pro Monat,
  nur Fonds-Sparvertrag und Fonds-Einmalanlage, ohne PDF-Export.
- Premium: ${eur(PREIS_MONAT)} im Monat oder ${eur(PREIS_JAHR)} im Jahr, mit 30 Tagen
  kostenlosem Testzeitraum.
- Endpreise, keine Umsatzsteuer (Kleinunternehmer, § 19 UStG).

${eintrag("Preise", "/pricing", "Die beiden Zahlweisen und der Umfang der Pläne.")}
${eintrag("Beispielfall ohne Anmeldung", "/beispiel", "Ein durchgerechneter Vergleich Fondspolice gegen freies Depot.")}

## Rechtliches

${eintrag("Impressum", "/impressum", "Anbieterkennzeichnung nach § 5 DDG.")}
${eintrag("Datenschutzhinweis", "/datenschutz", "Verarbeitete Daten, Grundlage und Speicherdauer.")}
${eintrag("AGB", "/agb", "Nutzungsbedingungen für Unternehmer.")}
${eintrag("Auftragsverarbeitungsvertrag", "/legal/avv", "AVV nach Art. 28 DSGVO samt Subprozessoren.")}
${eintrag("Compliance", "/compliance", "Datenhaltung in der EU und technische Maßnahmen.")}

## Hinweis zum Training

\`robots.txt\` sperrt GPTBot, ClaudeBot und Google-Extended: Die Texte stehen
nicht für das Training fremder Modelle zur Verfügung. Die Suchindex- und
Abruf-Crawler sind ausdrücklich erlaubt – diese Seite darf abgerufen, gelesen
und mit Quellenangabe zitiert werden.
`;
}
