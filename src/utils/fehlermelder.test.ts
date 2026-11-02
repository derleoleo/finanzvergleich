// Die Warteschlange, die Startfehler rettet.
//
// Sie ist der ganze Grund, warum Sentry nachgeladen werden darf. Ohne sie
// wäre das Verlagern ein Tausch — 45,1 kB gzip gegen unberichtete
// Startfehler —, und zwar der falsche: Genau in dem Fenster vor dem Laden
// treten Fehler beim Start auf. Fällt dieser Test, ist aus der Verbesserung
// wieder ein Tausch geworden.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  _wartend,
  _weiterreichenSetzen,
  _zuruecksetzen,
  fehlerMelden,
  fruehErfassen,
} from "./fehlermelder";

afterEach(() => {
  _zuruecksetzen();
  vi.unstubAllGlobals();
});

describe("Fehlermelder", () => {
  it("legt Fehler in die Warteschlange, solange Sentry fehlt", () => {
    const fehler = new Error("beim Start");
    fehlerMelden(fehler);
    expect(_wartend()).toHaveLength(1);
    expect(_wartend()[0].fehler).toBe(fehler);
  });

  it("reicht die Warteschlange weiter, sobald Sentry da ist", () => {
    // Der Fall, um den es geht: Der Fehler trat vor dem Laden auf und wird
    // trotzdem gemeldet.
    const frueh = new Error("vor dem Laden");
    fehlerMelden(frueh);

    const gemeldet: unknown[] = [];
    _weiterreichenSetzen((m) => gemeldet.push(m.fehler));

    expect(gemeldet).toEqual([frueh]);
    expect(_wartend(), "die Schlange muss danach leer sein").toHaveLength(0);
  });

  it("meldet danach unmittelbar, ohne zu puffern", () => {
    const gemeldet: unknown[] = [];
    _weiterreichenSetzen((m) => gemeldet.push(m.fehler));

    const spaet = new Error("nach dem Laden");
    fehlerMelden(spaet);

    expect(gemeldet).toEqual([spaet]);
    expect(_wartend()).toHaveLength(0);
  });

  it("behält die Reihenfolge", () => {
    const a = new Error("a");
    const b = new Error("b");
    const c = new Error("c");
    fehlerMelden(a);
    fehlerMelden(b);
    fehlerMelden(c);

    const gemeldet: unknown[] = [];
    _weiterreichenSetzen((m) => gemeldet.push(m.fehler));
    expect(gemeldet).toEqual([a, b, c]);
  });

  it("reicht den Kontext mit durch", () => {
    fehlerMelden(new Error("x"), { quelle: "react.render", componentStack: "…" });
    const gemeldet: (Record<string, unknown> | undefined)[] = [];
    _weiterreichenSetzen((m) => gemeldet.push(m.kontext));
    expect(gemeldet[0]).toEqual({ quelle: "react.render", componentStack: "…" });
  });

  it("läuft bei einer Fehlerschleife nicht über", () => {
    // Zehntausend Fehler sollen den Speicher nicht fluten; was darüber
    // hinausgeht, waere ohnehin dieselbe Meldung.
    for (let i = 0; i < 500; i++) fehlerMelden(new Error(`nummer ${i}`));
    expect(_wartend().length).toBeLessThanOrEqual(20);
    // Und die ersten bleiben - die sind die interessanten.
    expect((_wartend()[0].fehler as Error).message).toBe("nummer 0");
  });

  it("fängt window.error und unhandledrejection ab", () => {
    // Die beiden nativen Lauscher sind der Ersatz fuer Sentry in dem Fenster,
    // in dem es noch nicht geladen ist.
    const lauscher: Record<string, (e: unknown) => void> = {};
    vi.stubGlobal("window", {
      addEventListener: (art: string, fn: (e: unknown) => void) => {
        lauscher[art] = fn;
      },
    });

    fruehErfassen();
    expect(Object.keys(lauscher).sort()).toEqual(["error", "unhandledrejection"]);

    const abgestuerzt = new Error("geplatzt");
    lauscher.error({ error: abgestuerzt, message: "geplatzt" });
    lauscher.unhandledrejection({ reason: "abgelehnt" });

    const wartend = _wartend();
    expect(wartend).toHaveLength(2);
    expect(wartend[0].fehler).toBe(abgestuerzt);
    expect(wartend[0].kontext).toEqual({ quelle: "window.error" });
    expect(wartend[1].fehler).toBe("abgelehnt");
    expect(wartend[1].kontext).toEqual({ quelle: "unhandledrejection" });
  });

  it("nimmt die Nachricht, wenn kein Fehlerobjekt dabei ist", () => {
    // Bei Skriptfehlern von fremder Herkunft liefert der Browser nur den Text.
    const lauscher: Record<string, (e: unknown) => void> = {};
    vi.stubGlobal("window", {
      addEventListener: (art: string, fn: (e: unknown) => void) => {
        lauscher[art] = fn;
      },
    });
    fruehErfassen();
    lauscher.error({ message: "Script error." });
    expect(_wartend()[0].fehler).toBe("Script error.");
  });
});
