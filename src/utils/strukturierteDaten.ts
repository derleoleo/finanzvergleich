// src/utils/strukturierteDaten.ts
// Strukturierte Daten (JSON-LD) für die öffentliche Startseite.
//
// Warum nicht als React-Element: Diese Anwendung ist eine Single-Page-App ohne
// Server-Rendering. Was React einhängt, sieht ein Crawler erst, wenn er die
// Seite ausführt – darauf sollte man sich für Rich Results nicht verlassen.
// Deshalb wird das hier beim Bauen in die ausgelieferte `index.html`
// geschrieben (siehe `vite.config.ts`, `strukturierteDatenPlugin`).
//
// Die Inhalte kommen aus denselben Modulen wie die sichtbare Seite: FAQ aus
// `faq.ts`, Preise aus `preise.ts`. Damit kann die Suchmaschine nichts
// anzeigen, was auf der Seite nicht steht.

import { FAQ } from "./faq";
import { PREIS_JAHR, PREIS_MONAT } from "./preise";

const BASIS = "https://www.vorsorgewaage.de";

/**
 * Das Produkt selbst.
 *
 * `SoftwareApplication` mit zwei Angeboten statt `Product`: Es ist eine
 * Webanwendung mit Abonnement, kein Gegenstand. `offers` nennt beide
 * Zahlweisen; die Beträge sind Endpreise (Kleinunternehmer, § 19 UStG),
 * deshalb ohne gesonderte Steuerangabe.
 */
function anwendung() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Vorsorgewaage",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: BASIS,
    inLanguage: "de-DE",
    description:
      "Vergleichssoftware für Finanz- und Versicherungsberater: Fondspolice " +
      "gegen Depot, Altersvorsorgedepot, Rentenlücke und Entnahmeplan – mit " +
      "sichtbaren Annahmen und dauerhaft nachlesbaren Fassungen.",
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Finanz- und Versicherungsberater",
    },
    offers: [
      {
        "@type": "Offer",
        name: "Premium monatlich",
        price: PREIS_MONAT,
        priceCurrency: "EUR",
        url: `${BASIS}/pricing`,
        availability: "https://schema.org/InStock",
      },
      {
        "@type": "Offer",
        name: "Premium jährlich",
        price: PREIS_JAHR,
        priceCurrency: "EUR",
        url: `${BASIS}/pricing`,
        availability: "https://schema.org/InStock",
      },
    ],
  };
}

/** Die häufigen Fragen, wortgleich mit dem sichtbaren Abschnitt. */
function fragen() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((eintrag) => ({
      "@type": "Question",
      name: eintrag.q,
      acceptedAnswer: { "@type": "Answer", text: eintrag.a },
    })),
  };
}

/** Beide Blöcke als fertige Script-Elemente für die HTML-Datei. */
export function strukturierteDatenHtml(): string {
  return [anwendung(), fragen()]
    .map(
      (daten) =>
        `    <script type="application/ld+json">${JSON.stringify(daten)}</script>`
    )
    .join("\n");
}
