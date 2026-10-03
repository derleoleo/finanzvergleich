// Ein vollständiger Beratungsablauf mit Anmeldung (Audit O08, Reihenfolge 3).
//
// Alle Fehler der Audits vom 28.09., 29.09. und 02.10. lagen hinter der
// Anmeldung – genau dort, wo bisher kein Test hinkam. Dieser Durchlauf deckt
// die Kette ab, auf die es in der Beratung ankommt:
//   Eingabe → Berechnen → Kennzahlen → Fassung → Wiederöffnen → PDF
//
// Zwei Wege zur Anmeldung:
//   - lokal: die gespeicherte Sitzung aus .playwright-auth.json (siehe
//     scripts/screenshots.mjs). Keine Zugangsdaten nötig.
//   - CI: E2E_EMAIL und E2E_PASSWORD als Secrets. Fehlen beide und gibt es
//     keine Sitzung, überspringt sich der Test, statt rot zu werden.
//
// Der Test schreibt in die echte Datenbank. Deshalb: eigenes Testkonto,
// eindeutige Namen je Lauf, und am Ende wird aufgeräumt.

import { existsSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SITZUNG = ".playwright-auth.json";
const EMAIL = process.env.E2E_EMAIL ?? "";
const PASSWORT = process.env.E2E_PASSWORD ?? "";
const HAT_SITZUNG = existsSync(SITZUNG);

/** Eindeutig je Lauf, damit parallele Durchläufe sich nicht ins Gehege kommen. */
const LAUF = `E2E-${Date.now().toString(36)}`;

test.describe("Beratungsablauf mit Anmeldung", () => {
  test.skip(
    !HAT_SITZUNG && !(EMAIL && PASSWORT),
    "Weder gespeicherte Sitzung noch E2E_EMAIL/E2E_PASSWORD vorhanden"
  );
  // Der Ablauf umfasst Rechnen, Speichern und PDF-Erzeugung
  test.setTimeout(120_000);

  // Mit gespeicherter Sitzung starten, wenn es sie gibt
  test.use(HAT_SITZUNG ? { storageState: SITZUNG } : {});

  async function anmelden(page: Page) {
    await page.goto("/calculator");
    // Die Umleitung passiert clientseitig, erst nachdem die Sitzung geprüft
    // wurde – sofort nach `goto` steht noch die alte Adresse da.
    await page
      .waitForURL(/\/login/, { timeout: 8_000 })
      .catch(() => undefined);
    // Mit gültiger Sitzung sind wir schon drin
    if (!page.url().includes("/login")) return;

    if (!EMAIL || !PASSWORT) {
      test.skip(true, "Sitzung abgelaufen und keine Zugangsdaten hinterlegt");
      return;
    }
    await page.getByPlaceholder("ihre@email.de").fill(EMAIL);
    await page.getByPlaceholder("Passwort").fill(PASSWORT);
    await page.getByRole("button", { name: /Anmelden|Einloggen/i }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  }

  /** Aufräumen: Der Testfall darf nicht im Konto liegen bleiben. */
  async function loeschen(page: Page, name: string) {
    await page.goto("/results");
    await page.waitForSelector("text=Alle Ergebnisse", { timeout: 30_000 });
    await page.evaluate(() => {
      window.confirm = () => true;
    });
    for (let i = 0; i < 5; i++) {
      const vorhanden = await page.getByText(name, { exact: false }).count();
      if (vorhanden === 0) break;
      const index = await page.evaluate((suche) => {
        const knoepfe = [...document.querySelectorAll('[title="Berechnung löschen"]')];
        return knoepfe.findIndex((k) => k.closest("div")?.innerText?.includes(suche));
      }, name);
      if (index < 0) break;
      await page.locator('[title="Berechnung löschen"]').nth(index).click();
      await page.waitForTimeout(1200);
    }
  }

  test("Berechnen, Fassung festhalten, wiederöffnen, als PDF ausgeben", async ({ page }) => {
    const name = `${LAUF}-Sparvertrag`;
    const absturz: string[] = [];
    page.on("pageerror", (e) => absturz.push(e.message));

    await anmelden(page);

    // --- Eingabe und Berechnung ---------------------------------------
    await page.goto("/calculator");
    await page.getByLabel("Name der Berechnung").fill(name);
    await page.getByRole("button", { name: "Vergleich berechnen" }).click();
    await page.waitForURL(/\/calculator\/detail/, { timeout: 30_000 });

    // --- Kennzahlen sind da -------------------------------------------
    await expect(page.getByText(/Eingezahlt gesamt/i).first()).toBeVisible();
    // Mindestens ein Euro-Betrag muss stehen – sonst wurde nichts gerechnet
    await expect(page.getByText(/\d[\d.]*\s?€/).first()).toBeVisible();

    // --- Fassung wurde festgehalten (Audit O08) ------------------------
    const verlauf = page.locator('[data-pdf-section="versionen"]');
    await expect(verlauf).toBeVisible({ timeout: 20_000 });
    await expect(verlauf.getByRole("button", { name: /Fassung 1/ })).toBeVisible();

    // Fassung öffnen: Die Zahlen von damals müssen erscheinen
    await verlauf.getByRole("button", { name: /Fassung 1/ }).click();
    await expect(verlauf.getByText(name, { exact: false }).first()).toBeVisible();

    const fallUrl = page.url();

    // --- Wiederöffnen liefert denselben Fall ---------------------------
    await page.goto("/results");
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.goto(fallUrl);
    await expect(page.locator('[data-pdf-section="versionen"]')).toBeVisible({
      timeout: 20_000,
    });

    // --- PDF-Export ----------------------------------------------------
    await page.getByRole("button", { name: /PDF/i }).first().click();
    const erstellen = page.getByRole("button", { name: "PDF erstellen" });
    await expect(erstellen).toBeVisible({ timeout: 10_000 });
    // Der Export öffnet das fertige PDF in einem neuen Tab und lädt es nur
    // herunter, wenn der Browser das Fenster blockiert. Beide Wege gelten.
    const neuerTab = page
      .context()
      .waitForEvent("page", { timeout: 90_000 })
      .catch(() => null);
    const download = page.waitForEvent("download", { timeout: 90_000 }).catch(() => null);
    await erstellen.click();
    const ergebnis = await Promise.race([neuerTab, download]);
    expect(ergebnis, "weder Tab noch Download – der Export ist stumm geblieben").toBeTruthy();

    if (ergebnis && "url" in ergebnis && typeof ergebnis.url === "function") {
      const adresse = (ergebnis as { url: () => string }).url();
      expect(adresse, "PDF nicht als Blob geöffnet").toMatch(/^blob:/);
      // Ein leeres oder abgebrochenes PDF faellt sonst nicht auf
      const groesse = await page.evaluate(async (u) => {
        const antwort = await fetch(u);
        return (await antwort.blob()).size;
      }, adresse);
      expect(groesse, "PDF ist verdächtig klein").toBeGreaterThan(10_000);
    }

    expect(absturz, `Abstürze: ${absturz.join(" | ")}`).toHaveLength(0);

    // --- Aufräumen -----------------------------------------------------
    await loeschen(page, name);
    await expect(page.getByText(name, { exact: false })).toHaveCount(0);
  });
});
