// Die Abkürzung, die den öffentlichen Seiten das Warten erspart.
//
// Sie darf in genau einer Richtung irren: „vielleicht angemeldet" ist immer
// erlaubt (dann wird gewartet wie früher), „sicher nicht angemeldet" nur dann,
// wenn wirklich keine Sitzung im Browser liegen kann. Ein falsches `false`
// hieße, dass ein Angemeldeter auf `/` kurz die Landingpage sieht — genau das
// Flackern, wegen dem dort vorher `null` stand.

import { afterEach, describe, expect, it, vi } from "vitest";
import { vielleichtAngemeldet } from "./vielleichtAngemeldet";

/** Einen Browser mit gegebenem Speicher und Adressfragment vortäuschen. */
function browser(schluessel: string[], hash = "") {
  const speicher = {
    get length() {
      return schluessel.length;
    },
    key: (i: number) => schluessel[i] ?? null,
  };
  vi.stubGlobal("window", { localStorage: speicher, location: { hash } });
}

/** Einen Browser, dessen Speicher beim Zugriff wirft (privates Fenster). */
function browserOhneSpeicher() {
  vi.stubGlobal("window", {
    get localStorage(): never {
      throw new DOMException("Zugriff verweigert");
    },
    location: { hash: "" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("vielleichtAngemeldet", () => {
  it("ist false, wenn gar nichts im Speicher liegt", () => {
    // Der Fall, der zählt: der Besucher aus der Suche. Für ihn erscheint die
    // Seite sofort, ohne auf 212,7 kB Supabase zu warten.
    browser([]);
    expect(vielleichtAngemeldet()).toBe(false);
  });

  it("ist false bei fremden Einträgen im Speicher", () => {
    // Entwürfe und Voreinstellungen der Anwendung sind keine Sitzung.
    browser(["fv_calculator_draft_v1", "fv_user_defaults_v1", "rc_welcome_abc"]);
    expect(vielleichtAngemeldet()).toBe(false);
  });

  it("ist true, sobald ein Sitzungsschlüssel von Supabase da ist", () => {
    browser(["fv_user_defaults_v1", "sb-abcdefgh-auth-token"]);
    expect(vielleichtAngemeldet()).toBe(true);
  });

  it("ist true direkt nach einem Anmelde- oder Rücksetzlink", () => {
    // Dann steht die Sitzung noch in der Adresse und nicht im Speicher.
    browser([], "#access_token=xyz&type=magiclink");
    expect(vielleichtAngemeldet()).toBe(true);
    browser([], "#type=recovery");
    expect(vielleichtAngemeldet()).toBe(true);
  });

  it("ist true, wenn der Speicher gesperrt ist", () => {
    // Im Unbekannten bleibt es beim bisherigen Verhalten: lieber warten als
    // einen Angemeldeten flackern lassen.
    browserOhneSpeicher();
    expect(vielleichtAngemeldet()).toBe(true);
  });
});
