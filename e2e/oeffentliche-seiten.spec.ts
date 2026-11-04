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

  test("Supabase liegt nicht im kritischen Pfad der Startseite", async ({ page }) => {
    // Genau die Sorte Zusage, die unbemerkt zurueckfaellt: Ein einziger
    // statischer Import in irgendeinem Modul des Eintrittsbuendels zieht die
    // 212,7 kB wieder herein. So war es vor dieser Aenderung ueber
    // AuthContext, SubscriptionContext, Layout und ConsentGate - und zuletzt
    // ueber migrateLocalData, das ueber fuenf Entitaeten am Client haengt und
    // erst beim Messen auffiel.
    //
    // Geprueft wird die ausgelieferte index.html, nicht die Konfiguration:
    // Nennt sie das Supabase-Stueck, laedt der Browser es vor dem ersten Bild.
    // Nennt sie es nicht, kommt es spaeter und blockiert nichts.
    //
    // Was dieser Test ausdruecklich NICHT behauptet: dass ein Gast Supabase
    // nie laedt. Der Effekt in AuthContext holt es kurz nach dem Mounten -
    // nur eben nebenlaeufig. Siehe docs/startseite-buendel.md.
    const html = await (await page.request.get("/")).text();
    const treffer = html.match(/assets\/supabase-[^"']*\.js/g) ?? [];
    expect(
      treffer,
      `index.html laedt Supabase wieder vorab: ${treffer.join(" | ")}`,
    ).toHaveLength(0);

    // Und die Seite steht auch wirklich ohne es.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("Die Ueberblicksseite ist ohne Anmeldung erreichbar", async ({ page }) => {
    // „Was ist das hier eigentlich?" - die Seite entstand, weil die Search
    // Console zeigte, dass das Werkzeug gesucht wird und keine Seite diese
    // Frage zusammenhaengend beantwortet. Hinter der Anmeldung waere sie
    // wertlos.
    await page.goto("/was-ist-vorsorgewaage");
    await expect(page).toHaveURL(/\/was-ist-vorsorgewaage$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Was ist");

    // Eigener Kopf statt des Kopfes der Startseite.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.vorsorgewaage.de/was-ist-vorsorgewaage",
    );
    await expect(page).toHaveTitle(/^Was ist Vorsorgewaage\?/);

    // Die Grenzen muessen auf der Seite stehen, nicht nur die Faehigkeiten:
    // Ein Besucher, der ein Pensionsrueckstellungs-Werkzeug sucht, soll das
    // hier lesen und nicht erst nach der Anmeldung merken.
    await expect(page.getByText(/Pensionsrückstellungen/)).toBeVisible();
    await expect(page.getByText(/[Kk]eine Anlageberatung/)).toBeVisible();

    // Und der Weg weiter ist da.
    await expect(page.getByRole("link", { name: /Beispielfall/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Impressum" }).first()).toBeVisible();
  });

  test("Die Funktionsseite ist erreichbar und ihre Anker springen", async ({ page }) => {
    // Anlass: Ein Nutzer hatte nicht bemerkt, dass sich Sonderentnahmen im
    // Entnahmeplan einzeln bearbeiten lassen - sie liegen hinter einem
    // Schalter. Die Seite erklaert je Rechner, was leicht zu uebersehen ist.
    await page.goto("/was-die-rechner-koennen");
    await expect(page).toHaveURL(/\/was-die-rechner-koennen$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Was die Rechner können",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.vorsorgewaage.de/was-die-rechner-koennen",
    );

    // Der Anlassfall muss benannt sein, sonst traegt die Seite ihren Zweck
    // nicht.
    await expect(page.getByText(/Expertenmodus/).first()).toBeVisible();

    // Die Anker sind der Grund fuer eine einzelne Seite statt sieben: Aus
    // einem Rechner soll direkt der passende Abschnitt erreichbar sein.
    // `marked` setzt keine IDs an Ueberschriften - die stehen als rohes HTML
    // in der Markdown-Datei, und genau das wird hier geprueft.
    for (const anker of ["entnahmeplan", "avd", "voreinstellungen"]) {
      await expect(page.locator(`#${anker}`)).toHaveCount(1);
    }
    // `toBeInViewport()` reicht hier nicht: Die Ueberschrift stand nach dem
    // Sprung exakt bei top: 0 und damit vollstaendig hinter der klebenden
    // Kopfleiste - der Test war trotzdem gruen. Geprueft wird deshalb, dass
    // sie unterhalb der Leiste zu liegen kommt.
    // Zwei Fallen auf einmal, beide hier erlebt:
    //   1. `toBeInViewport()` reicht nicht - die Ueberschrift stand nach dem
    //      Sprung exakt bei top: 0 und damit vollstaendig hinter der
    //      klebenden Kopfleiste, der Test war trotzdem gruen.
    //   2. Das Scrollen gleitet. Wer direkt nach dem Laden misst, misst
    //      mitten in der Bewegung - bei rund 4.100 px Weg waren das beim
    //      ersten Versuch 4.165 px daneben. Deshalb `expect.poll`, bis die
    //      Seite zur Ruhe gekommen ist.
    await page.goto("/was-die-rechner-koennen#entnahmeplan");
    await page.evaluate(() => document.fonts.ready);
    const kopfhoehe = await page.evaluate(
      () => document.querySelector("header")!.getBoundingClientRect().height,
    );
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            Math.round(
              document.querySelector("#entnahmeplan")!.getBoundingClientRect().top,
            ),
          ),
        { message: `Ueberschrift muss unter die ${kopfhoehe} px hohe Kopfleiste` },
      )
      .toBeGreaterThanOrEqual(Math.round(kopfhoehe));

    await expect(page.getByRole("link", { name: "Impressum" }).first()).toBeVisible();
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

    // Eigener Kopf statt des Kopfes der Startseite. Faellt der Server auf
    // die SPA-Umschreibung zurueck, steht hier wieder das Canonical der
    // Startseite - und Google haelt die Seite fuer eine Dublette.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.vorsorgewaage.de/pricing",
    );
    // Der Preis steht im Title: "Preise – Vorsorgewaage" waren 22 von rund 60
    // Zeichen, die Google zeigt, und nannten keinen Grund zum Klicken.
    await expect(page).toHaveTitle(/^Preise: .+ im Monat oder .+ im Jahr – Vorsorgewaage$/);
    await expect(page).toHaveTitle(/59 €/);

    await page.goto("/beispiel");
    await expect(page).toHaveURL(/\/beispiel$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.vorsorgewaage.de/beispiel",
    );
    await expect(page).toHaveTitle(/^Beispielfall/);
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
    // Der Title traegt die Kurzform (sonst kuerzt Google ihn), die sichtbare
    // Ueberschrift die ausformulierte These. Zwei Felder, zwei Aufgaben -
    // siehe `kurztitel` in src/utils/ratgeber.ts.
    await expect(page).toHaveTitle(/^Grenzförderquote im Altersvorsorgedepot – Vorsorgewaage$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Warum der nächste Euro weniger bringt/ }),
    ).toBeVisible();
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

test.describe("Agentisches Browsen", () => {
  /*
   * Geprueft wird der rohe Abruf, nicht die gerenderte Seite: `page.request`
   * holt die HTML, ohne JavaScript auszufuehren - genau wie die Abrufer der
   * Assistenten (ChatGPT-User, Claude-User, PerplexityBot, OAI-SearchBot),
   * die `robots.txt` ausdruecklich hereinlaesst.
   *
   * Gemessen vor dieser Aenderung: `/` und `/beispiel` lieferten im Rumpf
   * null Woerter, `/pricing` zwoelf. Ein Assistent, dem ein Mensch die
   * Adresse nennt, bekam eine leere Seite zu lesen.
   */
  function rumpftext(html: string): string {
    const rumpf = html.slice(html.indexOf("<body"));
    return rumpf
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  for (const pfad of ["/", "/beispiel", "/pricing", "/impressum", "/compliance"]) {
    test(`${pfad} liefert Text ohne JavaScript`, async ({ page }) => {
      const html = await (await page.request.get(pfad)).text();
      const text = rumpftext(html);
      expect(
        text.split(" ").length,
        `${pfad} liefert ohne JavaScript fast nichts: "${text.slice(0, 120)}"`,
      ).toBeGreaterThan(30);
      // Und der Vorabtext gehoert zu DIESER Adresse, nicht zur Startseite.
      expect(html.match(/<noscript>/g) ?? []).toHaveLength(1);
    });
  }

  test("die Startseite nennt ohne JavaScript die Rechner und die Wege weiter", async ({ page }) => {
    const text = rumpftext(await (await page.request.get("/")).text());
    expect(text).toContain("Fonds-Sparvertrag");
    expect(text).toContain("Altersvorsorgedepot");
    expect(text).toContain("Ohne JavaScript");
  });

  test("llms.txt wird ausgeliefert und nennt die Ratgeberbeitraege", async ({ page }) => {
    const antwort = await page.request.get("/llms.txt");
    expect(antwort.status()).toBe(200);
    const txt = await antwort.text();
    expect(txt.startsWith("# Vorsorgewaage")).toBe(true);
    expect(txt).toContain("/ratgeber/");
    expect(txt).toContain("keine** Finanz-, Steuer- oder Rechtsberatung");
  });

  test("ein Besucher mit JavaScript sieht den Vorabtext nicht", async ({ page }) => {
    // Der Grund fuer `<noscript>` statt Inhalt in `#root`: An der Ansicht
    // darf sich nichts aendern, auch nicht kurz beim Laden.
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Ohne JavaScript vollständig lesbar")).toHaveCount(0);
  });
});
