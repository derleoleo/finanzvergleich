// Die strukturierten Daten der Startseite.
//
// Der Anlass: Es gab nur `SoftwareApplication` und `FAQPage`. Damit fehlte
// genau der Block, der echte Pflichtangaben hat — `WebSite`, aus dem Google
// den Namen über den Treffern nimmt — und der, mit dem Google den Betreiber
// einordnet, `Organization`. Geprüft wird hier, was Googles Dokumentation
// verlangt, nicht was schema.org erlaubt.

import { describe, expect, it } from "vitest";
import { strukturierteDatenHtml } from "./strukturierteDaten";
import { FAQ } from "./faq";
import { PREIS_JAHR, PREIS_MONAT } from "./preise";

const BASIS = "https://www.vorsorgewaage.de";

type Block = Record<string, unknown>;

/** Die Blöcke aus dem erzeugten HTML zurücklesen. */
const BLOECKE: Block[] = [
  ...strukturierteDatenHtml().matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  ),
].map((t) => JSON.parse(t[1]) as Block);

function block(typ: string): Block {
  const treffer = BLOECKE.filter((b) => b["@type"] === typ);
  expect(treffer, `kein ${typ}`).toHaveLength(1);
  return treffer[0];
}

/** Ein verschachteltes Feld lesen, ohne den Blöcken einen Typ anzudichten. */
function unter(b: Block, ...pfad: string[]): unknown {
  return pfad.reduce<unknown>((wert, name) => (wert as Block | undefined)?.[name], b);
}

describe("Strukturierte Daten der Startseite", () => {
  it("jeder Block ist für sich gültiges JSON mit Kontext", () => {
    expect(BLOECKE.length).toBeGreaterThanOrEqual(4);
    for (const b of BLOECKE) {
      expect(b["@context"]).toBe("https://schema.org");
      expect(b["@type"]).toBeTruthy();
    }
  });

  it("WebSite trägt die beiden Pflichtangaben für den Seitennamen", () => {
    // Googles Seite zu Website-Namen nennt `name` und `url` als Pflicht und
    // verlangt das Markup auf der Startseite.
    const w = block("WebSite");
    expect(w.name).toBe("Vorsorgewaage");
    expect(w.url).toBe(`${BASIS}/`);
    // Kein Suchfeld-Markup: Google zeigt das seit Ende 2024 nicht mehr.
    expect(w.potentialAction).toBeUndefined();
  });

  it("Organization nennt den Betreiber und zeigt eine erreichbare Bildmarke", () => {
    const o = block("Organization");
    expect(o.name).toBe("Vorsorgewaage");
    expect(o.legalName).toBe("Luisa Brandt");
    expect(o.logo).toMatch(/^https:\/\/www\.vorsorgewaage\.de\//);
    expect(unter(o, "address", "@type")).toBe("PostalAddress");
    // Zwei Buchstaben nach ISO 3166-1 alpha-2, wie Google es verlangt.
    expect(unter(o, "address", "addressCountry")).toBe("DE");
    // Bewusst ohne Strasse: Wohnanschrift einer Einzelunternehmerin.
    expect(JSON.stringify(o)).not.toMatch(/str\.|straße/i);
  });

  it("die Blöcke zeigen über @id aufeinander", () => {
    // Sonst stehen Betreiber, Webseite und Produkt unverbunden da.
    const kennung = block("Organization")["@id"];
    expect(kennung).toBeTruthy();
    expect(unter(block("WebSite"), "publisher", "@id")).toBe(kennung);
    expect(unter(block("SoftwareApplication"), "publisher", "@id")).toBe(kennung);
  });

  it("nennt die Preise, die auch auf der Seite stehen", () => {
    // preise.ts ist die einzige Quelle; hier darf kein zweiter Betrag entstehen.
    const angebote = block("SoftwareApplication").offers as { price: number }[];
    expect(angebote.map((a) => a.price)).toEqual([PREIS_MONAT, PREIS_JAHR]);
    // Endpreise, Kleinunternehmer nach § 19 UStG - keine Steuerangabe.
    expect(JSON.stringify(block("SoftwareApplication"))).not.toMatch(/Tax|vat/i);
  });

  it("erfindet keine Bewertungen", () => {
    // Google verlangt fuer das Rich Result `aggregateRating` oder `review`.
    // Selbst vergebene Sterne sind nach der Review-Richtlinie unzulaessig -
    // also bleibt der Treffer schlicht, und das ist hier die richtige Wahl.
    const roh = JSON.stringify(BLOECKE);
    expect(roh).not.toContain("aggregateRating");
    expect(roh).not.toContain('"review"');
  });

  it("jede Beschreibung nennt das Produkt gleich", () => {
    // Die Organisation beschrieb sich als Anbieter der „Vergleichssoftware",
    // die Anwendung daneben als „Beratungssoftware" - zwei Auskuenfte im selben
    // Kopf darueber, was das Produkt ist. Der Begriff ist eine Entscheidung
    // des Nutzers, kein Nebeneffekt: siehe docs/benennung-startseite.md.
    //
    // Der Test greift jeden Block mit Beschreibung, statt zwei Typen zu nennen:
    // kommt spaeter einer hinzu, faellt eine abweichende Benennung hier auf.
    const beschriebene = BLOECKE.filter(
      (b) => typeof (b as { description?: unknown }).description === "string",
    ) as { "@type": string; description: string }[];
    expect(beschriebene.length).toBeGreaterThanOrEqual(2);
    for (const b of beschriebene) {
      expect(b.description, b["@type"]).toContain("Beratungssoftware");
    }
    expect(JSON.stringify(BLOECKE)).not.toContain("Vergleichssoftware");
  });

  it("die Fragen stehen wortgleich im sichtbaren Abschnitt", () => {
    const fragen = block("FAQPage").mainEntity as { name: string }[];
    expect(fragen).toHaveLength(FAQ.length);
    expect(fragen.map((e) => e.name)).toEqual(FAQ.map((e) => e.q));
  });
});
