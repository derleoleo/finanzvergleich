// scripts/screenshots.mjs
// Erzeugt public/screenshots/*.png aus der laufenden App.
//
// Warum ein Skript: Die alten Bilder stammten aus einer früheren Fassung und
// zeigten noch das alte Urteil „Lebensversicherung ist besser" statt der
// Vorsorgewaage. Von Hand nachgezogene Screenshots veralten beim nächsten
// Umbau wieder – mit einem Skript ist es ein Befehl.
//
// Anmeldung: Beim ersten Lauf öffnet sich ein Browserfenster. Melden Sie sich
// dort selbst an; danach wird die Sitzung in .playwright-auth.json abgelegt
// (nicht im Repo) und bei den nächsten Läufen wiederverwendet. Zugangsdaten
// stehen dadurch nirgends im Code.
//
// Ausführen:
//   npm run dev            (in einem zweiten Terminal)
//   node scripts/screenshots.mjs
//
// Weitere Schalter:
//   --neu-anmelden         gespeicherte Sitzung verwerfen
//   --url=http://…         andere Adresse als http://localhost:5173

import { chromium } from "playwright";
import { existsSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITZUNG = join(wurzel, ".playwright-auth.json");
const ZIEL = join(wurzel, "public", "screenshots");

const argv = process.argv.slice(2);
const basis =
  argv.find((a) => a.startsWith("--url="))?.slice(6) ?? "http://localhost:5173";
const neuAnmelden = argv.includes("--neu-anmelden");

// 1280×800 bei doppelter Pixeldichte ergibt 2560×1600 – dieselbe Größe wie die
// bisherigen Bilder, damit die Landingpage unverändert scharf bleibt.
const ANSICHT = { width: 1280, height: 800 };
const PIXELDICHTE = 2;

/** Seiten, die abfotografiert werden. `vorbereiten` läuft vor dem Auslösen. */
const AUFNAHMEN = [
  {
    datei: "screenshot-calculator.png",
    pfad: "/calculator",
    warteAuf: "text=Vergleich berechnen",
  },
  {
    datei: "screenshot-results.png",
    pfad: "/calculator",
    warteAuf: "text=Vergleich berechnen",
    // Die Ergebnisansicht entsteht aus einer echten Berechnung – so zeigt das
    // Bild garantiert den aktuellen Stand der Anwendung.
    async vorbereiten(seite) {
      await seite.getByRole("button", { name: "Vergleich berechnen" }).click();
      await seite.waitForURL(/\/calculator\/detail/, { timeout: 20_000 });
      await seite.waitForTimeout(1500);
    },
  },
  {
    datei: "screenshot-bestadvice.png",
    pfad: "/best-advice",
    warteAuf: "h1",
  },
  {
    datei: "screenshot-pensiongap.png",
    pfad: "/pension-gap",
    warteAuf: "h1",
  },
  {
    datei: "screenshot-allresults.png",
    pfad: "/results",
    warteAuf: "h1",
  },
];

async function anmeldenUndSpeichern(browser) {
  console.log(
    "\nKeine gespeicherte Sitzung. Es öffnet sich ein Fenster – bitte dort anmelden.\n" +
      "Sobald die Übersicht sichtbar ist, geht es automatisch weiter.\n"
  );
  const kontext = await browser.newContext({ viewport: ANSICHT });
  const seite = await kontext.newPage();
  await seite.goto(`${basis}/login`);
  // Wartet, bis die Anmeldung durch ist (Login-Seite verlassen)
  await seite.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 5 * 60_000,
  });
  await seite.waitForTimeout(2000);
  await kontext.storageState({ path: SITZUNG });
  console.log("Sitzung gespeichert.\n");
  await kontext.close();
}

async function main() {
  mkdirSync(ZIEL, { recursive: true });
  if (neuAnmelden && existsSync(SITZUNG)) unlinkSync(SITZUNG);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
  });

  if (!existsSync(SITZUNG)) await anmeldenUndSpeichern(browser);

  const kontext = await browser.newContext({
    viewport: ANSICHT,
    deviceScaleFactor: PIXELDICHTE,
    storageState: SITZUNG,
    locale: "de-DE",
  });

  // Cookie-Hinweis vorab bestätigen, sonst liegt er über jedem Bild – wie auf
  // den alten Screenshots.
  await kontext.addInitScript(() => {
    try {
      localStorage.setItem("rc_cookie_consent", "1");
    } catch {
      /* egal */
    }
  });

  const seite = await kontext.newPage();

  for (const aufnahme of AUFNAHMEN) {
    process.stdout.write(`${aufnahme.datei} … `);
    await seite.goto(`${basis}${aufnahme.pfad}`, { waitUntil: "networkidle" });
    if (aufnahme.warteAuf) {
      await seite.waitForSelector(aufnahme.warteAuf, { timeout: 20_000 });
    }
    if (aufnahme.vorbereiten) await aufnahme.vorbereiten(seite);
    // Diagramme zeichnen sich mit Verzögerung
    await seite.waitForTimeout(1200);
    await seite.screenshot({ path: join(ZIEL, aufnahme.datei) });
    console.log("fertig");
  }

  await kontext.close();
  await browser.close();
  console.log(`\nAlle Bilder liegen in ${ZIEL}.`);
  console.log(
    "Hinweis: Der Ergebnis-Screenshot legt eine echte Berechnung an – bei Bedarf " +
      "unter „Alle Ergebnisse“ wieder löschen."
  );
}

main().catch((fehler) => {
  console.error(fehler);
  process.exit(1);
});
