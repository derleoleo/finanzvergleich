// Erzeugt public/og-image.png (1200×630, Vorschaubild für LinkedIn, WhatsApp & Co.).
// Aufruf: node scripts/generate-og-image.mjs  (nutzt Playwright mit lokal installiertem Chrome)
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Schrift als data-URL einbetten – file://-Pfade lädt setContent nicht
const font = (f) =>
  `data:font/woff2;base64,${fs.readFileSync(path.join(root, "public/fonts", f)).toString("base64")}`;
const ziel = path.join(root, "public/og-image.png");

// Bildmarke wie in src/components/BrandLogo.tsx (48er Raster)
const mark = (size) => `
<svg viewBox="0 0 48 48" width="${size}" height="${size}">
  <defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#7faaff"/><stop offset="1" stop-color="#0057ff"/>
  </linearGradient></defs>
  <rect x="15" y="42" width="18" height="4" rx="2" fill="#0057ff"/>
  <rect x="22" y="10" width="4" height="34" rx="2" fill="#0057ff"/>
  <rect x="8" y="9.5" width="32" height="4" rx="2" fill="#0057ff" transform="rotate(10 24 11.5)"/>
  <circle cx="24" cy="11.5" r="3.5" fill="#0057ff"/>
  <path d="M8.2 8.7 L2.5 24 M8.2 8.7 L13.9 24 M39.8 14.3 L34.1 30 M39.8 14.3 L45.5 30" fill="none" stroke="#0057ff" stroke-width="1.5" stroke-linecap="round"/>
  <path d="M1.5 24 H14.9 A6.7 5 0 0 1 1.5 24 Z" fill="#0057ff" opacity="0.55"/>
  <path d="M33.1 30 H46.5 A6.7 5 0 0 1 33.1 30 Z" fill="url(#s)"/>
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Inter; src: url("${font("inter-latin.woff2")}") format("woff2"); font-weight: 100 900; }
@font-face { font-family: Inter; src: url("${font("inter-latin-ext.woff2")}") format("woff2"); font-weight: 100 900; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; font-family: Inter, sans-serif; color: #0f172a;
  background: linear-gradient(135deg, #ffffff 0%, #f1f5ff 100%); position: relative; overflow: hidden; }
.bar { position: absolute; left: 0; top: 0; bottom: 0; width: 14px; background: #0057ff; }
.inhalt { position: absolute; left: 88px; top: 72px; width: 700px; }
.marke { display: flex; align-items: center; gap: 16px; font-size: 40px; font-weight: 700; letter-spacing: -0.02em; }
h1 { margin-top: 64px; font-size: 58px; line-height: 1.08; font-weight: 800; letter-spacing: -0.03em; }
h1 span { color: #0057ff; white-space: nowrap; }
p { margin-top: 28px; max-width: 640px; font-size: 26px; line-height: 1.4; color: #475569; }
.domain { position: absolute; left: 88px; bottom: 56px; font-size: 24px; font-weight: 600; color: #0057ff; }
.kreis { position: absolute; right: 64px; top: 145px; width: 340px; height: 340px; border-radius: 50%;
  background: #e5edff; display: flex; align-items: center; justify-content: center; }
</style></head><body>
  <div class="bar"></div>
  <div class="inhalt">
    <div class="marke">${mark(56)}Vorsorgewaage</div>
    <h1>LV oder Depot?<br><span>Transparent abgewogen.</span></h1>
    <p>Vergleichsrechner für Finanz- und Versicherungsberater – nach Kosten und Steuern.</p>
  </div>
  <div class="domain">www.vorsorgewaage.de</div>
  <div class="kreis">${mark(230)}</div>
</body></html>`;

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: ziel });
await browser.close();
console.log("og-image geschrieben:", ziel);
