import { beforeEach, describe, expect, it } from "vitest";
import { bereinigteAdresse, messungAngemeldet, vorSenden } from "./messung";

describe("Adressen für die Reichweitenmessung", () => {
  it("entfernt die Kennung einer gespeicherten Berechnung", () => {
    // Genau dieser Fall entsteht in den Rechnern nach dem Speichern per
    // history.replaceState - Umami zaehlt das als Seitenaufruf.
    expect(bereinigteAdresse("/altersvorsorgedepot?id=9f1c2b44-dead-beef")).toBe(
      "/altersvorsorgedepot",
    );
  });

  it("behält die Herkunft einer Kampagne", () => {
    expect(bereinigteAdresse("/beispiel?utm_source=asscompact&utm_medium=gastbeitrag")).toBe(
      "/beispiel?utm_source=asscompact&utm_medium=gastbeitrag",
    );
  });

  it("wirft Unbekanntes weg und behält Erlaubtes - auch gemischt", () => {
    expect(bereinigteAdresse("/net-policy?id=abc&utm_source=linkedin&mandant=Mueller")).toBe(
      "/net-policy?utm_source=linkedin",
    );
  });

  it("entfernt den Fragmentteil", () => {
    expect(bereinigteAdresse("/pricing#plan-premium")).toBe("/pricing");
  });

  it("lässt eine volle Adresse eine volle Adresse bleiben", () => {
    expect(bereinigteAdresse("https://www.vorsorgewaage.de/calculator/detail?id=abc")).toBe(
      "https://www.vorsorgewaage.de/calculator/detail",
    );
  });

  it("kürzt auch die Suchanfrage eines fremden Verweisenden", () => {
    expect(bereinigteAdresse("https://www.google.com/search?q=altersvorsorgedepot+rechner")).toBe(
      "https://www.google.com/search",
    );
  });

  it("lässt Adressen ohne Abfrageteil unverändert", () => {
    expect(bereinigteAdresse("/beispiel")).toBe("/beispiel");
  });
});

describe("Nutzlast vor dem Absenden", () => {
  beforeEach(() => messungAngemeldet(false));

  it("kürzt Adresse und Verweisenden auf einer öffentlichen Seite", () => {
    const nutzlast = vorSenden("event", {
      url: "/pricing?checkout=success&utm_source=linkedin",
      referrer: "https://www.google.com/search?q=beratersoftware",
      name: "preise_gesehen",
    });
    expect(nutzlast).not.toBeNull();
    expect(nutzlast?.url).toBe("/pricing?utm_source=linkedin");
    expect(nutzlast?.referrer).toBe("https://www.google.com/search");
    expect(nutzlast?.name).toBe("preise_gesehen");
  });

  it("sendet nichts, sobald jemand angemeldet ist", () => {
    // Derselbe oeffentliche Pfad wie oben - nur ist der Besucher jetzt
    // Auftraggeber im Sinne des AVV.
    messungAngemeldet(true);
    expect(vorSenden("event", { url: "/pricing", name: "preise_gesehen" })).toBeNull();
  });

  it("sendet nichts aus der angemeldeten Anwendung", () => {
    // Diesen Aufruf loest Umami selbst aus, wenn die Adresse wechselt.
    expect(vorSenden("pageview", { url: "/altersvorsorgedepot?id=abc" })).toBeNull();
    expect(vorSenden("pageview", { url: "/calculator/detail" })).toBeNull();
    expect(vorSenden("pageview", { url: "/profile" })).toBeNull();
  });

  it("lässt die Startseite durch - auch als volle Adresse", () => {
    expect(vorSenden("pageview", { url: "/" })).not.toBeNull();
    expect(vorSenden("pageview", { url: "https://www.vorsorgewaage.de/beispiel" })).not.toBeNull();
    expect(vorSenden("pageview", { url: "" })).not.toBeNull();
  });

  it("verwirft eine unbrauchbare Nutzlast", () => {
    expect(vorSenden("event", null as unknown as Record<string, unknown>)).toBeNull();
  });
});
