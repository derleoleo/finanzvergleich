import { expect, test } from "@playwright/test";

test.describe("Öffentliche Seiten", () => {
  test("Landingpage zeigt Marke, Preis und Rechtslinks", async ({ page }) => {
    const fehler: string[] = [];
    // Abstürze zählen immer. Netzwerkfehler nicht: In der CI gibt es keine
    // echten Supabase-Zugangsdaten, die Anmeldeabfrage schlägt dort fehl.
    page.on("pageerror", (e) => fehler.push(e.message));
    page.on("console", (m) => {
      const text = m.text();
      const netzwerk =
        /Failed to load resource|net::|supabase|nicht-konfiguriert/i.test(text);
      if (m.type() === "error" && !netzwerk) fehler.push(text);
    });

    await page.goto("/");
    await expect(page).toHaveTitle(/Vorsorgewaage/);
    await expect(page.getByRole("link", { name: "Impressum" }).first()).toBeVisible();
    await expect(page.getByText(/59/).first()).toBeVisible();
    expect(fehler, `Konsolenfehler: ${fehler.join(" | ")}`).toHaveLength(0);
  });

  test("Preise und Beispielfall sind ohne Anmeldung erreichbar", async ({ page }) => {
    // Beide Seiten lagen hinter der Anmeldung bzw. gab es nicht. Sie sind die
    // Zielseiten fuer Suche und Anzeigen; eine Umleitung zum Login waere der
    // teuerste denkbare Fehler.
    await page.goto("/pricing");
    await expect(page).toHaveURL(/\/pricing$/);
    await expect(page.getByRole("button", { name: "Kostenlos starten" }).first())
      .toBeVisible();
    await expect(page.getByRole("link", { name: "Impressum" }).first()).toBeVisible();
    // Das Codefeld braucht eine Sitzung und darf Gaesten nicht erscheinen.
    await expect(page.getByText(/Zugangscode einlösen/)).toHaveCount(0);

    await page.goto("/beispiel");
    await expect(page).toHaveURL(/\/beispiel$/);
    await expect(page.getByRole("heading", { name: /Fondspolice oder Depot/ }))
      .toBeVisible();
    // Die Zahlen rechnet die Seite selbst; die Beitragssumme ist fest.
    await expect(page.getByText(/72\.000/).first()).toBeVisible();
  });

  test("Der Ratgeber ist statisch und traegt eigene Metadaten", async ({ page }) => {
    // Der ganze Grund fuer das Ratgeber-Plugin: eigener Title, eigene
    // Description, eigenes Canonical. Liefert Vercel stattdessen die SPA aus,
    // faellt genau das hier auf.
    await page.goto("/ratgeber/");
    await expect(page).toHaveTitle(/^Ratgeber – Vorsorgewaage$/);

    const beitrag = page.getByRole("link", { name: /Grenzförderquote/ }).first();
    await expect(beitrag).toBeVisible();
    await beitrag.click();

    await expect(page).toHaveURL(/\/ratgeber\/grenzfoerderquote-altersvorsorgedepot\/$/);
    await expect(page).toHaveTitle(/^Grenzförderquote beim Altersvorsorgedepot/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.vorsorgewaage.de/ratgeber/grenzfoerderquote-altersvorsorgedepot/",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      /Grundzulage im Altersvorsorgedepot/,
    );
    // Eine Zahl aus der nachgerechneten Tabelle - sie steht im ausgelieferten
    // HTML, nicht erst nach dem Ausfuehren von JavaScript.
    await expect(page.getByText("250,0 %")).toBeVisible();
    // § 5 DDG: von jeder Seite erreichbar.
    await expect(page.getByRole("link", { name: "Impressum" })).toBeVisible();
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
