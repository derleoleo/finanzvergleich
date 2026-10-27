// src/utils/ratgeber.ts
// Aus Markdown werden fertige HTML-Seiten – beim Bauen, nicht im Browser.
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

export const DOMAIN = "https://www.vorsorgewaage.de";
export const RATGEBER_PFAD = "/ratgeber";

/** Zählstelle, falls eine eingerichtet ist. Ohne sie entsteht kein Skript. */
export type Messstelle = { basis: string; seite: string };

export type Beitrag = {
  /** Adressteil, aus dem Dateinamen. */
  slug: string;
  titel: string;
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
export function beitragLesen(dateiname: string, roh: string): Beitrag {
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
    header .breit { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.5rem; }
    .marke { display: flex; align-items: center; gap: .5rem; color: var(--ink); font-weight: 700; font-size: 1.25rem; letter-spacing: -.02em; }
    .marke:hover { text-decoration: none; }
    .marke .mark { width: 2rem; height: 2rem; flex: none; }
    .kopfrechts { display: flex; align-items: center; gap: 1.5rem; }
    .kopfnavi { display: flex; gap: 2rem; font-size: .875rem; }
    .kopfnavi a { color: var(--muted); font-weight: 500; }
    .kopfnavi a:hover { color: var(--ink); text-decoration: none; }
    .anmelden { font-size: .875rem; font-weight: 500; color: var(--slate); }
    .anmelden:hover { color: var(--ink); text-decoration: none; }
    .knopf.klein { margin-top: 0; padding: .5rem 1rem; font-size: .875rem; background: #2563EB; }
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
    @media (max-width: 480px) {
      h1 { font-size: 1.6rem; }
      .kopfnavi { gap: 1rem; font-size: .85rem; }
      .kopfrechts { gap: 1rem; }
      .anmelden { display: none; }
      .marke { font-size: 1.1rem; }
      header .breit { padding: .75rem 1rem; }
      /* Marke plus drei Verweise passen nicht nebeneinander und schoeben die
         ganze Seite nach rechts. Der Beispielfall steht ohnehin am Ende jedes
         Beitrags als Handlungsaufforderung. */
      .kopfnavi .beispiel { display: none; }
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
      <div class="kopfrechts">
        <nav class="kopfnavi">
          <a href="${RATGEBER_PFAD}/">Ratgeber</a>
          <a class="beispiel" href="${DOMAIN}/beispiel">Beispielfall</a>
          <a href="${DOMAIN}/pricing">Preise</a>
        </nav>
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
      <a href="${DOMAIN}/impressum">Impressum</a>
      <a href="${DOMAIN}/datenschutz">Datenschutz</a>
      <a href="${DOMAIN}/agb">AGB</a>
      <a href="${DOMAIN}/compliance">Compliance</a>
      <span>© ${new Date().getFullYear()} Luisa Brandt</span>
    </div>
  </footer>`;
}

function huelle(o: {
  titel: string;
  beschreibung: string;
  adresse: string;
  kopfExtra?: string;
  inhalt: string;
  mess: Messstelle | undefined;
}): string {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(o.titel)}</title>
  <meta name="description" content="${escape(o.beschreibung)}">
  <link rel="canonical" href="${escape(o.adresse)}">
  <link rel="icon" type="image/svg+xml" href="${DOMAIN}/favicon.svg">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escape(o.titel)}">
  <meta property="og:description" content="${escape(o.beschreibung)}">
  <meta property="og:url" content="${escape(o.adresse)}">
  <meta name="twitter:card" content="summary">
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

/** Eine Beitragsseite. */
export function beitragSeite(b: Beitrag, mess?: Messstelle): string {
  const adresse = `${DOMAIN}${RATGEBER_PFAD}/${b.slug}/`;
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
    titel: `${b.titel} – Vorsorgewaage`,
    beschreibung: b.beschreibung,
    adresse,
    kopfExtra: `  <script type="application/ld+json">${JSON.stringify(artikel)}</script>\n`,
    inhalt,
    mess,
  });
}

/** Die Übersicht, neueste zuerst. */
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
    beschreibung:
      "Fachbeiträge zur Altersvorsorgeberatung: Altersvorsorgedepot, Riester-Bestand, " +
      "Hinterbliebenenleistungen und Begründungspflicht – mit nachgerechneten Beispielen.",
    adresse: `${DOMAIN}${RATGEBER_PFAD}/`,
    inhalt,
    mess,
  });
}
