// src/utils/fundstellen.test.ts
// Die Abbildung von Zitat auf Adresse – das Stück, das falsch sein kann,
// ohne dass es auffällt.

import { describe, expect, it } from "vitest";
import {
  GESETZE,
  NEUFASSUNG,
  OHNE_LINK,
  ZITAT,
  alsMarkdown,
  fundstelleUrl,
  kuerzelVon,
} from "./fundstellen";

describe("Fundstellen", () => {
  it("die beiden Kürzel, die man falsch ableitet, stehen richtig drin", () => {
    // Wer sie aus dem Namen errät, landet auf einer Fehlerseite. Beide sind
    // einmal von Hand abgerufen worden.
    expect(GESETZE.VVG).toBe("vvg_2008");
    expect(GESETZE.InvStG).toBe("invstg_2018");
    expect(GESETZE.EStG).toBe("estg");
  });

  it("n.F. zeigt immer auf das Gesetzblatt, nie auf das geltende Recht", () => {
    for (const z of [
      "§ 10a Abs. 1 S. 1 EStG n.F.",
      "§ 84 S. 1 EStG n.F.",
      "§ 79 S. 2 Nr. 4 EStG n.F.",
      "§§ 84, 85 EStG n.F.",
    ]) {
      expect(fundstelleUrl(z), z).toBe(NEUFASSUNG.adresse);
      expect(fundstelleUrl(z)).not.toContain("gesetze-im-internet.de");
    }
  });

  it("a.F. bekommt keinen Link", () => {
    // Meint heutiges Riester-Recht, das ab 2027 dort nicht mehr steht.
    expect(fundstelleUrl("§ 86 Abs. 1 EStG a.F.")).toBeNull();
    expect(fundstelleUrl("§ 85 Abs. 1 S. 1 EStG a.F.")).toBeNull();
  });

  it("ein Zitat ohne Gesetzeskürzel bekommt keinen Link", () => {
    // Die „Norm"-Spalten zitieren teils ohne Kürzel. Das Gesetz aus dem
    // Zusammenhang zu erraten wäre die gefährlichste Variante: Drei Zeilen
    // darüber steht „n.F.", im Zitat selbst nicht.
    expect(fundstelleUrl("§ 84 S. 1 Nr. 1")).toBeNull();
    expect(fundstelleUrl("§ 93 Abs. 1 S. 1")).toBeNull();
    expect(kuerzelVon("§ 84 S. 1 Nr. 1")).toBeNull();
  });

  it("eine §§-Aufzählung zeigt auf das Verzeichnis, nicht auf den ersten Paragrafen", () => {
    // Ein Link auf § 195 BGB täuschte über § 199 hinweg.
    expect(fundstelleUrl("§§ 195, 199 Abs. 1 BGB")).toBe(
      "https://www.gesetze-im-internet.de/bgb/",
    );
  });

  it("einzelne Paragrafen, auch mit Buchstabenzusatz", () => {
    expect(fundstelleUrl("§ 61 Abs. 1 S. 1 VVG")).toBe(
      "https://www.gesetze-im-internet.de/vvg_2008/__61.html",
    );
    expect(fundstelleUrl("§ 34f GewO")).toBe(
      "https://www.gesetze-im-internet.de/gewo/__34f.html",
    );
    expect(fundstelleUrl("§ 18 Abs. 1 S. 3 InvStG")).toBe(
      "https://www.gesetze-im-internet.de/invstg_2018/__18.html",
    );
    expect(fundstelleUrl("§ 93 Abs. 1 S. 4 Buchst. c EStG")).toBe(
      "https://www.gesetze-im-internet.de/estg/__93.html",
    );
  });

  it("das Muster erfasst die Formen, die im Bestand vorkommen", () => {
    const treffer = (t: string) => [...t.matchAll(ZITAT)].map((m) => m[0]);
    expect(treffer("Nach § 18 Abs. 1 InvStG gilt")).toEqual(["§ 18 Abs. 1 InvStG"]);
    expect(treffer("§ 10a Abs. 3 S. 2–4 EStG n.F.")).toEqual(["§ 10a Abs. 3 S. 2–4 EStG n.F."]);
    expect(treffer("§ 34f GewO und § 18 FinVermV")).toEqual(["§ 34f GewO", "§ 18 FinVermV"]);
    expect(treffer("§ 3 Nr. 55c EStG")).toEqual(["§ 3 Nr. 55c EStG"]);
  });

  it("der Markdown-Link traegt bei n.F. den Hinweis auf die Fassung", () => {
    const md = alsMarkdown("§ 84 S. 1 EStG n.F.");
    expect(md).toContain(NEUFASSUNG.adresse);
    expect(md).toContain("Beitragsjahr 2027");
    // Ohne Fassungsangabe kein Hinweis - er wäre dort falsch.
    expect(alsMarkdown("§ 61 VVG")).toBe("[§ 61 VVG](https://www.gesetze-im-internet.de/vvg_2008/__61.html)");
    // Und was keinen Link bekommt, bleibt unverändert.
    expect(alsMarkdown("§ 86 Abs. 1 EStG a.F.")).toBe("§ 86 Abs. 1 EStG a.F.");
  });

  it("jede Ausnahme ist begründet", () => {
    expect(OHNE_LINK.map((e) => e.was)).toEqual(
      expect.arrayContaining(["a.F.", "BMF-Schreiben", "BMF-FAQ"]),
    );
  });
});
