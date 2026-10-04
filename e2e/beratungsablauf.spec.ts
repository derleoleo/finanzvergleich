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

/**
 * Auf dem Hauptzweig sind die Zugangsdaten hinterlegt – fehlen sie dort, ist
 * das ein Fehler und kein Grund zum Überspringen. Ein stillschweigend
 * übersprungener Test gibt einen grünen Haken für eine Prüfung, die nie
 * stattgefunden hat. In Forks und fremden Pull Requests bleibt es beim
 * Überspringen, dort gibt es die Secrets zu Recht nicht.
 */
const PFLICHT = process.env.E2E_PFLICHT === "true";

test.describe("Beratungsablauf mit Anmeldung", () => {
  test.skip(
    !PFLICHT && !HAT_SITZUNG && !(EMAIL && PASSWORT),
    "Weder gespeicherte Sitzung noch E2E_EMAIL/E2E_PASSWORD vorhanden"
  );
  // Der Ablauf umfasst Anmeldung, Rechnen, Speichern und PDF-Erzeugung. Auf
  // einem kalten CI-Rechner baut der Dev-Server die Module erst beim ersten
  // Aufruf, das dauert deutlich länger als lokal.
  test.setTimeout(240_000);

  // Mit gespeicherter Sitzung starten, wenn es sie gibt
  test.use(HAT_SITZUNG ? { storageState: SITZUNG } : {});

  /**
   * Stellt sicher, dass der Rechner bedienbar ist.
   *
   * Nicht über die Adresse raten, ob eine Anmeldung nötig ist: Die Umleitung
   * passiert clientseitig, und auf einem kalten Rechner baut die Seite
   * langsamer auf als jede Wartezeit, die man dafür ansetzen würde. Stattdessen
   * wird abgewartet, was tatsächlich erscheint – Anmeldeformular, Rechner oder
   * Einwilligungsabfrage – und danach gehandelt.
   */
  async function anmelden(page: Page) {
    const formular = page.locator('input[type="email"]');
    const rechner = page.getByLabel("Name der Berechnung");
    const einwilligung = page.getByText("Zustimmung erforderlich");

    // Stürzt die App beim Start ab, bleibt die Seite leer und keine der drei
    // Marken erscheint. Ohne diese Meldungen sieht man nur "nichts gefunden"
    // und sucht an der falschen Stelle.
    const probleme: string[] = [];
    page.on("pageerror", (e) => probleme.push(`Absturz: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") probleme.push(`Konsole: ${m.text()}`);
    });

    await page.goto("/calculator");
    try {
      await expect(formular.or(rechner).or(einwilligung)).toBeVisible({
        timeout: 90_000,
      });
    } catch {
      throw new Error(
        "Die App hat weder Anmeldung, Rechner noch Einwilligung angezeigt. " +
          (probleme.length
            ? `Meldungen der Seite: ${probleme.slice(0, 5).join(" | ")}`
            : "Die Seite meldete dabei nichts.")
      );
    }

    if (await rechner.isVisible()) return;

    if (await einwilligung.isVisible()) {
      throw new Error(
        "Für das Testkonto fehlen die Einwilligungen. Einmal von Hand anmelden " +
          "und bestätigen – ein Test darf das nicht stellvertretend zusagen."
      );
    }

    if (!EMAIL || !PASSWORT) {
      if (PFLICHT) {
        throw new Error(
          "Anmeldung nötig, aber E2E_EMAIL/E2E_PASSWORD fehlen. " +
            "Auf dem Hauptzweig müssen die Secrets gesetzt sein."
        );
      }
      test.skip(true, "Sitzung abgelaufen und keine Zugangsdaten hinterlegt");
      return;
    }

    await page.getByPlaceholder("ihre@email.de").fill(EMAIL);
    await page.getByPlaceholder("Passwort").fill(PASSWORT);
    // Ausdrücklich der Absendeknopf: Der Reiter darüber heißt genauso, und
    // ein Klick darauf tut nichts – der Test liefe in die Zeitüberschreitung.
    await page.locator('button[type="submit"]').click();

    // Nach der Anmeldung geht es auf die Übersicht, nicht zurück zum Rechner
    // (Login.tsx navigiert auf "/"). Erst abwarten, dass die Anmeldeseite
    // verlassen wurde, dann den Rechner selbst aufrufen.
    try {
      await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 });
    } catch {
      throw new Error(await anmeldefehler(page));
    }

    await page.goto("/calculator");
    try {
      await expect(rechner.or(einwilligung)).toBeVisible({ timeout: 60_000 });
    } catch {
      const ueberschrift = await page
        .locator("h1, h2")
        .first()
        .textContent()
        .catch(() => null);
      throw new Error(
        `Nach der Anmeldung öffnet der Rechner nicht. Adresse: ${page.url()}` +
          (ueberschrift ? `, Überschrift: „${ueberschrift.trim()}"` : "") +
          (probleme.length ? `, Meldungen: ${probleme.slice(0, 3).join(" | ")}` : "")
      );
    }

    if (await einwilligung.isVisible()) {
      throw new Error(
        "Für das Testkonto fehlen die Einwilligungen. Einmal von Hand anmelden " +
          "und bestätigen – ein Test darf das nicht stellvertretend zusagen."
      );
    }
  }

  /** Die Meldung der Seite ist im Protokoll mehr wert als eine Zeitüberschreitung. */
  async function anmeldefehler(page: Page): Promise<string> {
    const meldung = await page
      .locator("p.text-red-600")
      .first()
      .textContent({ timeout: 2_000 })
      .catch(() => null);
    return meldung
      ? `Anmeldung fehlgeschlagen: ${meldung.trim()}`
      : "Die Anmeldeseite wurde nicht verlassen, meldete aber keinen Fehler";
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
    // `anmelden` hat den Rechner bereits geöffnet
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

    // --- Die Fassung vollständig öffnen (Audit O08) ----------------------
    // Das PDF muss die gespeicherte Fassung zeigen, nicht eine Neuberechnung.
    // Die Fassungsansicht rechnet nichts; nur deshalb kann der Export, der das
    // Fenster rastert, überhaupt eine Fassung wiedergeben.
    // Nach dem Wiederöffnen der Seite ist der Verlauf zugeklappt
    const verlaufNeu = page.locator('[data-pdf-section="versionen"]');
    await verlaufNeu.getByRole("button", { name: /Fassung 1/ }).click();
    await verlaufNeu.getByRole("link", { name: /Vollständig öffnen/ }).click();
    await page.waitForURL(/\/fassung/, { timeout: 30_000 });
    await expect(page.getByText(`Fassung 1 · gespeichert am`)).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText("Diese Seite zeigt ausschließlich die Werte")
    ).toBeVisible();
    // Der Modellstand gehört sichtbar dazu – sonst ist die Fassung nicht
    // einzuordnen.
    await expect(page.getByText(/Modell \d{4}-\d{2}-\d{2}/)).toBeVisible();

    // --- PDF-Export ----------------------------------------------------
    await page.getByRole("button", { name: /^PDF$/ }).first().click();
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
