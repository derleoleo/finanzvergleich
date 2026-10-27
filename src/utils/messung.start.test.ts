import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Prueft, was `messungStarten` tatsaechlich in die Seite schreibt.
 *
 * Eigene Datei, weil die Umgebungsvariablen vor dem Import stehen muessen:
 * `messung.ts` liest sie beim Laden des Moduls. Das Doppel fuer `document`
 * bleibt winzig - es geht nur um die Attribute des Skript-Tags, und eine
 * DOM-Abhaengigkeit allein dafuer waere zu viel.
 */
type Tag = { src: string; defer: boolean; attribute: Record<string, string> };

function dokumentDoppel() {
  const angehaengt: Tag[] = [];
  const doppel = {
    createElement: () => {
      const tag: Tag = { src: "", defer: false, attribute: {} };
      return Object.assign(tag, {
        setAttribute: (name: string, wert: string) => {
          tag.attribute[name] = wert;
        },
      });
    },
    head: { appendChild: (tag: Tag) => angehaengt.push(tag) },
  };
  return { doppel, angehaengt };
}

describe("Start der Reichweitenmessung", () => {
  let angehaengt: Tag[];

  beforeEach(() => {
    vi.resetModules();
    const d = dokumentDoppel();
    angehaengt = d.angehaengt;
    vi.stubGlobal("document", d.doppel);
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("tut ohne Umgebungsvariablen gar nichts", async () => {
    vi.stubEnv("VITE_UMAMI_URL", "");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "");
    const { messungStarten } = await import("./messung");
    messungStarten();
    expect(angehaengt).toHaveLength(0);
  });

  it("haengt das Skript mit allen Schutzattributen an", async () => {
    vi.stubEnv("VITE_UMAMI_URL", "https://cloud.umami.is/");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "e0c98b08-ba81-4056-9d36-4530c1ca2536");
    const { messungStarten } = await import("./messung");
    messungStarten();

    expect(angehaengt).toHaveLength(1);
    const tag = angehaengt[0];
    // Der abschliessende Schraegstrich in der Adresse darf keinen doppelten
    // erzeugen.
    expect(tag.src).toBe("https://cloud.umami.is/script.js");
    expect(tag.attribute["data-website-id"]).toBe("e0c98b08-ba81-4056-9d36-4530c1ca2536");
    expect(tag.attribute["data-domains"]).toBe("www.vorsorgewaage.de");
    expect(tag.attribute["data-exclude-hash"]).toBe("true");
    expect(tag.attribute["data-do-not-track"]).toBe("true");
  });

  it("verweist auf eine Funktion, die wirklich am Fenster hängt", async () => {
    // Der eigentliche Pruefpunkt: Ein Tippfehler im Attributnamen wuerde die
    // Bereinigung stillschweigend abschalten - und damit jede Zusage brechen.
    vi.stubEnv("VITE_UMAMI_URL", "https://cloud.umami.is");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "abc");
    const { messungStarten } = await import("./messung");
    messungStarten();

    const name = angehaengt[0].attribute["data-before-send"];
    expect(name).toBeTruthy();
    const fenster = window as unknown as Record<string, unknown>;
    expect(typeof fenster[name]).toBe("function");
  });

  it("lädt das Skript nur einmal", async () => {
    vi.stubEnv("VITE_UMAMI_URL", "https://cloud.umami.is");
    vi.stubEnv("VITE_UMAMI_WEBSITE_ID", "abc");
    const { messungStarten } = await import("./messung");
    messungStarten();
    messungStarten();
    expect(angehaengt).toHaveLength(1);
  });
});
