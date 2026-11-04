// src/utils/adressen.ts
// Welche Adressen es gibt – und welche davon ein Crawler nicht sehen soll.
//
// Der Anlass, gemessen an der Live-Seite:
//
//     GET /diese-seite-gibt-es-nicht
//     HTTP/1.1 200 OK
//     <link rel="canonical" href="https://www.vorsorgewaage.de/">
//     <meta name="robots" content="index, follow">
//
// Die SPA-Umschreibung in `vercel.json` beantwortete jede erfundene Adresse
// mit der Startseite. Beliebig viele Adressen behaupteten damit, die
// Startseite zu sein, und luden ausdrücklich zur Indexierung ein – genau die
// Dublettenlage, die `seitenkoepfe.ts` für die sieben öffentlichen Adressen
// längst behebt, nur unbegrenzt.
//
// Die Umschreibung ist deshalb entfallen. Dafür entsteht beim Bauen für jede
// gültige Adresse eine echte Datei (siehe `seitenkoepfePlugin` in
// `vite.config.ts`), und `dist/404.html` fängt alles Übrige ab.
//
// **Der Preis dieser Entscheidung, damit er nicht vergessen wird:** Eine neue
// Route in `src/App.tsx`, die hier nicht ankommt, ist in der Produktion ein
// harter 404 – erreichbar nur über die Navigation innerhalb der Anwendung und
// beim Neuladen weg. `adressen.test.ts` liest `App.tsx` und vergleicht beide
// Richtungen; dieser Test ist die Gegenleistung und nicht optional.
//
// Warum die Liste nicht in `vercel.json` steht: Vercel liest diese Datei aus
// dem Repository, *bevor* der Build läuft – eine beim Bauen geschriebene
// Fassung käme zu spät. Von Hand gepflegt wären es 27 Pfade in zweiter
// Fassung, und die läuft auseinander.

import { routes } from "./index";
import { SEITENKOEPFE } from "./seitenkoepfe";

/**
 * Routen, die `App.tsx` kennt, `routes` aber nicht.
 *
 * `routes` ist die Quelle für `createPageUrl()` und enthält deshalb nur, was
 * aus der Anwendung heraus verlinkt wird. Diese drei werden angesprungen,
 * nicht verlinkt: `/beispiel` aus Suche und Anzeigen, `/login` vom
 * Anmeldeknopf der statischen Seiten, `/reset-password` aus einer E-Mail.
 */
const ZUSAETZLICH = ["/beispiel", "/login", "/reset-password"];

/** Jede Adresse, unter der die Anwendung etwas ausliefert. Ohne `*`. */
export const ANWENDUNGSADRESSEN: string[] = [
  ...new Set([...Object.values(routes), ...ZUSAETZLICH]),
].sort();

/** Die Adressen mit eigenem Kopf – öffentlich und in der Sitemap. */
const MIT_EIGENEM_KOPF = new Set(SEITENKOEPFE.map((k) => k.pfad));

/**
 * Adressen, die ein Crawler nicht indexieren soll.
 *
 * Alles hinter der Anmeldung. Heute liefern diese 19 Adressen die unveränderte
 * `index.html` aus: Titel, Beschreibung und Canonical der Startseite, dazu
 * `index, follow`. Für Google sind das 19 Dubletten der Startseite, und der
 * Crawler, der ihnen folgt, landet auf der Anmeldeseite.
 *
 * Die Startseite selbst ist ausgenommen – sie *ist* die Startseite.
 */
export const NICHT_INDEXIEREN: string[] = ANWENDUNGSADRESSEN.filter(
  (pfad) => pfad !== "/" && !MIT_EIGENEM_KOPF.has(pfad),
);

/**
 * Wohin die Kopien geschrieben werden.
 *
 * Zwei Formen, aus demselben Grund wie in `seitenkoepfe.ts`: Vercel liefert
 * für `/profile` die Verzeichnisdatei `profile/index.html`, der
 * Vorschauserver (sirv) sucht zuerst `profile.html`. Beide Dateien sind
 * zeichengleich. Ohne die zweite Form fiele die Adresse in der Vorschau in
 * den 404 – und damit in den E2E-Tests.
 */
export function dateinamenFuer(pfad: string): string[] {
  const ohne = pfad.replace(/^\//, "");
  return [`${ohne}/index.html`, `${ohne}.html`];
}
