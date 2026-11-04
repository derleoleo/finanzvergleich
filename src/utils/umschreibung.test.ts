// src/utils/umschreibung.test.ts
// Die SPA-Umschreibung in `vercel.json` darf keine Dateien verschlucken.
//
// Der Befund: `"source": "/((?!api/).*)"` schrieb **jede** unbekannte Adresse
// auf `index.html` um und antwortete mit HTTP 200. Gemessen an der Live-Seite
// lieferten `/llms.txt`, `/ai-catalog.json` und `/gibtesnicht.txt` alle
// `text/html` mit der Startseite. Ein Prüfwerkzeug für KI-Auffindbarkeit las
// das als Markdown bzw. JSON und meldete „keine H1-Überschrift" und
// „Unexpected token '<', \"<!doctype \"... is not valid JSON" — es hatte
// unsere Startseite vor sich, nicht eine kaputte Datei.
//
// Für Suchmaschinen ist dasselbe ein „weicher 404": Die Seite sagt „gibt es"
// zu Adressen, die es nicht gibt.
//
// Die Lösung ist ein zweiter Lookahead, der Pfade mit Dateiendung ausnimmt.
// Keine der Anwendungsrouten enthält einen Punkt (geprüft gegen `routes` in
// `utils/index.ts`), deshalb trifft der Ausschluss nur Dateien.
//
// Grenze, die dieser Test NICHT abdeckt: Eine unbekannte Adresse *ohne*
// Punkt (`/gibtsnicht`) geht weiterhin in die Anwendung und bekommt dort die
// 404-Ansicht mit HTTP 200. Das zu beheben hieße, die gültigen Routen hier
// zu wiederholen — eine zweite Fassung, die auseinanderläuft.

import { describe, expect, it } from "vitest";
import VERCEL_ROH from "../../vercel.json?raw";
import { routes } from "./index";

const UMSCHREIBUNG: { source: string; destination: string }[] =
  JSON.parse(VERCEL_ROH).rewrites;

/** Trifft die Umschreibung diesen Pfad? */
function wirdUmgeschrieben(pfad: string): boolean {
  return UMSCHREIBUNG.some((r) => new RegExp(`^${r.source}$`).test(pfad));
}

describe("SPA-Umschreibung", () => {
  it("es gibt genau eine", () => {
    expect(UMSCHREIBUNG).toHaveLength(1);
    expect(UMSCHREIBUNG[0].destination).toBe("/index.html");
  });

  it("keine Anwendungsroute enthält einen Punkt", () => {
    // Die Voraussetzung dafür, dass der Ausschluss gefahrlos ist. Fällt sie
    // weg, verschwindet die betroffene Route in einem 404.
    for (const pfad of Object.values(routes)) {
      expect(typeof pfad).toBe("string");
      expect(pfad as string, `Route mit Punkt: ${pfad}`).not.toMatch(/\.[A-Za-z0-9]+$/);
    }
  });

  it("Adressen der Anwendung landen weiter in der Anwendung", () => {
    for (const pfad of ["/", "/pricing", "/beispiel", "/legal/avv", "/was-die-rechner-koennen"]) {
      expect(wirdUmgeschrieben(pfad), `${pfad} wird nicht mehr umgeschrieben`).toBe(true);
    }
  });

  it("Dateien werden nicht verschluckt — sie liegen vor oder es gibt sie nicht", () => {
    for (const pfad of [
      "/llms.txt",
      "/robots.txt",
      "/sitemap.xml",
      "/favicon.svg",
      "/assets/index-abc123.js",
      "/ai-catalog.json",
      "/.well-known/ard.json",
      "/gibtesnicht.txt",
    ]) {
      expect(wirdUmgeschrieben(pfad), `${pfad} wird auf index.html umgeschrieben`).toBe(false);
    }
  });

  it("die Funktionen unter /api/ bleiben ausgenommen", () => {
    expect(wirdUmgeschrieben("/api/create-checkout-session")).toBe(false);
  });
});
