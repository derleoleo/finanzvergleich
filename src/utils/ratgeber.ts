// src/utils/ratgeber.ts
// Aus Markdown werden fertige HTML-Seiten – beim Bauen, nicht im Browser.
//
// Zwei Arten von Seiten entstehen hier: die Ratgeberbeiträge unter
// `/ratgeber/` und einzelne Textseiten direkt unter `/` (siehe
// `einzelseite`). Beide teilen Rahmen, Stil und Kopf; getrennte Module dafür
// hätten zwei Fassungen desselben Rahmens bedeutet, die beim nächsten
// Rechtslink auseinanderlaufen.
//
// Warum nicht als Route in der Anwendung: Die Anwendung ist eine Single-Page-App.
// Jede Adresse liefert dieselbe `index.html` mit einem Title, einer Description
// und dem Canonical auf `/`. Für Rechner ist das gleichgültig, für
// Ratgeberbeiträge wäre es tödlich – vier Beiträge mit identischen Metadaten
// konkurrieren bei Google miteinander, statt zu ranken. Dazu müsste ein Crawler
// erst JavaScript ausführen, um überhaupt Text zu sehen.
//
// Warum kein zweiter Baukasten (Astro o. ä.): Für eine Handvoll Textbeiträge
// wären ein zweites Build-System, ein zweiter Abhängigkeitsbaum und ein zweiter
// CI-Schritt teurer als dieses Modul. Das Wertvolle sind die Markdown-Dateien,
// und die ziehen unverändert um, falls der Ratgeber einmal dreißig Seiten mit
// Bildern und mehreren Autoren hat.
//
// Dieses Modul ist absichtlich rein: Es liest keine Dateien und kennt kein
// Dateisystem. Das Einsammeln erledigt das Vite-Plugin, damit hier alles ohne
// Umgebung testbar bleibt.

import { marked } from "marked";
import { ERLAUBTE_PARAMETER } from "./messparameter";
import { SEITENVERHAELTNISSE, bildAdressen, bildwerkFuer } from "./beitragsbilder";

export const DOMAIN = "https://www.vorsorgewaage.de";
export const RATGEBER_PFAD = "/ratgeber";

/** Zählstelle, falls eine eingerichtet ist. Ohne sie entsteht kein Skript. */
export type Messstelle = { basis: string; seite: string };

export type Beitrag = {
  /** Adressteil, aus dem Dateinamen. */
  slug: string;
  /** Die sichtbare Überschrift. Darf eine ausformulierte These sein. */
  titel: string;
  /**
   * Der Titel für die Trefferliste, wenn er ein anderer sein soll als der `h1`.
   *
   * Zwei Felder, weil die beiden Texte verschiedene Aufgaben haben. Gemessen
   * am gebauten `dist/` waren die vier `<title>` 77 bis 100 Zeichen lang;
   * Google zeigt rund 60 und schneidet den Rest ab — bei „Was im Todesfall
   * bleibt – und warum die Auszahlform mehr entscheidet als das Produkt" fiel
   * also genau die Aussage weg. Den `h1` dafür zu stutzen wäre der falsche
   * Tausch: Auf der Seite selbst trägt der lange Satz.
   *
   * Bei Einzelseiten ist es umgekehrt: Dort trägt der `h1` die kurze Frage
   * („Was ist Vorsorgewaage?") und der Title darf länger sein, weil er allein
   * stehen muss. Deshalb heißt das Feld nicht mehr „Kurzform".
   *
   * Fehlt die Angabe, gilt `titel` — dann ist der Beitrag kurz genug betitelt.
   */
  kurztitel?: string;
  /** Meta-Description und Anrisstext in der Übersicht. In einem Satz. */
  beschreibung: string;
  /** ISO-Datum der Veröffentlichung. */
  datum: string;
  /** Rechtsstand, auf den sich der Beitrag bezieht – bei Steuerthemen Pflicht. */
  stand?: string;
  /** Gerendertes Markdown. */
  html: string;
};

/** Zeichen, die in Attributen und Text nichts verloren haben. */
export function escape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Liest einen Beitrag aus Dateiname und Inhalt.
 *
 * Fehlende Angaben brechen den Bau ab, statt eine Seite ohne Description oder
 * ohne Datum auszuliefern. Eine Seite, die Google ohne Beschreibung sieht, ist
 * schlimmer als eine, die es noch nicht gibt – und ein Steuerbeitrag ohne
 * Rechtsstand ist für die Begründungspflicht nach § 61 VVG wertlos.
 */
export function beitragLesen(dateiname: string, rohEingang: string): Beitrag {
  /*
   * Zeilenenden einmal vereinheitlichen, danach kennt der Parser nur "\n".
   *
   * Unter Windows checkt Git die Markdown-Quellen mit CRLF aus
   * (core.autocrlf), im Linux-Lauf der CI bleiben sie bei LF. Der Kopf kam
   * damit zurecht, der Rumpf nicht ueberall - ein uebrig gebliebenes \r
   * landete sonst in den erzeugten Seiten, je nachdem, wo gebaut wird.
   */
  const roh = rohEingang.replace(/\r\n?/g, "\n");
  const slug = dateiname.replace(/\.md$/, "");
  const treffer = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(roh);
  if (!treffer) {
    throw new Error(`Ratgeber: ${dateiname} hat keinen Kopf zwischen --- und ---.`);
  }

  const kopf = new Map<string, string>();
  for (const zeile of treffer[1].split(/\r?\n/)) {
    if (!zeile.trim()) continue;
    const i = zeile.indexOf(":");
    if (i < 0) throw new Error(`Ratgeber: ${dateiname}, Kopfzeile ohne Doppelpunkt: ${zeile}`);
    kopf.set(zeile.slice(0, i).trim(), zeile.slice(i + 1).trim());
  }

  const pflicht = (name: string): string => {
    const wert = kopf.get(name);
    if (!wert) throw new Error(`Ratgeber: ${dateiname} ohne Angabe "${name}".`);
    return wert;
  };

  const datum = pflicht("datum");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    throw new Error(`Ratgeber: ${dateiname}, datum muss JJJJ-MM-TT sein, ist "${datum}".`);
  }

  const koerper = roh.slice(treffer[0].length);
  return {
    slug,
    titel: pflicht("titel"),
    kurztitel: kopf.get("kurztitel"),
    beschreibung: pflicht("beschreibung"),
    datum,
    stand: kopf.get("stand"),
    html: tabellenRahmen(marked.parse(koerper, { async: false }) as string),
  };
}

/**
 * Tabellen in einen scrollbaren Rahmen setzen.
 *
 * Eine vierspaltige Zahlentabelle passt nicht auf ein Telefon. Ohne Rahmen
 * schiebt sie die ganze Seite nach rechts – und ausgerechnet die
 * Förderquote, die Spalte mit der Aussage, steht ganz außen und fällt
 * heraus. Markdown liefert nacktes `<table>`, deshalb hier.
 */
export function tabellenRahmen(html: string): string {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, '<div class="tabelle"><table>$1</table></div>');
}

/**
 * Die Messung für eine statische Seite.
 *
 * Zweite, winzige Fassung der Regel aus `utils/messung.ts` – nötig, weil diese
 * Seiten die Anwendung nicht laden. Die Liste der erlaubten Parameter kommt aus
 * demselben Modul wie dort; nur sie ändert sich im Laufe der Zeit, der Rest
 * sind zehn Zeilen, die stehen bleiben.
 *
 * Eine Anmeldung kann es hier nicht geben, deshalb fehlt die Abfrage darauf.
 */
function messskript(mess: Messstelle | undefined): string {
  if (!mess) return "";
  const erlaubt = JSON.stringify(ERLAUBTE_PARAMETER);
  const basis = mess.basis.replace(/\/$/, "");
  return `  <script>
  window.vorsorgewaageVorSenden = function (art, nutzlast) {
    try {
      if (!nutzlast || typeof nutzlast !== "object") return null;
      var erlaubt = ${erlaubt};
      ["url", "referrer"].forEach(function (feld) {
        var wert = nutzlast[feld];
        if (typeof wert !== "string" || !wert) return;
        var url = new URL(wert, location.origin);
        var behalten = new URLSearchParams();
        url.searchParams.forEach(function (w, n) {
          if (erlaubt.indexOf(n.toLowerCase()) >= 0) behalten.append(n, w);
        });
        var frage = behalten.toString();
        var pfad = url.pathname + (frage ? "?" + frage : "");
        nutzlast[feld] = /^[a-z]+:\\/\\//i.test(wert) ? url.origin + pfad : pfad;
      });
      return nutzlast;
    } catch (e) {
      return null;
    }
  };
  </script>
  <script defer src="${escape(basis)}/script.js" data-website-id="${escape(mess.seite)}" data-domains="www.vorsorgewaage.de" data-before-send="vorsorgewaageVorSenden" data-exclude-hash="true" data-do-not-track="true"></script>
`;
}

/** Eine Stelle für das Aussehen aller Ratgeberseiten. */
const STIL = `
    /*
     * Dieselbe Schrift wie in der Anwendung.
     *
     * Vorher verlangte die Seite Inter, lud sie aber nie - also wich der
     * Browser auf die Systemschrift aus. Das war der groesste Teil des
     * Unterschieds: nicht die Anordnung, sondern die Schrift. Die Dateien
     * liegen in public/fonts und werden vom Build mitgenommen.
     */
    @font-face {
      font-family: "Inter";
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("/fonts/inter-latin.woff2") format("woff2");
      unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
    }
    @font-face {
      font-family: "Inter";
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("/fonts/inter-latin-ext.woff2") format("woff2");
      unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;
    }
    :root {
      --ink: #1A1A2E; --slate: #445566; --muted: #8899BB;
      --border: #E0E8F5; --surface: #F7F9FF; --tint: #F0F5FF;
      --brand: #0057FF; --brand-dark: #0040CC;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; background: #fff; color: var(--ink);
      font: 17px/1.7 "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--brand); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .huelle { max-width: 44rem; margin: 0 auto; padding: 0 1.25rem; }
    /* Kopf und Fuss laufen so breit wie in der Anwendung (max-w-6xl), der
       Lesetext bleibt schmal. Sonst wirkt die Leiste wie von einer anderen
       Seite. */
    .breit { max-width: 72rem; margin: 0 auto; padding: 0 1.5rem; }
    header { border-bottom: 1px solid var(--border); background: rgba(255,255,255,.9); backdrop-filter: blur(4px); position: sticky; top: 0; z-index: 50; }
    /* Sprungziele muessen unter der klebenden Leiste landen, nicht dahinter.
       Die Leiste ist 69 px hoch; gemessen auf /was-die-rechner-koennen stand
       die angesprungene Ueberschrift exakt bei top: 0 und war damit
       vollstaendig verdeckt. 5rem laesst ihr Luft. Das gleitende Scrollen
       macht den Sprung nachvollziehbar - wer Bewegung abbestellt hat,
       bekommt sie nicht. */
    h2[id] { scroll-margin-top: 5rem; }
    @media (prefers-reduced-motion: no-preference) {
      html { scroll-behavior: smooth; }
    }
    /* Drei Gruppen wie in der Anwendung: Marke links, Navigation in der
       Mitte, Aktionen rechts. Mit space-between ueber nur zwei Gruppen klebte
       die Navigation an den Aktionen - das war der sichtbare Unterschied. */
    header .breit { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.5rem; }
    .kopfaktionen { display: flex; align-items: center; gap: .75rem; }
    .marke { display: flex; align-items: center; gap: .5rem; color: var(--ink); font-weight: 700; font-size: 1.25rem; letter-spacing: -.025em; }
    .marke:hover { text-decoration: none; }
    .marke .mark { width: 2rem; height: 2rem; flex: none; }
    .kopfnavi { display: flex; gap: 2rem; font-size: .875rem; }
    .kopfnavi a { color: var(--muted); font-weight: 500; }
    .kopfnavi a:hover { color: var(--ink); text-decoration: none; }
    .anmelden { font-size: .875rem; font-weight: 500; color: var(--slate); }
    .anmelden:hover { color: var(--ink); text-decoration: none; }
    .knopf.klein { margin-top: 0; padding: .5rem 1rem; font-size: .875rem; line-height: 1.25rem; background: #2563EB; }
    .knopf.klein:hover { background: #1E3A8A; }
    main { padding: 2.5rem 0 3.5rem; }
    h1 { font-size: 2rem; line-height: 1.25; letter-spacing: -.02em; margin: 0 0 .75rem; }
    h2 { font-size: 1.3rem; line-height: 1.35; margin: 2.5rem 0 .75rem; letter-spacing: -.01em; }
    h3 { font-size: 1.05rem; margin: 1.75rem 0 .5rem; }
    p, ul, ol { margin: 0 0 1.1rem; }
    ul, ol { padding-left: 1.3rem; }
    li { margin-bottom: .4rem; }
    .stand { color: var(--muted); font-size: .85rem; margin: 0 0 2rem; }
    blockquote {
      margin: 1.5rem 0; padding: 1rem 1.25rem; background: var(--tint);
      border-left: 3px solid var(--brand); border-radius: 0 .5rem .5rem 0;
    }
    blockquote p:last-child { margin-bottom: 0; }
    .tabelle { overflow-x: auto; margin: 1.5rem 0; -webkit-overflow-scrolling: touch; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    .tabelle table { min-width: 26rem; }
    th, td { padding: .6rem .7rem; border: 1px solid var(--border); text-align: left; white-space: nowrap; }
    th { background: var(--surface); font-weight: 600; }
    td:not(:first-child), th:not(:first-child) { text-align: right; font-variant-numeric: tabular-nums; }
    code { background: var(--surface); padding: .1rem .35rem; border-radius: .25rem; font-size: .9em; }
    hr { border: 0; border-top: 1px solid var(--border); margin: 2.5rem 0; }
    .ruf {
      margin: 2.5rem 0 0; padding: 1.5rem; background: var(--surface);
      border: 1px solid var(--border); border-radius: .75rem;
    }
    .ruf h2 { margin-top: 0; font-size: 1.1rem; }
    .knopf {
      display: inline-block; margin-top: .5rem; padding: .6rem 1.1rem;
      background: var(--brand); color: #fff; border-radius: .5rem; font-weight: 600; font-size: .95rem;
    }
    .knopf:hover { background: var(--brand-dark); text-decoration: none; }
    .liste { list-style: none; padding: 0; }
    .liste li { padding: 1.25rem 0; border-bottom: 1px solid var(--border); margin: 0; }
    .liste h2 { margin: 0 0 .35rem; font-size: 1.15rem; }
    .liste p { margin: 0; color: var(--slate); font-size: .95rem; }
    footer { border-top: 1px solid var(--border); padding: 2rem 0; color: var(--muted); font-size: .8rem; }
    footer .breit { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; justify-content: center; }
    /* Dieselbe Schwelle wie in der Anwendung (md): Darunter bleiben Marke
       und Handlungsaufforderung, Navigation und "Anmelden" weichen. */
    @media (max-width: 767px) {
      .kopfnavi, .anmelden { display: none; }
    }
    @media (max-width: 480px) {
      h1 { font-size: 1.6rem; }
      /* Auf 320 px passen Marke und Handlungsaufforderung nicht
         nebeneinander: Marke 188 px, Knopf 99 px, dazu 16 px Lücke macht
         303 px für 272 px Platz - die Seite lief um 7 px über. Nur die
         Lücke zu streichen reicht nicht; dann berührten sich beide, und
         der Knopf legte sich über das Wort. Genau so sieht es heute auch
         in der Anwendung aus (Landingpage auf 320 px) - dort ist derselbe
         Fehler noch offen.

         Deshalb hier beides: keine Lücke, und das Markenwort eine Spur
         kleiner. Das Zeichen behält seine Größe. Macht 158 + 99 = 257 px
         und damit 15 px Luft. */
      header .breit { gap: .5rem; }
      .marke { font-size: 1rem; }
      .knopf.klein { padding: .5rem .75rem; }
    }
`;

/**
 * Die Bildmarke, Zeichen für Zeichen aus `components/BrandLogo.tsx`.
 *
 * Vorher stand hier eine selbstgezeichnete Waage – ein anderes Zeichen als
 * auf allen übrigen Seiten. Auf Seiten, die Vertrauen gewinnen sollen, ist
 * eine abweichende Marke kein Schönheitsfehler.
 *
 * Doppelt gepflegt, weil diese Seiten ohne React entstehen. Ein Test hält
 * beide Fassungen zusammen: Ändert sich die Komponente, fällt es auf.
 */
export const BILDMARKE = `<svg viewBox="0 0 48 48" class="mark" aria-hidden="true">
  <defs><linearGradient id="vw-schale" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7faaff"/><stop offset="1" stop-color="#0057ff"/>
  </linearGradient></defs>
  <rect x="15" y="42" width="18" height="4" rx="2" fill="#0057ff"/>
  <rect x="22" y="10" width="4" height="34" rx="2" fill="#0057ff"/>
  <rect x="8" y="9.5" width="32" height="4" rx="2" fill="#0057ff" transform="rotate(10 24 11.5)"/>
  <circle cx="24" cy="11.5" r="3.5" fill="#0057ff"/>
  <path d="M8.2 8.7 L2.5 24 M8.2 8.7 L13.9 24" stroke="#0057ff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M39.8 14.3 L34.1 30 M39.8 14.3 L45.5 30" stroke="#0057ff" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M1.5 24 H14.9 A6.7 5 0 0 1 1.5 24 Z" fill="#0057ff" opacity="0.55"/>
  <path d="M33.1 30 H46.5 A6.7 5 0 0 1 33.1 30 Z" fill="url(#vw-schale)"/>
</svg>`;

/** Kopf und Fuß. Das Impressum muss nach § 5 DDG von jeder Seite erreichbar sein. */
function rahmen(inhalt: string): string {
  return `<header>
    <div class="breit">
      <a class="marke" href="${DOMAIN}/">
        ${BILDMARKE}
        Vorsorgewaage
      </a>
      <nav class="kopfnavi">
        <a href="${RATGEBER_PFAD}/">Ratgeber</a>
        <a class="beispiel" href="${DOMAIN}/beispiel">Beispielfall</a>
        <a href="${DOMAIN}/pricing">Preise</a>
      </nav>
      <div class="kopfaktionen">
        <a class="anmelden" href="${DOMAIN}/login">Anmelden</a>
        <a class="knopf klein" href="${DOMAIN}/login">Kostenlos starten</a>
      </div>
    </div>
  </header>
  <main class="huelle">
${inhalt}
  </main>
  <footer>
    <div class="breit">
      <a href="${DOMAIN}/was-die-rechner-koennen">Was die Rechner können</a>
      <a href="${DOMAIN}/impressum">Impressum</a>
      <a href="${DOMAIN}/datenschutz">Datenschutz</a>
      <a href="${DOMAIN}/agb">AGB</a>
      <a href="${DOMAIN}/compliance">Compliance</a>
      <span>© ${new Date().getFullYear()} Luisa Brandt</span>
    </div>
  </footer>`;
}

/**
 * Das Markenbild — Vorschau für alle Seiten, die kein eigenes Bild haben.
 *
 * Die Ratgeberseiten hatten gar keins: `og:image` fehlte, und
 * `twitter:card` stand auf `summary`. Geteilt in einem Beratungsnetzwerk oder
 * einer Nachricht erschien also ein Textschnipsel ohne Bild.
 *
 * Danach trugen alle Beiträge dieses eine Markenbild, und im
 * `Article`-JSON-LD stand gar keins: Google verlangt dort ausdrücklich ein
 * Bild, das den Beitrag zeigt, „rather than logos". Inzwischen hat jeder
 * Beitrag ein eigenes, aus seinen Zahlen gezeichnetes Bild
 * (`beitragsbilder.ts`) — das Markenbild bleibt für die Übersicht und die
 * Einzelseiten.
 */
const VORSCHAUBILD = {
  adresse: `${DOMAIN}/og-image.png`,
  breite: "1200",
  hoehe: "630",
  text: "Vorsorgewaage – LV oder Depot? Transparent abgewogen.",
};

function huelle(o: {
  titel: string;
  beschreibung: string;
  adresse: string;
  /** `article` für einen Beitrag, `website` für die Übersicht. */
  art: "article" | "website";
  /**
   * Eigene `robots`-Angabe. Ohne sie steht keine im Kopf, und es gilt die
   * Voreinstellung der Suchmaschine (indexieren).
   */
  robots?: string;
  kopfExtra?: string;
  /** Eigenes Vorschaubild; ohne Angabe das Markenbild. */
  bild?: { adresse: string; breite: string; hoehe: string; text: string };
  inhalt: string;
  mess: Messstelle | undefined;
}): string {
  const bild = o.bild ?? VORSCHAUBILD;
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(o.titel)}</title>
  <meta name="description" content="${escape(o.beschreibung)}">
${o.adresse ? `  <link rel="canonical" href="${escape(o.adresse)}">
` : ""}${
    o.robots ? `  <meta name="robots" content="${escape(o.robots)}">
` : ""
  }  <link rel="icon" type="image/svg+xml" href="${DOMAIN}/favicon.svg">
  <meta property="og:type" content="${o.art}">
  <meta property="og:title" content="${escape(o.titel)}">
  <meta property="og:description" content="${escape(o.beschreibung)}">
${o.adresse ? `  <meta property="og:url" content="${escape(o.adresse)}">
` : ""}  <meta property="og:site_name" content="Vorsorgewaage">
  <meta property="og:locale" content="de_DE">
  <meta property="og:image" content="${bild.adresse}">
  <meta property="og:image:width" content="${bild.breite}">
  <meta property="og:image:height" content="${bild.hoehe}">
  <meta property="og:image:alt" content="${escape(bild.text)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(o.titel)}">
  <meta name="twitter:description" content="${escape(o.beschreibung)}">
  <meta name="twitter:image" content="${bild.adresse}">
${o.kopfExtra ?? ""}${messskript(o.mess)}  <style>${STIL}  </style>
</head>
<body>
  ${rahmen(o.inhalt)}
</body>
</html>
`;
}

const DATUM_DE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function datumLesbar(iso: string): string {
  return DATUM_DE.format(new Date(`${iso}T12:00:00Z`));
}

/**
 * Der Weg von der Startseite hierher, maschinenlesbar.
 *
 * Google zeigt daraus in der Trefferliste „vorsorgewaage.de › Ratgeber ›
 * Beitrag" statt der nackten Adresse. Ohne das Markup baut Google den Pfad
 * aus der Adresse selbst zusammen, und bei Slugs wie
 * `was-im-todesfall-bleibt-altersvorsorgedepot` wird das unleserlich.
 *
 * Das letzte Glied bekommt kein `item`: Googles Seite zum Brotkrumen-Markup
 * lässt es für den letzten Eintrag weg und nimmt dann die Adresse der Seite
 * selbst. Zwei Angaben derselben Adresse wären nur eine Gelegenheit, dass sie
 * auseinanderlaufen.
 */
function brotkrumen(glieder: { name: string; adresse?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: glieder.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.name,
      ...(g.adresse ? { item: g.adresse } : {}),
    })),
  };
}

/** JSON-LD-Blöcke als fertige Script-Elemente für den Kopf. */
function datenBloecke(...bloecke: object[]): string {
  return bloecke
    .map((b) => `  <script type="application/ld+json">${JSON.stringify(b)}</script>\n`)
    .join("");
}

/** Eine Beitragsseite. */
export function beitragSeite(b: Beitrag, mess?: Messstelle): string {
  const adresse = `${DOMAIN}${RATGEBER_PFAD}/${b.slug}/`;

  // Jeder Beitrag hat ein eigenes, aus seinen Zahlen gezeichnetes Bild.
  // Google verlangt fuer `Article.image` ein Bild, das den Beitrag zeigt
  // ("rather than logos"), und empfiehlt mehrere Seitenverhaeltnisse —
  // deshalb alle drei als Feld, wie im Beispiel der Google-Seite.
  const werk = bildwerkFuer(b.slug);
  const bilder = werk ? bildAdressen(b.slug, DOMAIN) : [];

  const artikel = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: b.titel,
    description: b.beschreibung,
    datePublished: b.datum,
    dateModified: b.datum,
    inLanguage: "de-DE",
    mainEntityOfPage: { "@type": "WebPage", "@id": adresse },
    author: { "@type": "Organization", name: "Vorsorgewaage" },
    publisher: { "@type": "Organization", name: "Vorsorgewaage", url: `${DOMAIN}/` },
    ...(bilder.length ? { image: bilder } : {}),
  };
  const stand = [
    `Veröffentlicht am ${datumLesbar(b.datum)}`,
    b.stand ? `Rechtsstand: ${escape(b.stand)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const inhalt = `    <article>
      <h1>${escape(b.titel)}</h1>
      <p class="stand">${stand}</p>
${b.html}
    </article>
    <section class="ruf">
      <h2>Mit eigenen Zahlen nachrechnen</h2>
      <p>
        Der Beispielfall rechnet live und ohne Anmeldung – dieselbe Engine, die auch
        die Zahlen in diesem Beitrag erzeugt hat.
      </p>
      <a class="knopf" href="${DOMAIN}/beispiel">Beispielfall ansehen</a>
    </section>
    <p style="margin-top:2rem"><a href="${RATGEBER_PFAD}/">← Alle Beiträge</a></p>`;

  return huelle({
    // Nur hier die Kurzform: Der `h1` und die Übersicht tragen weiter `titel`.
    titel: `${b.kurztitel ?? b.titel} – Vorsorgewaage`,
    beschreibung: b.beschreibung,
    adresse,
    art: "article",
    // 16:9 als Vorschau beim Teilen; die uebrigen Masse stehen im JSON-LD.
    bild: werk
      ? {
          adresse: bilder[0],
          breite: String(SEITENVERHAELTNISSE[0].breite),
          hoehe: String(SEITENVERHAELTNISSE[0].hoehe),
          text: werk.alt,
        }
      : undefined,
    kopfExtra:
      `  <meta property="article:published_time" content="${b.datum}">\n` +
      `  <meta property="article:modified_time" content="${b.datum}">\n` +
      datenBloecke(
        artikel,
        brotkrumen([
          { name: "Startseite", adresse: `${DOMAIN}/` },
          { name: "Ratgeber", adresse: `${DOMAIN}${RATGEBER_PFAD}/` },
          { name: b.titel },
        ]),
      ),
    inhalt,
    mess,
  });
}

/**
 * Eine einzelne Textseite direkt unter `/` — zum Beispiel „Was ist
 * Vorsorgewaage?".
 *
 * Warum nicht als Route in der Anwendung, obwohl es eine Produktseite ist:
 * Sie wurde zuerst als React-Seite gebaut, und die Messung hat das widerlegt.
 * Im ausgelieferten HTML standen **null** Wörter — der ganze Text erschien
 * erst, nachdem der Browser JavaScript ausgeführt hatte. Eine Ratgeberseite
 * liefert zum Vergleich über 1.100 Wörter sofort. Für eine Seite, deren
 * einziger Zweck es ist, gefunden und zitiert zu werden, ist das der
 * Unterschied, auf den es ankommt: Google rendert JavaScript, aber die
 * Suchindex-Crawler der KI-Assistenten tun es nicht verlässlich, und genau
 * für die wurde die Crawler-Entscheidung getroffen
 * (docs/ki-crawler-entscheidung.md).
 *
 * Kein zweites Build-System: Es ist derselbe Erzeuger, der schon den Ratgeber
 * baut — nur eine zweite Art Seite darin.
 *
 * Unterschiede zur Beitragsseite: kein `Article`-JSON-LD (eine Produktseite
 * ist kein Artikel), `og:type` ist `website`, die Brotkrumen haben zwei
 * Glieder, und der Title bekommt **kein** „– Vorsorgewaage" angehängt. Er
 * steht hier allein und trägt den Markennamen schon selbst; der Seitenname
 * über dem Treffer kommt ohnehin aus dem `WebSite`-Markup der Startseite.
 */
export function einzelseite(b: Beitrag, mess?: Messstelle): string {
  const adresse = `${DOMAIN}/${b.slug}`;
  const inhalt = `    <article>
      <h1>${escape(b.titel)}</h1>
${b.html}
    </article>
    <section class="ruf">
      <h2>Mit eigenen Zahlen nachrechnen</h2>
      <p>
        Der Beispielfall rechnet live und ohne Anmeldung – dieselbe Engine, die auch
        hinter den sechs Rechnern steht.
      </p>
      <a class="knopf" href="${DOMAIN}/beispiel">Beispielfall ansehen</a>
    </section>`;

  return huelle({
    titel: b.kurztitel ?? b.titel,
    beschreibung: b.beschreibung,
    adresse,
    art: "website",
    kopfExtra: datenBloecke(
      brotkrumen([{ name: "Startseite", adresse: `${DOMAIN}/` }, { name: b.titel }]),
    ),
    inhalt,
    mess,
  });
}

/** Die Übersicht, neueste zuerst. */
/**
 * Die Seite, die bei einer unbekannten Adresse ausgeliefert wird.
 *
 * Sie ersetzt die Umschreibung auf `index.html`, die jeder erfundenen Adresse
 * mit HTTP 200, dem Titel der Startseite und `index, follow` geantwortet hat.
 *
 * Warum statisch und nicht die Anwendung: Sie trägt kein JavaScript, erscheint
 * sofort, und sie umgeht die Frage, ob die Anwendung auf einer Adresse
 * hochfährt, die es nicht gibt. Dazu trägt sie Kopf und Fuß der übrigen
 * Textseiten – wer sich bei einer Ratgeberadresse vertippt, bleibt optisch am
 * selben Ort.
 *
 * `noindex` sagt der Suchmaschine, dass hier nichts zu holen ist; `follow`
 * bleibt, damit die vier Verweise unten Wert haben. **Kein Canonical** – das
 * wäre die Behauptung, diese Adresse *sei* die Startseite, und genau daran
 * erkennt Google einen weichen 404. Aus demselben Grund kein `og:url`.
 *
 * Vier Verweise, nicht mehr: Auf einer Fehlerseite soll man nicht raten, was
 * der Besucher wollte. Dieselben vier stehen in `src/pages/NotFound.tsx`,
 * damit ein Besucher dasselbe liest, ob er die Adresse eingetippt oder in der
 * Anwendung auf einen toten Verweis geklickt hat.
 */
export function fehlerseite(mess?: Messstelle): string {
  const inhalt = `    <article>
      <h1>Diese Seite gibt es nicht</h1>
      <p>
        Vielleicht hat sich die Adresse geändert, oder es fehlt ein Zeichen.
        Diese vier Wege führen weiter:
      </p>
      <ul>
        <li><a href="${DOMAIN}/">Startseite</a> – was Vorsorgewaage ist und für wen</li>
        <li><a href="${DOMAIN}/beispiel">Beispielfall</a> – ein durchgerechneter Vergleich, ohne Anmeldung</li>
        <li><a href="${DOMAIN}${RATGEBER_PFAD}/">Ratgeber</a> – Fachbeiträge zu Förderung, Steuern und Entnahme</li>
        <li><a href="${DOMAIN}/pricing">Preise</a></li>
      </ul>
    </article>`;

  return huelle({
    titel: "Diese Seite gibt es nicht – Vorsorgewaage",
    beschreibung:
      "Die aufgerufene Adresse führt ins Leere. Von hier aus geht es zur " +
      "Startseite, zum Beispielfall, zum Ratgeber und zu den Preisen.",
    // Leer: Diese Seite erscheint unter beliebigen Adressen und darf keine
    // davon als ihre eigene ausgeben.
    adresse: "",
    art: "website",
    robots: "noindex, follow",
    inhalt,
    mess,
  });
}

export function uebersichtSeite(beitraege: Beitrag[], mess?: Messstelle): string {
  const sortiert = [...beitraege].sort((a, b) => b.datum.localeCompare(a.datum));
  const eintraege = sortiert
    .map(
      (b) => `        <li>
          <h2><a href="${RATGEBER_PFAD}/${b.slug}/">${escape(b.titel)}</a></h2>
          <p>${escape(b.beschreibung)}</p>
          <p style="margin-top:.4rem;color:#8899BB;font-size:.85rem">${datumLesbar(b.datum)}</p>
        </li>`,
    )
    .join("\n");

  const inhalt = `    <h1>Ratgeber</h1>
    <p>
      Fachbeiträge zu Fragen, die in der Altersvorsorgeberatung täglich auftauchen –
      jeder mit einem nachgerechneten Beispiel aus unserem eigenen Rechner, damit die
      Zahlen im Text und im Werkzeug übereinstimmen.
    </p>
    <ul class="liste">
${eintraege}
    </ul>`;

  return huelle({
    titel: "Ratgeber – Vorsorgewaage",
    // 161 Zeichen waren es vorher, also eine gekürzte Darstellung.
    beschreibung:
      "Fachbeiträge zur Altersvorsorgeberatung: Altersvorsorgedepot, Riester-Bestand, " +
      "Hinterbliebene und Begründungspflicht – mit nachgerechneten Zahlen.",
    adresse: `${DOMAIN}${RATGEBER_PFAD}/`,
    // Eine Liste von Beiträgen ist kein Artikel. Vorher stand hier
    // `og:type: article` – dieselbe Angabe wie auf den Beiträgen selbst.
    art: "website",
    kopfExtra: datenBloecke(
      brotkrumen([{ name: "Startseite", adresse: `${DOMAIN}/` }, { name: "Ratgeber" }]),
    ),
    inhalt,
    mess,
  });
}
