import { defineConfig, devices } from "@playwright/test";

/**
 * Durchlauftests gegen die laufende App (Audit F21). Bewusst ohne Anmeldung:
 * echte Zugangsdaten gehören nicht ins Repo. Geprüft wird, dass die
 * öffentlichen Seiten laden, die Rechtstexte erreichbar sind und die
 * Anwendung ohne Konsolenfehler startet.
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
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
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
