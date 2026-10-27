// src/utils/seitenkoepfe.ts
// Eigener Kopf für jede öffentliche Adresse der Anwendung.
//
// Das Problem: Die Anwendung ist eine Single-Page-App. Alle Adressen liefern
// dieselbe `index.html` — mit demselben Title, derselben Description und
// einem Canonical, das auf die Startseite zeigt. Für Google heißt das:
// „Diese Adressen sind Dubletten der Startseite." Neun Seiten der Sitemap
// wären damit praktisch nicht indexierbar, darunter ausgerechnet der
// Beispielfall, der die Zielseite für Suche und Anzeigen sein soll.
//
// Die Lösung ist dieselbe wie beim Ratgeber: Beim Bauen entsteht je Adresse
// eine Kopie der gebauten HTML mit richtigem Kopf. Der Rumpf bleibt
// unverändert, die Anwendung startet wie bisher — es ändert sich nur, was ein
// Crawler liest, bevor er JavaScript ausführt.
//
// Warum nicht zur Laufzeit per JavaScript setzen: Dann steht im
// ausgelieferten HTML weiterhin das falsche Canonical, und der Crawler sieht
// zwei widersprüchliche Angaben. Was im Dokument steht, soll stimmen.

import { DOMAIN } from "./ratgeber";

export type Seitenkopf = {
  /** Adresse wie in der Sitemap — ohne abschließenden Schrägstrich. */
  pfad: string;
  titel: string;
  beschreibung: string;
};

/**
 * Die öffentlichen Adressen der Anwendung.
 *
 * Nicht enthalten: die Startseite (ihr Kopf steht in `index.html` und stimmt
 * bereits) und alles hinter der Anmeldung — dort hat ein Crawler nichts zu
 * suchen, und die Sitemap führt es zu Recht nicht.
 */
export const SEITENKOEPFE: Seitenkopf[] = [
  {
    pfad: "/beispiel",
    titel: "Beispielfall: Fondspolice oder Depot? – Vorsorgewaage",
    beschreibung:
      "Ein durchgerechneter Vergleich ohne Anmeldung: 200 € im Monat über 30 Jahre, " +
      "Fondspolice gegen freies Depot — mit Kosten, Steuern und Modellstempel.",
  },
  {
    pfad: "/pricing",
    titel: "Preise – Vorsorgewaage",
    beschreibung:
      "Vorsorgewaage für Finanzberater: 59 € im Monat oder 590 € im Jahr, " +
      "Endpreise ohne Umsatzsteuer (§ 19 UStG). Kostenlos starten mit drei " +
      "Berechnungen pro Monat.",
  },
  {
    pfad: "/impressum",
    titel: "Impressum – Vorsorgewaage",
    beschreibung:
      "Anbieterkennzeichnung nach § 5 DDG: Betreiber, Anschrift, Kontakt und " +
      "zuständige Aufsicht für die Plattform vorsorgewaage.de.",
  },
  {
    pfad: "/datenschutz",
    titel: "Datenschutzhinweis – Vorsorgewaage",
    beschreibung:
      "Welche Daten Vorsorgewaage verarbeitet, auf welcher Grundlage und wie lange — " +
      "einschließlich Reichweitenmessung und Fehlerdiagnose.",
  },
  {
    pfad: "/agb",
    titel: "Allgemeine Geschäftsbedingungen – Vorsorgewaage",
    beschreibung: "Nutzungsbedingungen der Plattform vorsorgewaage.de für Unternehmer.",
  },
  {
    pfad: "/legal/avv",
    titel: "Auftragsverarbeitungsvertrag – Vorsorgewaage",
    beschreibung:
      "AVV nach Art. 28 DSGVO: Gegenstand, Weisungen, technische und " +
      "organisatorische Maßnahmen sowie die eingesetzten Subprozessoren.",
  },
  {
    pfad: "/compliance",
    titel: "Compliance und Subprozessoren – Vorsorgewaage",
    beschreibung:
      "Datenhaltung in der EU, eingesetzte Subprozessoren nach Art. 28 DSGVO, " +
      "technische und organisatorische Maßnahmen.",
  },
];

/** Zeichen, die in einem Attribut nichts verloren haben. */
function sicher(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/**
 * Setzt in einer gebauten `index.html` den Kopf einer Adresse.
 *
 * Ersetzt wird, was eine Dublette ausmacht: Title, Description, Canonical und
 * die Open-Graph-Angaben. Alles andere — Schriftvorladen, Symbole, das
 * Anwendungsbündel — bleibt Zeichen für Zeichen stehen.
 *
 * Die strukturierten Daten fliegen heraus: Sie beschreiben das Produkt und die
 * häufigen Fragen, und das ist die Aufgabe der Startseite. Dieselbe `FAQPage`
 * auf acht Adressen zu wiederholen, hilft niemandem.
 */
export function kopfSetzen(html: string, kopf: Seitenkopf): string {
  const adresse = `${DOMAIN}${kopf.pfad}`;
  const titel = sicher(kopf.titel);
  const beschreibung = sicher(kopf.beschreibung);

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${titel}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${beschreibung}" />`,
    )
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${adresse}" />`,
    )
    .replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${adresse}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${titel}" />`,
    )
    .replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${beschreibung}" />`,
    )
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
}

/**
 * Wohin die Kopien geschrieben werden.
 *
 * Zwei Formen, weil Server verschieden auflösen: Vercel liefert für
 * `/pricing` die Verzeichnisdatei `pricing/index.html`, der Vorschauserver
 * (sirv) sucht dagegen zuerst `pricing.html`. Beide Dateien sind
 * zeichengleich, wenige Kilobyte, und jede Auflösung findet eine davon.
 * Eine falsche Auflösung hiesse: Ausweichen auf die Startseite - und genau
 * deren Canonical war das Problem.
 */
export function dateinamen(pfad: string): string[] {
  const ohne = pfad.replace(/^\//, "");
  return [`${ohne}/index.html`, `${ohne}.html`];
}
