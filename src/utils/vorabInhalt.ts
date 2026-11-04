// src/utils/vorabInhalt.ts
// Was eine React-Adresse ausliefert, bevor JavaScript läuft.
//
// Der Befund, gemessen am ausgelieferten HTML: Von den 18 Adressen der
// Sitemap liefern neun einen **vollständig leeren** Rumpf. `/` und
// `/beispiel` gaben null Wörter her; der gesamte Text entstand erst beim
// Ausführen der Anwendung. Die elf gebauten Seiten (Ratgeber und `seiten/`)
// liefern dagegen 1.300 bis 2.600 Wörter sofort.
//
// Für Google ist das verkraftbar – der Crawler führt JavaScript aus. Für
// agentisches Browsen nicht: Die Abrufer der Assistenten holen eine Adresse,
// weil ein Mensch gerade danach gefragt hat, und sie rendern nicht. Wer einem
// Assistenten `www.vorsorgewaage.de` nennt, bekommt damit eine Seite
// vorgelesen, auf der nichts steht – während `robots.txt` diese Abrufer
// ausdrücklich hereinlässt (siehe `docs/ki-crawler-entscheidung.md`). Die Tür
// steht offen und der Raum ist leer.
//
// Dasselbe Problem wurde für „Was ist Vorsorgewaage?" schon einmal
// entschieden: Die Seite lag als React-Seite vor, „gemessen am ausgelieferten
// HTML standen darin null Woerter" (`ratgeberPlugin` in `vite.config.ts`), und
// wurde auf eine gebaute HTML-Datei umgestellt. Für die Rechner geht dieser
// Weg nicht – sie *sind* die Anwendung. Also der kleinere Schritt: ein
// `<noscript>` mit dem, was die Seite sagt, und mit Wegen zu den Seiten, die
// vollständig ausgeliefert werden.
//
// Warum `<noscript>` und nicht Inhalt in `<div id="root">`: React ersetzt den
// Inhalt des Behälters beim Einhängen. Ein Besucher sähe den Vorabtext also
// bei jedem Aufruf kurz aufblitzen und wieder verschwinden – eine Änderung an
// der Ansicht, und zwar auf jeder Seite. `<noscript>` ändert daran nichts.
//
// Was hier NICHT hineingehört: Text, der auf der Seite selbst nicht steht.
// Ein Abrufer, dem etwas anderes vorgelesen wird als einem Besucher, ist
// schlimmer als einer, der nichts findet. Deshalb kommt alles aus denselben
// Modulen wie die sichtbare Seite: Rechner aus `rechner.ts`, Fragen aus
// `faq.ts`, Preise aus `preise.ts`.

import { FAQ } from "./faq";
import {
  FREI_BERECHNUNGEN_PRO_MONAT,
  KLEINUNTERNEHMER_HINWEIS,
  PREIS_JAHR,
  PREIS_MONAT,
  eur,
} from "./preise";
import { RECHNER } from "./rechner";

/** Zeichen, die in Text und Attributen nichts verloren haben. */
function sicher(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Die Seiten, die ohne JavaScript vollständig lesbar sind.
 *
 * Der eigentliche Zweck des Vorabtexts. Ein Assistent, der auf `/` landet,
 * findet hier die Adressen, auf denen die Antwort wirklich steht – statt auf
 * einer leeren Anwendungsseite stehen zu bleiben.
 */
const WEGE: { pfad: string; text: string }[] = [
  { pfad: "/was-ist-vorsorgewaage", text: "Was Vorsorgewaage ist, für wen sie gedacht ist und was sie nicht leistet" },
  { pfad: "/was-die-rechner-koennen", text: "Was die Rechner können: Handhabung und Funktionen, Rechner für Rechner" },
  { pfad: "/ratgeber/", text: "Ratgeber: Fachbeiträge zu Förderung, Besteuerung und Entnahme" },
];

/** Überschrift aus dem Title: der Zusatz „– Vorsorgewaage" gehört nicht hinein. */
function ueberschrift(titel: string): string {
  return titel.replace(/\s*[–-]\s*Vorsorgewaage\s*$/, "");
}

/** Die sechs Rechner als Liste, mit Kennzeichnung des kostenlosen Plans. */
function rechnerliste(): string {
  const zeilen = RECHNER.map((r) => {
    const plan = r.free ? "Free" : "Premium";
    return `<li><strong>${sicher(r.name)}</strong> (${plan}): ${sicher(r.desc)}</li>`;
  });
  return `<h2>Die sechs Rechner</h2>\n<ul>\n${zeilen.join("\n")}\n</ul>`;
}

/** Die Preise, wörtlich aus derselben Quelle wie Preisseite und Landingpage. */
function preisliste(): string {
  return [
    "<h2>Preise</h2>",
    "<ul>",
    `<li><strong>Free:</strong> dauerhaft kostenlos, ${FREI_BERECHNUNGEN_PRO_MONAT} Berechnungen pro Monat, ` +
      "nur Fonds-Sparvertrag und Fonds-Einmalanlage, kein PDF-Export.</li>",
    `<li><strong>Premium:</strong> ${eur(PREIS_MONAT)} im Monat oder ${eur(PREIS_JAHR)} im Jahr, ` +
      "mit 30 Tagen kostenlosem Testzeitraum.</li>",
    "</ul>",
    `<p>${sicher(KLEINUNTERNEHMER_HINWEIS)}.</p>`,
  ].join("\n");
}

/** Die häufigen Fragen, wortgleich mit dem sichtbaren Abschnitt. */
function fragenliste(): string {
  const eintraege = FAQ.map(
    (f) => `<h3>${sicher(f.q)}</h3>\n<p>${sicher(f.a)}</p>`,
  );
  return `<h2>Häufige Fragen</h2>\n${eintraege.join("\n")}`;
}

/**
 * Was über die Beschreibung hinaus auf der Adresse steht.
 *
 * Nur dort gefüllt, wo es echten Inhalt gibt. Die Rechtstexte stehen bewusst
 * nicht hier: Eine Zusammenfassung, die neben dem verbindlichen Text eine
 * zweite Fassung aufmacht, schafft mehr Probleme als sie löst.
 */
const ZUSATZ: Record<string, () => string> = {
  "/": () => [rechnerliste(), preisliste(), fragenliste()].join("\n"),
  "/pricing": () => preisliste(),
  "/beispiel": () =>
    "<p>Ein vollständig durchgerechneter Vergleich, ohne Anmeldung aufrufbar: " +
    "monatliche Sparrate in eine Fondspolice gegen dieselbe Rate in ein freies " +
    "Depot, mit Abschluss- und Verwaltungskosten, Fondskosten, Besteuerung der " +
    "Auszahlung und Modellstempel. Gerechnet wird im Browser des Besuchers; " +
    "ohne JavaScript entsteht die Tabelle nicht.</p>",
};

/**
 * Der Vorabtext einer Adresse.
 *
 * `titel` und `beschreibung` kommen von der Stelle, die auch den Kopf setzt –
 * `index.html` für die Startseite, `SEITENKOEPFE` für die übrigen Adressen.
 * Dieses Modul kennt sie deshalb nicht und importiert `seitenkoepfe.ts` nicht.
 */
export function vorabHtml(pfad: string, titel: string, beschreibung: string): string {
  const zusatz = ZUSATZ[pfad]?.() ?? "";
  const wege = WEGE.filter((w) => w.pfad !== pfad)
    .map((w) => `<li><a href="${w.pfad}">${sicher(w.text)}</a></li>`)
    .join("\n");

  const teile = [
    `<h1>${sicher(ueberschrift(titel))}</h1>`,
    `<p>${sicher(beschreibung)}</p>`,
    zusatz,
    "<h2>Ohne JavaScript vollständig lesbar</h2>",
    `<ul>\n${wege}\n</ul>`,
    "<p>Der übrige Inhalt dieser Adresse ist eine Webanwendung und entsteht " +
      "erst, wenn JavaScript ausgeführt wird.</p>",
  ].filter(Boolean);

  return `<noscript>\n${teile.join("\n")}\n</noscript>`;
}

/**
 * Setzt den Vorabtext in eine gebaute HTML-Datei.
 *
 * Beim ersten Mal hinter `<div id="root"></div>`, danach ersetzend – so kann
 * `seitenkoepfe.ts` aus der fertigen Startseiten-Datei Kopien mit eigenem
 * Vorabtext ziehen, ohne dass sich zwei Blöcke stapeln.
 */
export function vorabSetzen(html: string, block: string): string {
  if (/<noscript>[\s\S]*?<\/noscript>/.test(html)) {
    return html.replace(/<noscript>[\s\S]*?<\/noscript>/, block);
  }
  return html.replace(
    '<div id="root"></div>',
    `<div id="root"></div>\n    ${block}`,
  );
}
