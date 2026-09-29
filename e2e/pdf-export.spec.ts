import { expect, test } from "@playwright/test";

/**
 * Prüft den PDF-Export ohne Anmeldung (Audit F22): Auf der öffentlichen Seite
 * wird ein hoher Inhaltsbereich eingesetzt und der Export aufgerufen. Erwartet
 * wird eine PDF mit mehreren A4-Seiten statt einer überlangen Einzelseite.
 *
 * Läuft nur gegen den Dev-Server, weil dort die Quellmodule einzeln erreichbar
 * sind. Ohne Dev-Server wird der Test übersprungen.
 */
const DEV_URL = "http://localhost:5173";

test("Export erzeugt mehrseitige A4-PDF", async ({ page }) => {
  const erreichbar = await page.request.get(DEV_URL).then((r) => r.ok()).catch(() => false);
  test.skip(!erreichbar, "Dev-Server läuft nicht (npm run dev)");

  await page.goto(DEV_URL);
  await page.waitForLoadState("networkidle");

  const ergebnis = await page.evaluate(async () => {
    // Hoher Testinhalt, damit mehrere Seiten entstehen
    const box = document.createElement("div");
    box.id = "pdf-content";
    box.style.cssText = "width:900px;background:#fff;padding:20px;font-family:sans-serif";
    box.innerHTML = Array.from({ length: 60 })
      .map((_, i) => `<div data-pdf-section="ergebnis" style="height:60px">Zeile ${i + 1}</div>`)
      .join("");
    document.body.appendChild(box);

    let blob: Blob | null = null;
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = function (b: Blob) { blob = b; return origCreate.call(URL, b); };
    const origOpen = window.open;
    window.open = () => ({ focus() {} }) as unknown as Window;

    const { exportSections } = await import("/src/utils/exportPDF.ts");
    await exportSections("pdf-content", ["ergebnis"], "test", "Testauswertung");

    URL.createObjectURL = origCreate;
    window.open = origOpen;
    if (!blob) return { seiten: 0, groesse: 0 };
    const text = await blob.text();
    return {
      seiten: (text.match(/\/Type\s*\/Page[^s]/g) || []).length,
      groesse: blob.size,
    };
  });

  expect(ergebnis.groesse, "PDF wurde erzeugt").toBeGreaterThan(1000);
  expect(ergebnis.seiten, "mehrere A4-Seiten").toBeGreaterThan(1);
});
