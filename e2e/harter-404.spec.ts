import { expect, test } from "@playwright/test";

/*
 * Der harte 404, am Statuscode gemessen.
 *
 * Vorher lieferte jede erfundene Adresse HTTP 200, die Startseiten-HTML, das
 * Canonical der Startseite und `index, follow` - beliebig viele Adressen
 * behaupteten also, die Startseite zu sein, und luden zur Indexierung ein.
 *
 * Geprueft wird gegen `vite preview`, dessen SPA-Rueckfall das Plugin
 * `vorsorgewaage-vorschau` durch die Vercel-Regel ersetzt (Datei da ->
 * ausliefern, sonst `404.html` mit Status 404). Ohne diese Nachbildung wuerde
 * dieser Test das Gegenteil dessen messen, was live passiert.
 *
 * Die Gegenprobe steht dabei an erster Stelle: Ein Test, der nur das 404
 * prueft, waere auch dann gruen, wenn ALLES 404 liefert - und genau das ist
 * der Fehler, den diese Umstellung einfuehren kann.
 */

/** Jede gueltige Adresse muss weiter erreichbar sein. Das ist der Preis. */
const ERREICHBAR = [
  "/",
  "/pricing",
  "/beispiel",
  "/legal/avv",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/compliance",
  // Hinter der Anmeldung, aber ausgeliefert werden muss die Huelle trotzdem -
  // sonst waere jeder Rechner nach einem Neuladen weg.
  "/calculator",
  "/calculator/detail",
  "/withdrawal-plan",
  "/altersvorsorgedepot",
  "/profile",
  "/login",
  "/reset-password",
  // Gebaute Seiten, die es ohne die Anwendung gibt.
  "/was-ist-vorsorgewaage",
  "/was-die-rechner-koennen",
  "/ratgeber/",
  "/ratgeber/begruendungspflicht-paragraf-61-vvg/",
  "/llms.txt",
  "/robots.txt",
  "/sitemap.xml",
];

/** Und nur, was es nicht gibt, darf 404 sein. */
const NICHT_DA = [
  "/gibtsnicht",
  "/calculator/gibtsnicht",
  "/ratgeber/gibtsnicht/",
  "/gibtesnicht.txt",
  "/ai-catalog.json",
];

test.describe("Harter 404", () => {
  for (const pfad of ERREICHBAR) {
    test(`${pfad} bleibt erreichbar`, async ({ page }) => {
      const antwort = await page.request.get(pfad);
      expect(antwort.status(), `${pfad} ist nicht mehr erreichbar`).toBe(200);
    });
  }

  for (const pfad of NICHT_DA) {
    test(`${pfad} antwortet mit 404`, async ({ page }) => {
      const antwort = await page.request.get(pfad);
      expect(antwort.status()).toBe(404);
    });
  }

  test("die Fehlerseite hilft weiter und laedt sich nicht selbst zur Indexierung ein", async ({ page }) => {
    const html = await (await page.request.get("/gibtsnicht")).text();
    expect(html).toContain("Diese Seite gibt es nicht");
    expect(html).toContain('content="noindex, follow"');
    // Der Kern des Befunds: kein Canonical, das diese Adresse zur Startseite erklaert.
    expect(html).not.toContain('rel="canonical"');
    // Die vier Wege.
    for (const ziel of ["/beispiel", "/ratgeber/", "/pricing"]) {
      expect(html).toContain(`href="https://www.vorsorgewaage.de${ziel}"`);
    }
  });

  test("Adressen hinter der Anmeldung sind nicht mehr Dubletten der Startseite", async ({ page }) => {
    const html = await (await page.request.get("/calculator")).text();
    expect(html).toContain('content="noindex, nofollow"');
    expect(html).not.toContain('rel="canonical"');
  });

  test("ein Gast auf einer unbekannten Adresse landet nicht im Login", async ({ page }) => {
    // Der zweite Teil des Befunds: Die 404-Ansicht lag hinter `ProtectedRoute`,
    // ein Gast wurde also nach `/login` geschickt statt auf „nicht gefunden".
    await page.goto("/gibtsnicht");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Diese Seite gibt es nicht");
  });
});
