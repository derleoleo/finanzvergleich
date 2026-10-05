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
  // Nacheinander, nicht parallel: Alle Tests teilen sich ein Konto und
  // raeumen ihre Faelle ueber die Ergebnisliste wieder weg. Loeschen vier
  // Arbeiter gleichzeitig darin herum, verschiebt sich die Liste zwischen
  // Suchen und Klicken - dann bleiben Faelle liegen. `default` heisst
  // ausserdem: Ein Fehlschlag ueberspringt die uebrigen Tests nicht.
  test.describe.configure({ mode: 'default' });
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

  /**
   * Namen, die dieser Lauf angelegt hat. Bricht ein Test ab, raeumte er
   * frueher nicht auf - nach ein paar roten Laeufen lagen Dutzende Testfaelle
   * im Konto. Deshalb passiert das Aufraeumen jetzt unabhaengig vom Ausgang.
   */
  const angelegt: string[] = [];

  test.afterEach(async ({ page }) => {
    while (angelegt.length > 0) {
      const name = angelegt.pop()!;
      await loeschen(page, name).catch(() => undefined);
    }
  });

  /**
   * Aufräumen: Der Testfall darf nicht im Konto liegen bleiben.
   *
   * Die Überschrift „Alle Ergebnisse“ steht schon da, bevor die Liste
   * geladen ist. Wer danach sofort sucht, findet nichts und hört auf -
   * genau daran scheiterte das Aufräumen bisher stillschweigend, und nach
   * einigen Läufen lagen Dutzende Testfälle im Konto. Deshalb wird auf den
   * Eintrag selbst gewartet.
   */
  async function loeschen(page: Page, name: string) {
    await page.goto("/results");
    await page.waitForSelector("text=Alle Ergebnisse", { timeout: 30_000 });
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    const eintrag = page.getByText(name, { exact: false }).first();
    try {
      await eintrag.waitFor({ state: "visible", timeout: 20_000 });
    } catch {
      // Nichts zu löschen - der Test ist vor dem Speichern gescheitert.
      return;
    }

    for (let i = 0; i < 6; i++) {
      const index = await page.evaluate((suche) => {
        const knoepfe = [...document.querySelectorAll('[title="Berechnung löschen"]')];
        return knoepfe.findIndex((k) => k.closest("div")?.innerText?.includes(suche));
      }, name);
      if (index < 0) break;
      await page.locator('[title="Berechnung löschen"]').nth(index).click();
      // Auf das Verschwinden warten, nicht auf die Uhr
      await page
        .getByText(name, { exact: false })
        .nth(0)
        .waitFor({ state: "detached", timeout: 15_000 })
        .catch(() => undefined);
    }

    await expect(page.getByText(name, { exact: false })).toHaveCount(0, { timeout: 15_000 });
  }

  /**
   * Liest eine geöffnete Fassungsansicht vollständig aus.
   *
   * Bewusst Inhalte und nicht nur Vorhandensein: Der bisherige Durchlauf
   * prüfte, *dass* eine Fassung erscheint. Dass die Neuberechnung keine
   * Zeitreihen mitschrieb und das Alter als Euro-Betrag erschien, blieb
   * dabei unsichtbar.
   */
  async function fassungLesen(page: Page) {
    await page.waitForURL(/\/fassung/, { timeout: 30_000 });
    await expect(page.getByText(/Fassung \d+ · gespeichert am/)).toBeVisible({
      timeout: 20_000,
    });
    return page.evaluate(() => {
      const abschnitt = (id: string) =>
        document.querySelector(`[data-pdf-section="${id}"]`) as HTMLElement | null;
      const tabelle = abschnitt('tabelle')?.querySelector('table');
      return {
        kennzahlen: [...(abschnitt('kennzahlen')?.querySelectorAll('.rounded-xl') ?? [])].map(
          (k) => (k as HTMLElement).innerText.split(String.fromCharCode(10)).join(': ')
        ),
        hatVerlauf: !!abschnitt('verlauf'),
        hatEingaben: !!abschnitt('eingaben'),
        spalten: [...(tabelle?.querySelectorAll('th') ?? [])].map((x) =>
          (x as HTMLElement).innerText.trim()
        ),
        ersteZeile: [...(tabelle?.querySelector('tbody tr')?.querySelectorAll('td') ?? [])].map(
          (x) => (x as HTMLElement).innerText.trim()
        ),
        zeilen: tabelle?.querySelectorAll('tbody tr').length ?? 0,
        text: document.body.innerText,
      };
    });
  }

  /** Von der Detailseite aus die gewählte Fassung vollständig öffnen. */
  async function fassungOeffnen(page: Page, nummer: number) {
    const verlauf = page.locator('[data-pdf-section="versionen"]');
    await expect(verlauf).toBeVisible({ timeout: 30_000 });
    await verlauf.getByRole("button", { name: new RegExp("Fassung " + nummer + "\\b") }).first().click();
    await verlauf.getByRole("link", { name: /Vollständig öffnen/ }).click();
    return fassungLesen(page);
  }

  test("Berechnen, Fassung festhalten, wiederöffnen, als PDF ausgeben", async ({ page }) => {
    const name = `${LAUF}-Sparvertrag`;
    angelegt.push(name);
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

  });

  /**
   * Prüfung 1 der Analyse vom 04.10.: Zwei Fassungen desselben Falls.
   *
   * Der bisherige Durchlauf sah nur Fassung 1 und prüfte, dass sie da ist.
   * Dass die Neuberechnung keine Zeitreihen mitschrieb — Fassung 1 also eine
   * Kurve hatte und Fassung 2 desselben Falls nicht —, konnte er nicht
   * sehen. Deshalb hier: beide Fassungen einzeln öffnen und ihre Inhalte
   * vergleichen.
   */
  test("Zwei Fassungen desselben Falls bleiben getrennt und vollständig", async ({
    page,
  }) => {
    const name = `${LAUF}-Zweifassungen`;
    angelegt.push(name);
    const absturz: string[] = [];
    page.on("pageerror", (e) => absturz.push(e.message));

    await anmelden(page);
    await page.getByLabel("Name der Berechnung").fill(name);
    await page.getByRole("button", { name: "Vergleich berechnen" }).click();
    await page.waitForURL(/\/calculator\/detail/, { timeout: 30_000 });

    const fallUrl = page.url();
    const erste = await fassungOeffnen(page, 1);

    // --- Eingabe ändern und erneut speichern --------------------------
    await page.goto(fallUrl);
    const beitrag = page.getByLabel(/Monatlicher Beitrag/);
    await expect(beitrag).toBeVisible({ timeout: 30_000 });
    await beitrag.fill("250");
    await page.getByRole("button", { name: /Neu berechnen & speichern/ }).click();
    await expect(
      page.locator('[data-pdf-section="versionen"]').getByRole("button", { name: /Fassung 2/ })
    ).toBeVisible({ timeout: 40_000 });

    const zweite = await fassungOeffnen(page, 2);

    // --- Beide Fassungen sind vollständig ------------------------------
    for (const [bezeichnung, f] of [
      ["Fassung 1", erste],
      ["Fassung 2", zweite],
    ] as const) {
      expect(f.kennzahlen.length, `${bezeichnung} ohne Kennzahlen`).toBeGreaterThan(0);
      // Genau hier lag der Fehler: Die Neuberechnung hielt keine Reihen fest.
      expect(f.hatVerlauf, `${bezeichnung} ohne Verlauf`).toBe(true);
      expect(f.zeilen, `${bezeichnung} ohne Jahreszeilen`).toBeGreaterThan(1);
      expect(f.hatEingaben, `${bezeichnung} ohne Eingaben`).toBe(true);
    }

    // --- Und sie zeigen verschiedene Stände ----------------------------
    // Gleiche Zahlen hiessen: Die Fassung wird neu gerechnet statt gelesen.
    expect(
      zweite.kennzahlen.join("|"),
      "Beide Fassungen zeigen dieselben Kennzahlen"
    ).not.toBe(erste.kennzahlen.join("|"));

    // --- Einheiten stimmen (Audit A04) ---------------------------------
    // "Alter" muss als Spalte erscheinen und darf dort kein Betrag sein.
    expect(zweite.spalten).toContain("Alter");
    const alterIndex = zweite.spalten.indexOf("Alter");
    expect(zweite.ersteZeile[alterIndex], "Alter als Euro-Betrag").not.toMatch(/€/);

    expect(absturz, `Abstürze: ${absturz.join(" | ")}`).toHaveLength(0);

  });

  /**
   * Prüfung 2 der Analyse: Das Altersvorsorgedepot mit Fondspolice.
   *
   * Dort hing die archivierte Kurve am Anzeigeschalter „Real", und die
   * zweite Linie hiess immer „depot" — auch wenn sie eine Fondspolice
   * abbildete. Beides ist dem Dokument nicht anzusehen, wenn man nur prüft,
   * dass eine Kurve da ist.
   */
  test("AVD-Fassung benennt ihren Vergleichspartner und rechnet nominal", async ({
    page,
  }) => {
    const name = `${LAUF}-AVD`;
    angelegt.push(name);
    const absturz: string[] = [];
    page.on("pageerror", (e) => absturz.push(e.message));

    await anmelden(page);
    await page.goto("/altersvorsorgedepot");
    const nameFeld = page.locator("#avd-name");
    if (!(await nameFeld.isVisible().catch(() => false))) {
      await expect(nameFeld).toBeVisible({ timeout: 40_000 });
    }
    // Die Hinweisleiste fängt sonst Klicks ab
    await page.getByRole("button", { name: "OK, verstanden" }).click().catch(() => undefined);
    await nameFeld.fill(name);

    await page.getByRole("button", { name: "Fondspolice", exact: true }).click();
    // Genau der Fall aus A05: gespeichert wird im Real-Modus
    await page.getByRole("button", { name: "Real", exact: true }).click();
    await page.getByRole("button", { name: /^Speichern/ }).click();

    const fassung = await fassungOeffnen(page, 1);

    // Der Partner muss beim Namen genannt sein, nicht als "Depot"
    expect(fassung.spalten.join(" | ")).toContain("Fondspolice");
    expect(fassung.spalten.join(" | ")).toContain("vor Steuern");
    // Und es muss dastehen, worauf sich die Kurven beziehen
    expect(fassung.text).toContain("Nominale Werte");
    // Alter bleibt eine Zahl
    const alterIndex = fassung.spalten.indexOf("Alter");
    expect(alterIndex).toBeGreaterThanOrEqual(0);
    expect(fassung.ersteZeile[alterIndex]).not.toMatch(/€/);

    expect(absturz, `Abstürze: ${absturz.join(" | ")}`).toHaveLength(0);

  });

  /**
   * Prüfung 3 der Analyse: Ein Archiv-Schreibfehler darf nicht als Erfolg
   * erscheinen.
   *
   * Der Fehler wird erzwungen, indem die Anfrage an `fall_versionen`
   * abgewiesen wird. Danach muss die Oberfläche das sagen — und der
   * Nachtrag muss die Fassung tatsächlich erzeugen.
   */
  test("Ein misslungenes Festhalten wird gemeldet und lässt sich nachtragen", async ({
    page,
  }) => {
    const name = `${LAUF}-Schreibfehler`;
    angelegt.push(name);
    const absturz: string[] = [];
    page.on("pageerror", (e) => absturz.push(e.message));

    await anmelden(page);

    // Nur das Anlegen einer Fassung scheitern lassen, nicht das Speichern
    // des Falls selbst.
    await page.route("**/rest/v1/fall_versionen**", (route) =>
      route.request().method() === "POST" ? route.abort() : route.continue()
    );

    await page.getByLabel("Name der Berechnung").fill(name);
    await page.getByRole("button", { name: "Vergleich berechnen" }).click();
    await page.waitForURL(/\/calculator\/detail/, { timeout: 30_000 });

    // Der Hauptdatensatz ist da – die Fassung nicht, und das muss dastehen.
    const hinweis = page.getByText(/keine Fassung davon festgehalten/);
    await expect(hinweis).toBeVisible({ timeout: 30_000 });

    // Jetzt darf es wieder klappen: Der Nachtrag muss die Fassung erzeugen.
    await page.unroute("**/rest/v1/fall_versionen**");
    await page.getByRole("button", { name: /Fassung nachtragen/ }).click();
    await expect(page.getByText(/nachträglich festgehalten/)).toBeVisible({
      timeout: 30_000,
    });

    // Gegenprobe: Die Fassung ist wirklich da und vollständig.
    await page.reload();
    const fassung = await fassungOeffnen(page, 1);
    expect(fassung.kennzahlen.length).toBeGreaterThan(0);
    expect(fassung.hatVerlauf).toBe(true);

    expect(absturz, `Abstürze: ${absturz.join(" | ")}`).toHaveLength(0);

  });
});
