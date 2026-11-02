// scripts/seo-kopfzeilen.mjs
// Misst Title, Description und Vorschauangaben jeder gebauten Seite.
//
// Warum ein Skript und kein Test: Ob ein Title zu lang ist, entscheidet sich
// nicht an einer Zahl, die der Bau erzwingen darf — der Beispielfall darf
// anders aussehen als eine Rechtsseite. Ein Test müsste also eine Grenze
// setzen, die es inhaltlich nicht gibt. Gemessen gehört es trotzdem: Die vier
// Ratgeberbeiträge trugen 77 bis 100 Zeichen im Title und bis 206 in der
// Description, wurden in der Trefferliste also abgeschnitten dargestellt —
// und das fiel niemandem auf, weil niemand nachgezählt hat.
//
// Die Schwellen sind keine Vorschrift von Google. Google kürzt nach
// Pixelbreite, nicht nach Zeichen; 60 und 155 sind die üblichen
// Erfahrungswerte für deutsche Texte in lateinischer Schrift. Sie stehen hier
// als Wegweiser, nicht als Urteil.
//
// Ausführen:
//   npm run build
//   node scripts/seo-kopfzeilen.mjs
//
// Weitere Schalter:
//   --nur-lange            nur Seiten zeigen, die eine Schwelle reißen
//   --ordner=dist          anderes Ausgabeverzeichnis

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const schalter = process.argv.slice(2);
const nurLange = schalter.includes("--nur-lange");
const ordner = join(
  wurzel,
  schalter.find((s) => s.startsWith("--ordner="))?.slice("--ordner=".length) ?? "dist",
);

/** Erfahrungswerte, keine Vorschrift — siehe Kopf der Datei. */
const GRENZE = { titel: 60, beschreibung: 155 };

if (!existsSync(ordner)) {
  console.error(`Kein Ausgabeverzeichnis unter ${ordner}. Erst "npm run build" laufen lassen.`);
  process.exit(1);
}

/** Alle `index.html` unter dem Ausgabeverzeichnis, verschachtelt. */
function seiten(verzeichnis) {
  return readdirSync(verzeichnis, { withFileTypes: true }).flatMap((eintrag) => {
    const pfad = join(verzeichnis, eintrag.name);
    if (eintrag.isDirectory()) return seiten(pfad);
    return eintrag.name === "index.html" ? [pfad] : [];
  });
}

function ersterTreffer(html, muster) {
  return muster.exec(html)?.[1] ?? "";
}

/**
 * Was eine Adresse in der Trefferliste und in einer geteilten Nachricht zeigt.
 *
 * Entities werden zurückgerechnet, sonst zählt `&quot;` als sechs Zeichen —
 * der Leser sieht eines.
 */
function kopfzeilen(datei) {
  const html = readFileSync(datei, "utf8");
  const entschaerft = (text) =>
    text
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");

  return {
    adresse: "/" + relative(ordner, dirname(datei)).split(sep).join("/"),
    titel: entschaerft(ersterTreffer(html, /<title>([\s\S]*?)<\/title>/)),
    beschreibung: entschaerft(
      ersterTreffer(html, /<meta name="description" content="([^"]*)"/),
    ),
    canonical: ersterTreffer(html, /<link rel="canonical" href="([^"]*)"/),
    vorschaubild: /property="og:image"/.test(html),
    karte: ersterTreffer(html, /name="twitter:card" content="([^"]*)"/),
    daten: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map((t) => {
        try {
          return JSON.parse(t[1])["@type"];
        } catch {
          return "UNLESBAR";
        }
      })
      .join(", "),
  };
}

const alle = seiten(ordner).map(kopfzeilen).sort((a, b) => a.adresse.localeCompare(b.adresse));
const auffaellig = alle.filter(
  (s) =>
    s.titel.length > GRENZE.titel ||
    s.beschreibung.length > GRENZE.beschreibung ||
    !s.titel ||
    !s.beschreibung ||
    !s.canonical ||
    !s.vorschaubild ||
    s.daten.includes("UNLESBAR"),
);

const zeilen = nurLange ? auffaellig : alle;
const marke = (laenge, grenze) => (laenge > grenze ? "!" : laenge ? " " : "?");

console.log(`\n${zeilen.length} von ${alle.length} Seiten aus ${relative(wurzel, ordner)}\n`);
console.log("Adresse".padEnd(52) + "Titel  Desc  Bild  Strukturierte Daten");
console.log("-".repeat(100));
for (const s of zeilen) {
  console.log(
    (s.adresse === "/" ? "/ (Startseite)" : s.adresse).padEnd(52) +
      `${String(s.titel.length).padStart(4)}${marke(s.titel.length, GRENZE.titel)} ` +
      `${String(s.beschreibung.length).padStart(4)}${marke(s.beschreibung.length, GRENZE.beschreibung)} ` +
      `${(s.vorschaubild ? " ja " : "NEIN").padEnd(5)} ` +
      (s.daten || "(keine)"),
  );
}

console.log(
  `\n! = über ${GRENZE.titel} bzw. ${GRENZE.beschreibung} Zeichen, wird in der Trefferliste ` +
    `vermutlich gekürzt\n? = fehlt ganz\n`,
);

for (const s of alle) {
  if (!s.canonical) console.log(`Ohne Canonical: ${s.adresse}`);
  if (s.daten.includes("UNLESBAR")) console.log(`Kaputtes JSON-LD: ${s.adresse}`);
}

// Kein Abbruch mit Fehlercode: Das Skript misst, es urteilt nicht. Eine
// Schwelle, die den Bau anhält, gehört in einen Test — und dort nur, wenn die
// Grenze inhaltlich wirklich für alle Seiten gilt.
