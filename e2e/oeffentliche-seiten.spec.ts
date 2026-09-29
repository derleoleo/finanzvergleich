import { expect, test } from "@playwright/test";

test.describe("Öffentliche Seiten", () => {
  test("Landingpage zeigt Marke, Preis und Rechtslinks", async ({ page }) => {
    const fehler: string[] = [];
    page.on("pageerror", (e) => fehler.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") fehler.push(m.text());
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/Vorsorgewaage/);
    await expect(page.getByRole("link", { name: "Impressum" }).first()).toBeVisible();
    await expect(page.getByText(/59/).first()).toBeVisible();
    expect(fehler, `Konsolenfehler: ${fehler.join(" | ")}`).toHaveLength(0);
  });

  test("Rechtstexte sind erreichbar", async ({ page }) => {
    for (const [pfad, ueberschrift] of [
      ["/impressum", "Impressum"],
      ["/datenschutz", "Datenschutz"],
      ["/agb", "Allgemeine Geschäftsbedingungen"],
      ["/legal/avv", "Auftragsverarbeitung"],
    ] as const) {
      await page.goto(pfad);
      await expect(page.getByRole("heading", { name: new RegExp(ueberschrift, "i") }).first())
        .toBeVisible();
    }
  });

  test("Geschützte Seiten leiten zur Anmeldung", async ({ page }) => {
    await page.goto("/calculator");
    await expect(page.getByRole("button", { name: /Anmelden/i }).first()).toBeVisible();
  });

  test("Landingpage nennt Endpreise ohne Umsatzsteuer", async ({ page }) => {
    // /pricing liegt hinter der Anmeldung; die Preise stehen auch auf der Landingpage
    await page.goto("/");
    await expect(page.getByText(/59/).first()).toBeVisible();
    await expect(page.getByText(/keine Umsatzsteuer|Endpreis/i).first()).toBeVisible();
    await expect(page.getByText(/zzgl\. MwSt/i)).toHaveCount(0);
  });

  test("Waage-Logik ist auf der Landingpage nicht wertend formuliert", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/ist besser/i)).toHaveCount(0);
  });
});
