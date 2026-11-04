// src/utils/adressen.test.ts
// Der Test, ohne den die Änderung am 404 nicht zu verantworten ist.
//
// Seit die SPA-Umschreibung entfallen ist, liefert Vercel nur noch Adressen
// aus, für die beim Bauen eine Datei entstanden ist. Das ist der Zweck – und
// zugleich die Gefahr: Eine neue Route in `src/App.tsx`, die nicht in
// `ANWENDUNGSADRESSEN` ankommt, ist in der Produktion ein harter 404.
// Erreichbar bliebe sie nur über die Navigation innerhalb der Anwendung, und
// beim Neuladen wäre sie weg.
//
// Vorher war dieselbe Unachtsamkeit folgenlos, weil die Umschreibung alles
// gefangen hat. Dieser Test ist die Gegenleistung dafür, dass sie es nicht
// mehr tut.
//
// Geprüft wird gegen `App.tsx` selbst, nicht gegen eine Liste von Erwartungen:
// Die Routen stehen dort, und nur dort entscheidet sich, was die Anwendung
// kann.

import { describe, expect, it } from "vitest";
import APP_ROH from "../App.tsx?raw";
import { ANWENDUNGSADRESSEN, NICHT_INDEXIEREN, dateinamenFuer } from "./adressen";
import { SEITENKOEPFE } from "./seitenkoepfe";

/** Jedes `path="…"` aus App.tsx, ohne den Auffangpfad `*`. */
const AUS_APP: string[] = [
  ...new Set(
    [...APP_ROH.matchAll(/path="([^"]+)"/g)]
      .map((t) => t[1])
      .filter((p) => p !== "*"),
  ),
].sort();

describe("Adressen der Anwendung", () => {
  it("App.tsx hat überhaupt Routen – und einen Auffangpfad", () => {
    // Schlägt die Regex eines Tages ins Leere, wären alle Prüfungen unten
    // stillschweigend leer und grün.
    expect(AUS_APP.length).toBeGreaterThan(20);
    expect(APP_ROH).toContain('path="*"');
  });

  it("jede Route aus App.tsx steht in ANWENDUNGSADRESSEN", () => {
    const fehlend = AUS_APP.filter((p) => !ANWENDUNGSADRESSEN.includes(p));
    expect(
      fehlend,
      `Diese Routen bekämen in der Produktion einen harten 404: ${fehlend.join(", ")}`,
    ).toEqual([]);
  });

  it("ANWENDUNGSADRESSEN erfindet keine Adresse, die es nicht gibt", () => {
    const zuviel = ANWENDUNGSADRESSEN.filter((p) => !AUS_APP.includes(p));
    expect(
      zuviel,
      `Dafür entstünde eine Datei ohne Route dahinter: ${zuviel.join(", ")}`,
    ).toEqual([]);
  });

  it("alles hinter der Anmeldung wird von der Indexierung ausgenommen", () => {
    // Die Gegenprobe: Was einen eigenen Kopf hat, ist öffentlich und gehört
    // nicht in die Sperrliste. Die Startseite ebenso wenig.
    const oeffentlich = new Set([...SEITENKOEPFE.map((k) => k.pfad), "/"]);
    for (const pfad of NICHT_INDEXIEREN) {
      expect(oeffentlich.has(pfad), `${pfad} ist öffentlich und darf nicht gesperrt werden`).toBe(false);
    }
    for (const pfad of ANWENDUNGSADRESSEN) {
      if (oeffentlich.has(pfad)) continue;
      expect(NICHT_INDEXIEREN, `${pfad} bliebe indexierbar`).toContain(pfad);
    }
    expect(NICHT_INDEXIEREN).not.toContain("/");
  });

  it("die Rechner liegen in der Sperrliste, die Preisseite nicht", () => {
    // Zwei Stichproben, die den Sinn der Liste festhalten statt nur ihre Form.
    expect(NICHT_INDEXIEREN).toContain("/calculator");
    expect(NICHT_INDEXIEREN).toContain("/profile");
    expect(NICHT_INDEXIEREN).toContain("/login");
    expect(NICHT_INDEXIEREN).not.toContain("/pricing");
    expect(NICHT_INDEXIEREN).not.toContain("/beispiel");
  });

  it("je Adresse entstehen beide Dateiformen", () => {
    expect(dateinamenFuer("/legal/avv")).toEqual(["legal/avv/index.html", "legal/avv.html"]);
    expect(dateinamenFuer("/profile")).toEqual(["profile/index.html", "profile.html"]);
  });

  it("keine Adresse trägt eine Dateiendung", () => {
    // Sonst kollidiert sie mit einer echten Datei im Ausgabeordner.
    for (const pfad of ANWENDUNGSADRESSEN) {
      expect(pfad, `Adresse mit Endung: ${pfad}`).not.toMatch(/\.[A-Za-z0-9]+$/);
    }
  });
});
