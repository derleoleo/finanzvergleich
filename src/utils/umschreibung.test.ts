// src/utils/umschreibung.test.ts
// Es gibt keine SPA-Umschreibung mehr – und das soll so bleiben.
//
// ## Die Geschichte dieser Datei, in zwei Schritten
//
// **Erster Befund (04.11.2026 mittags):** `"source": "/((?!api/).*)"` schrieb
// jede unbekannte Adresse auf `index.html` um und antwortete mit HTTP 200.
// Gemessen an der Live-Seite lieferten `/llms.txt`, `/ai-catalog.json` und
// `/gibtesnicht.txt` allesamt `text/html` mit der Startseite; ein Prüfwerkzeug
// für KI-Auffindbarkeit las das als Markdown bzw. JSON und meldete „keine
// H1-Überschrift" und einen JSON-Parsefehler. Behoben durch einen zweiten
// Lookahead, der Pfade mit Dateiendung ausnahm.
//
// Dieser Test benannte damals eine Grenze, die er nicht abdeckte: Eine
// unbekannte Adresse **ohne** Punkt gehe weiterhin in die Anwendung und
// bekomme dort HTTP 200. Die Begründung, das zu beheben hieße die Routen zu
// wiederholen, war falsch – der Test selbst las sie bereits aus `routes`.
//
// **Zweiter Befund (04.11.2026 nachmittags):** Es war schlimmer als notiert.
// `/diese-seite-gibt-es-nicht` lieferte nicht nur 200, sondern dazu
// `<meta name="robots" content="index, follow">` und das Canonical der
// Startseite. Beliebig viele erfundene Adressen behaupteten also, die
// Startseite zu sein, und luden zur Indexierung ein.
//
// ## Was jetzt gilt
//
// Die Umschreibung ist **ganz entfallen**. Für jede gültige Adresse entsteht
// beim Bauen eine echte Datei (`seitenkoepfePlugin` in `vite.config.ts`,
// Liste in `src/utils/adressen.ts`), und `dist/404.html` fängt den Rest ab.
// Welche Adressen gültig sind, hält `adressen.test.ts` gegen `App.tsx` fest –
// das ist der Test, der nach dieser Umstellung wirklich trägt.
//
// Diese Datei hält nur noch die eine Zusage, die sich hier prüfen lässt:
// Es kommt keine Catch-all-Umschreibung zurück. Käme sie, wäre der weiche 404
// wieder da, und zwar still.

import { describe, expect, it } from "vitest";
import VERCEL_ROH from "../../vercel.json?raw";

const VERCEL: {
  rewrites?: { source: string; destination: string }[];
  redirects?: unknown[];
  headers?: unknown[];
} = JSON.parse(VERCEL_ROH);

describe("Vercel-Konfiguration", () => {
  it("es gibt keine SPA-Umschreibung mehr", () => {
    expect(
      VERCEL.rewrites ?? [],
      "Eine Catch-all-Umschreibung bringt den weichen 404 zurück: " +
        "jede erfundene Adresse antwortet dann wieder mit 200 und dem Canonical der Startseite.",
    ).toEqual([]);
  });

  it("die Weiterleitung der alten Adresse und die Sicherheitskopfzeilen bleiben", () => {
    // Die Gegenprobe zum Test oben: Beim Entfernen des `rewrites`-Blocks darf
    // nicht versehentlich mehr verschwunden sein.
    expect(VERCEL.redirects).toHaveLength(1);
    expect(VERCEL_ROH).toContain("rentencheck.vercel.app");
    expect(VERCEL.headers).toHaveLength(1);
    expect(VERCEL_ROH).toContain("X-Content-Type-Options");
    expect(VERCEL_ROH).toContain("Referrer-Policy");
  });
});
