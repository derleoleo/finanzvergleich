// Erzeugt public/bilder/ratgeber/*.png — die Vorschaubilder der Ratgeberbeiträge
// in den drei von Google empfohlenen Seitenverhältnissen (16x9, 4x3, 1x1).
//
// Aufruf: npm run bilder:ratgeber   (nutzt Playwright mit lokal installiertem Chrome)
//
// Warum PNG und nicht das fertige SVG ausliefern: `og:image` wird von
// LinkedIn, WhatsApp & Co. als Rasterbild erwartet; SVG zeigen sie nicht an.
// Das SVG ist die Quelle, das PNG das Erzeugnis.
//
// Die Bilder werden mitversioniert, wie public/og-image.png auch. Damit ein
// vergessener Lauf nicht still veraltet, schreibt das Skript neben die Bilder
// ein manifest.json mit der Prüfsumme des SVG, aus dem jedes Bild entstanden
// ist. `beitragsbilder.test.ts` rechnet die Prüfsummen nach und schlägt an,
// wenn eine Zahl im Modul geändert wurde, ohne die Bilder neu zu erzeugen.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import fs from "node:fs";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Node 24 lädt TypeScript direkt; das Modul hat dafür bewusst keine Importe.
const quelle = pathToFileURL(path.join(root, "src/utils/beitragsbilder.ts")).href;
const { BILDWERKE, SEITENVERHAELTNISSE, zeichne, bildDatei } = await import(quelle);

const ziel = path.join(root, "public/bilder/ratgeber");
fs.mkdirSync(ziel, { recursive: true });

const font = (f) =>
  `data:font/woff2;base64,${fs.readFileSync(path.join(root, "public/fonts", f)).toString("base64")}`;

const seite = (svg, breite, hoehe) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url("${font("inter-latin.woff2")}") format("woff2"); font-weight: 100 900; }
@font-face { font-family: Inter; src: url("${font("inter-latin-ext.woff2")}") format("woff2"); font-weight: 100 900; }
* { margin: 0; padding: 0; }
html, body { width: ${breite}px; height: ${hoehe}px; overflow: hidden; }
</style></head><body>${svg}</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const manifest = {
  hinweis:
    "Erzeugt von scripts/generate-beitragsbilder.mjs. pruefsumme = sha256 des SVG, " +
    "aus dem das PNG entstand. beitragsbilder.test.ts rechnet sie nach.",
  bilder: {},
};

let anzahl = 0;
for (const werk of BILDWERKE) {
  for (const mass of SEITENVERHAELTNISSE) {
    const { svg } = zeichne(werk, mass);
    const datei = bildDatei(werk.slug, mass.kennung);
    const page = await browser.newPage({
      viewport: { width: mass.breite, height: mass.hoehe },
    });
    await page.setContent(seite(svg, mass.breite, mass.hoehe), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(ziel, datei) });
    await page.close();

    manifest.bilder[datei] = {
      pruefsumme: crypto.createHash("sha256").update(svg).digest("hex").slice(0, 16),
      breite: mass.breite,
      hoehe: mass.hoehe,
    };
    anzahl += 1;
    process.stdout.write(`  ${datei}\n`);
  }
}

await browser.close();
fs.writeFileSync(
  path.join(ziel, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.log(`\n${anzahl} Bilder und manifest.json in public/bilder/ratgeber/`);
