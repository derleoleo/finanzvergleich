// src/utils/ratgeber-verwandt.test.ts
// Kein Beitrag steht allein.
//
// Befund vor dieser Änderung: elf Markdown-Links im ganzen Ratgeber. **Drei
// Beiträge enthielten überhaupt keinen Link** — Grenzförderquote,
// Riester-Wechsel, Todesfall. **Zwei hatten keinen einzigen eingehenden** —
// mittelbare Berechtigung und Vorabpauschale waren aus keinem anderen Beitrag
// erreichbar. Der einzige „Weiterlesen"-Abschnitt war handgeschrieben, in
// genau einer Datei.
//
// Die Verweise stehen jetzt im Kopf (`verwandt:`) und der Block am Seitenende
// entsteht daraus. Dieser Test hält fest, was daran die Zusage ist: Jeder
// Beitrag führt irgendwohin, und zu jedem Beitrag führt ein Weg. Ohne ihn
// steht der nächste neue Beitrag wieder allein, und es fällt niemandem auf.

import { describe, expect, it } from "vitest";
import { RATGEBER_PFAD, beitragLesen, beitragSeite } from "./ratgeber";

const ROH = import.meta.glob("../../ratgeber/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const BEITRAEGE = Object.entries(ROH).map(([pfad, text]) =>
  beitragLesen(pfad.split("/").pop() as string, text),
);

const SLUGS = new Set(BEITRAEGE.map((b) => b.slug));

describe("Verwandte Beiträge", () => {
  it("es gibt genug Beiträge, dass die Prüfung etwas bedeutet", () => {
    expect(BEITRAEGE.length).toBeGreaterThan(5);
  });

  it("jeder Beitrag führt irgendwohin", () => {
    const sackgassen = BEITRAEGE.filter((b) => !b.verwandt?.length).map((b) => b.slug);
    expect(
      sackgassen,
      "Diese Beiträge haben keinen ausgehenden Verweis – ein Leser kommt dort nicht weiter",
    ).toEqual([]);
  });

  it("zu jedem Beitrag führt ein Weg", () => {
    // Die Richtung, die beim Schreiben von Hand immer vergessen wird: Ein
    // neuer Beitrag verlinkt die alten, aber keiner verlinkt ihn.
    const eingehend = new Map(BEITRAEGE.map((b) => [b.slug, 0]));
    for (const b of BEITRAEGE) {
      for (const z of b.verwandt ?? []) eingehend.set(z, (eingehend.get(z) ?? 0) + 1);
    }
    const verwaist = [...eingehend].filter(([, n]) => n === 0).map(([slug]) => slug);
    expect(
      verwaist,
      "Diese Beiträge sind aus keinem anderen erreichbar",
    ).toEqual([]);
  });

  it("kein Verweis zeigt ins Leere oder auf sich selbst", () => {
    for (const b of BEITRAEGE) {
      for (const z of b.verwandt ?? []) {
        expect(SLUGS.has(z), `${b.slug} verweist auf "${z}" – den gibt es nicht`).toBe(true);
        expect(z, `${b.slug} verweist auf sich selbst`).not.toBe(b.slug);
      }
      expect(
        new Set(b.verwandt).size,
        `${b.slug} nennt einen Beitrag doppelt`,
      ).toBe((b.verwandt ?? []).length);
    }
  });

  it("der Block steht im gebauten HTML, mit Titel und Anrisstext", () => {
    for (const b of BEITRAEGE) {
      const html = beitragSeite(b, undefined, BEITRAEGE);
      expect(html, `${b.slug}: kein Weiterlesen-Block`).toContain('<section class="weiterlesen">');
      for (const z of b.verwandt ?? []) {
        const ziel = BEITRAEGE.find((a) => a.slug === z)!;
        expect(html).toContain(`href="${RATGEBER_PFAD}/${z}/"`);
        // Der Titel, nicht der Slug – ein Leser soll sehen, was ihn erwartet.
        expect(html).toContain(ziel.kurztitel ?? ziel.titel);
      }
    }
  });

  it("ohne die Liste aller Beiträge bricht der Bau ab, statt den Block wegzulassen", () => {
    /*
     * Die Alternative wäre, den Block still auszulassen. Dann hinge es am
     * Aufrufer, ob die Verweise erscheinen – und ein vergessenes Argument
     * fiele erst auf der fertigen Seite auf, wenn überhaupt.
     */
    const mitVerweis = BEITRAEGE.find((b) => b.verwandt?.length)!;
    expect(() => beitragSeite(mitVerweis)).toThrow(/ohne die Liste/);
  });
});
