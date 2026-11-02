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
 * Feste Kennungen, damit die Blöcke aufeinander zeigen können.
 *
 * Ohne sie stehen Betreiber, Webseite und Produkt als drei unverbundene
 * Angaben da, und eine Suchmaschine muss raten, dass es um dieselbe Sache
 * geht. Mit `@id` ist es eine Aussage statt einer Vermutung.
 */
const ID_ORGANISATION = `${BASIS}/#organisation`;
const ID_WEBSEITE = `${BASIS}/#webseite`;

/**
 * Der Betreiber.
 *
 * Google empfiehlt `Organization` ausdrücklich auf der Startseite („We
 * recommend placing this information on your home page […] You don't need to
 * include it on every page of your site", Stand der Seite 2026) – deshalb
 * steht es hier und nicht in `seitenkoepfe.ts`, das die strukturierten Daten
 * aus den Kopien bewusst entfernt.
 *
 * Pflichtangaben gibt es keine; die Seite nennt nur Empfehlungen. Aufgenommen
 * ist, was im Impressum ohnehin öffentlich steht und zur Unterscheidung
 * beiträgt: Name, Rechtsform, Anschrift, Kontakt, Bildmarke.
 *
 * Bewusst ohne Straße: Es ist die Wohnanschrift einer Einzelunternehmerin.
 * Im Impressum muss sie nach § 5 DDG stehen, für die Zuordnung in der Suche
 * genügt Ort und Land. Eine Entscheidung gegen die Empfehlung, die Anschrift
 * vollständig anzugeben – mit Absicht, nicht aus Versehen.
 *
 * `aggregateRating` fehlt und bleibt weg: Es gibt keine erhobenen Bewertungen,
 * und selbst vergebene Sterne sind nach Googles Review-Richtlinie („self-serving
 * reviews") ohnehin nicht zulässig.
 */
function organisation() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ID_ORGANISATION,
    name: "Vorsorgewaage",
    legalName: "Luisa Brandt",
    url: `${BASIS}/`,
    logo: `${BASIS}/email-logo.png`,
    email: "info@vorsorgewaage.de",
    address: {
      "@type": "PostalAddress",
      postalCode: "30453",
      addressLocality: "Hannover",
      addressCountry: "DE",
    },
    // „Beratungssoftware", wie im Title und in `webseite()` — hier stand noch
    // „Vergleichssoftware". Ein Assistent, der beide Blöcke liest, bekäme sonst
    // zwei Auskünfte darüber, was das Produkt ist. Siehe docs/benennung-startseite.md.
    description:
      "Einzelunternehmen aus Hannover, Anbieter der Beratungssoftware " +
      "Vorsorgewaage für Finanz- und Versicherungsberater.",
  };
}

/**
 * Die Webseite selbst.
 *
 * Das ist der einzige Block hier mit echten Pflichtangaben: Googles Seite zu
 * Website-Namen verlangt `name` und `url` und schreibt vor, dass das Markup
 * auf der Startseite liegt („The `WebSite` structured data must be on the home
 * page of the site"). Es entscheidet darüber, welcher Name über den Treffern
 * steht – bisher musste Google ihn aus dem Title raten, der mit
 * „Vorsorgewaage – Professionelle Analysen für Finanzberater" länger ist als
 * der Name.
 *
 * `alternateName` nennt die zweite Schreibweise, die Leute eintippen. Kein
 * `potentialAction`/`SearchAction`: Das Suchfeld in den Treffern zeigt Google
 * seit Ende 2024 nicht mehr an.
 */
function webseite() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": ID_WEBSEITE,
    name: "Vorsorgewaage",
    alternateName: "vorsorgewaage.de",
    url: `${BASIS}/`,
    inLanguage: "de-DE",
    publisher: { "@id": ID_ORGANISATION },
  };
}

/**
 * Das Produkt selbst.
 *
 * `SoftwareApplication` mit zwei Angeboten statt `Product`: Es ist eine
 * Webanwendung mit Abonnement, kein Gegenstand. `offers` nennt beide
 * Zahlweisen; die Beträge sind Endpreise (Kleinunternehmer, § 19 UStG),
 * deshalb ohne gesonderte Steuerangabe.
 *
 * Als Rich Result kann das nicht erscheinen: Google verlangt dafür neben
 * `name` und `offers.price` zwingend `aggregateRating` oder `review`, und beides
 * gibt es hier nicht. Erfinden wäre ein Verstoß gegen die Richtlinie zu
 * selbst vergebenen Bewertungen. Der Block beschreibt also das Produkt für
 * das Verständnis der Seite, nicht für einen Sternchen-Treffer.
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
    publisher: { "@id": ID_ORGANISATION },
    description:
      "Beratungssoftware für Altersvorsorge, für Finanz- und " +
      "Versicherungsberater: Fondspolice gegen Depot, Altersvorsorgedepot, " +
      "Rentenlücke und Entnahmeplan – mit sichtbaren Annahmen und dauerhaft " +
      "nachlesbaren Fassungen.",
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

/**
 * Die häufigen Fragen, wortgleich mit dem sichtbaren Abschnitt.
 *
 * Wirkung in der Google-Suche: keine mehr. Google hat die FAQ-Darstellung zum
 * 07.05.2026 abgeschaltet und die Dokumentation dazu am 15.06.2026 entfernt
 * („The FAQ rich result feature is no longer shown in Google Search results").
 * Vorher war sie schon auf behördliche und medizinische Seiten begrenzt, eine
 * Beraterplattform wäre also nie in Frage gekommen.
 *
 * Bleibt trotzdem stehen: Der Block ist gültiges schema.org, kostet rund zwei
 * Kilobyte und wird auch von anderen Lesern als Google ausgewertet. Entfernen
 * ist eine inhaltliche Entscheidung, kein Fehler, den man still korrigiert.
 */
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

/** Alle Blöcke als fertige Script-Elemente für die HTML-Datei. */
export function strukturierteDatenHtml(): string {
  return [organisation(), webseite(), anwendung(), fragen()]
    .map(
      (daten) =>
        `    <script type="application/ld+json">${JSON.stringify(daten)}</script>`
    )
    .join("\n");
}
