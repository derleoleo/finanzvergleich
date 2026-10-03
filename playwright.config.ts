import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Wogegen der angemeldete Durchlauf läuft.
 *
 * Lokal gibt es eine gespeicherte Sitzung – die gehört zum Ursprung
 * localhost:5173, also muss der Dev-Server her. In der CI gibt es keine
 * Sitzung; dort wird über das Formular angemeldet, und die gebaute App auf
 * 4173 ist die bessere Wahl: Der Dev-Server übersetzt jedes Modul erst beim
 * ersten Aufruf und braucht auf einem kalten Rechner länger, als jede
 * vernünftige Wartezeit zulässt.
 */
const ANGEMELDET_BASIS =
  process.env.E2E_BASE_URL ??
  (existsSync(".playwright-auth.json") ? "http://localhost:5173" : "http://localhost:4173");

/**
 * Durchlauftests gegen die laufende App (Audit F21).
 *
 * Projekt `chrome`: öffentliche Seiten, ohne Anmeldung – läuft immer.
 * Projekt `chrome-angemeldet`: der vollständige Beratungsablauf. Er schreibt
 * in die echte Datenbank und läuft deshalb nur auf Abruf
 * (`npm run test:e2e:angemeldet`) bzw. in der CI, wenn Zugangsdaten als
 * Secrets hinterlegt sind. Echte Zugangsdaten gehören nicht ins Repo.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4173",
    trace: "on-first-retry",
  },
  // Nutzt das installierte Chrome statt eines eigenen Browser-Downloads;
  // in der CI stellt "playwright install chrome" es bereit.
  projects: [
    {
      name: "chrome",
      // Der angemeldete Durchlauf schreibt in die echte Datenbank und laeuft
      // deshalb nicht bei jedem `npm run test:e2e` mit, sondern nur im
      // eigenen Projekt.
      testIgnore: /beratungsablauf\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "chrome-angemeldet",
      testMatch: /beratungsablauf\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        baseURL: ANGEMELDET_BASIS,
      },
    },
  ],
  // Zwei Server: die gebaute App für die Seitentests und der Dev-Server für
  // den PDF-Test, der Quellmodule einzeln lädt.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "npm run preview -- --port 4173",
          url: "http://localhost:4173",
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
        {
          command: "npm run dev -- --port 5173",
          url: "http://localhost:5173",
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
});
