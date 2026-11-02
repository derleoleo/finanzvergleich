// Die Entscheidung in public/robots.txt festhalten.
//
// Die Datei war bisher von keinem Test beruehrt. Dabei steckt darin eine
// geschaeftliche Entscheidung (Variante B aus docs/ki-crawler-entscheidung.md:
// sichtbar in KI-Assistenten, aber nicht im Training fremder Modelle), und sie
// ist mit einer falsch gesetzten Zeile lautlos umgedreht - niemand merkt es,
// weil nichts bricht.
//
// Geprueft wird deshalb das Verhalten, nicht der Wortlaut: Die Zeilen werden
// zu Gruppen gelesen und die Regel angewandt, die ein Crawler anwendet - die
// genaueste passende Gruppe gewinnt, innerhalb der Gruppe der laengste
// passende Pfad. Eine Umformulierung der Datei darf diesen Test nicht
// stoeren, eine Umkehr der Entscheidung muss ihn brechen.

import { describe, expect, it } from "vitest";
import ROBOTS from "../../public/robots.txt?raw";
import SITEMAP from "../../public/sitemap.xml?raw";

type Gruppe = { agenten: string[]; regeln: { erlaubt: boolean; pfad: string }[] };

/** Die Datei in Gruppen lesen. Kommentare und Leerzeilen fallen weg. */
function gruppen(text: string): Gruppe[] {
  const aus: Gruppe[] = [];
  let offen = false; // mehrere "User-agent" hintereinander bilden eine Gruppe

  for (const roh of text.split(/\r?\n/)) {
    const zeile = roh.replace(/#.*$/, "").trim();
    if (!zeile) continue;
    const i = zeile.indexOf(":");
    if (i < 0) continue;
    const feld = zeile.slice(0, i).trim().toLowerCase();
    const wert = zeile.slice(i + 1).trim();

    if (feld === "user-agent") {
      if (!offen) aus.push({ agenten: [], regeln: [] });
      aus[aus.length - 1].agenten.push(wert);
      offen = true;
      continue;
    }
    if (feld === "allow" || feld === "disallow") {
      if (aus.length === 0) continue;
      offen = false;
      aus[aus.length - 1].regeln.push({ erlaubt: feld === "allow", pfad: wert });
    }
  }
  return aus;
}

const GRUPPEN = gruppen(ROBOTS);

/** Die Gruppe, die fuer diesen Crawler gilt: eigene vor "*". */
function gruppeFuer(agent: string): Gruppe | undefined {
  const klein = agent.toLowerCase();
  return (
    GRUPPEN.find((g) => g.agenten.some((a) => a.toLowerCase() === klein)) ??
    GRUPPEN.find((g) => g.agenten.includes("*"))
  );
}

/** Darf dieser Crawler diesen Pfad holen? Laengste passende Regel gewinnt. */
function darf(agent: string, pfad: string): boolean {
  const gruppe = gruppeFuer(agent);
  if (!gruppe) return true; // keine Regel heisst erlaubt
  let treffer: { erlaubt: boolean; pfad: string } | undefined;
  for (const regel of gruppe.regeln) {
    if (!pfad.startsWith(regel.pfad)) continue;
    // Bei gleicher Laenge gewinnt "Allow" - so entscheidet auch Google.
    if (!treffer || regel.pfad.length > treffer.pfad.length) treffer = regel;
    else if (regel.pfad.length === treffer.pfad.length && regel.erlaubt) treffer = regel;
  }
  return treffer ? treffer.erlaubt : true;
}

/** Hat dieser Crawler eine eigene Gruppe - oder faellt er auf "*" herunter? */
function eigeneGruppe(agent: string): boolean {
  const klein = agent.toLowerCase();
  return GRUPPEN.some((g) => g.agenten.some((a) => a.toLowerCase() === klein));
}

const TRAINING = ["GPTBot", "ClaudeBot", "Google-Extended"];
const SUCHINDEX = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"];
const ABRUF = ["ChatGPT-User", "Claude-User", "Perplexity-User"];

describe("robots.txt", () => {
  it("laesst sich ueberhaupt als Gruppen lesen", () => {
    expect(GRUPPEN.length).toBeGreaterThan(1);
    for (const g of GRUPPEN) expect(g.agenten.length).toBeGreaterThan(0);
  });

  it("sperrt die Trainings-Crawler vollstaendig", () => {
    // Variante B, erste Haelfte: die eigenen Texte nicht als Trainingsdaten.
    for (const bot of TRAINING) {
      expect(eigeneGruppe(bot), `${bot} hat keine eigene Gruppe`).toBe(true);
      expect(darf(bot, "/"), bot).toBe(false);
      expect(darf(bot, "/ratgeber/grenzfoerderquote-altersvorsorgedepot/"), bot).toBe(false);
    }
  });

  it("laesst die Suchindex-Crawler herein", () => {
    // Variante B, zweite Haelfte - der Grund fuer die ganze Uebung: In den
    // Assistenten auffindbar bleiben. Eine Sperre hier waere bei Perplexity
    // sogar ohne Gegenwert, weil dort nach eigener Angabe nicht trainiert wird.
    for (const bot of SUCHINDEX) {
      expect(darf(bot, "/"), bot).toBe(true);
      expect(darf(bot, "/ratgeber/"), bot).toBe(true);
      expect(darf(bot, "/pricing"), bot).toBe(true);
    }
  });

  it("gibt den Suchindex- und Abruf-Crawlern bewusst keine eigene Gruppe", () => {
    // Eine eigene Gruppe wuerde "Disallow: /api/" fuer sie ausser Kraft
    // setzen: Ein Crawler liest nur die genaueste Gruppe, nicht beide.
    for (const bot of [...SUCHINDEX, ...ABRUF]) {
      expect(eigeneGruppe(bot), `${bot} sollte auf "*" herunterfallen`).toBe(false);
      expect(darf(bot, "/api/create-checkout-session"), bot).toBe(false);
    }
  });

  it("haelt alle uebrigen Crawler von den Serverfunktionen fern", () => {
    expect(darf("Googlebot", "/")).toBe(true);
    expect(darf("Googlebot", "/api/")).toBe(false);
    expect(darf("Googlebot", "/api/stripe-webhook")).toBe(false);
    expect(darf("Bingbot", "/ratgeber/")).toBe(true);
  });

  it("nennt die Sitemap, und zwar dieselbe Adresse wie die Sitemap selbst", () => {
    const genannt = /^\s*Sitemap:\s*(\S+)\s*$/im.exec(ROBOTS)?.[1];
    expect(genannt).toBe("https://www.vorsorgewaage.de/sitemap.xml");
    // Dieselbe Herkunft wie die Adressen in der Sitemap - sonst zeigt die
    // Angabe auf eine Datei, die zu einer anderen Seite gehoert.
    const ersteAdresse = /<loc>([^<]+)<\/loc>/.exec(SITEMAP)?.[1];
    expect(new URL(genannt!).origin).toBe(new URL(ersteAdresse!).origin);
  });

  it("stellt die genauen Gruppen vor die Sammelgruppe", () => {
    // Nach dem Standard gewinnt die genaueste Gruppe unabhaengig von der
    // Reihenfolge. Ein einfacher Parser, der bei der ersten passenden Gruppe
    // stehen bleibt, wuerde bei "*" zuerst aber alles erlauben - und damit
    // die Entscheidung stillschweigend umdrehen.
    const sammel = GRUPPEN.findIndex((g) => g.agenten.includes("*"));
    expect(sammel).toBeGreaterThanOrEqual(0);
    for (const bot of TRAINING) {
      const eigen = GRUPPEN.findIndex((g) =>
        g.agenten.some((a) => a.toLowerCase() === bot.toLowerCase()),
      );
      expect(eigen, `${bot} steht hinter "*"`).toBeLessThan(sammel);
    }
  });
});
