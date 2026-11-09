// src/utils/speicherFehler.test.ts
// Die Meldung muss sagen, was los ist.
//
// Der Anlass: Sechs Wochen lang zeigte der Rentenlückenrechner „Ein Fehler
// ist beim Speichern der Berechnung aufgetreten", während die Antwort –
// „Could not find the 'withdrawal_end_age' column" – nur in der
// Browser-Konsole stand. Der Berater suchte den Fehler bei sich.

import { beforeEach, describe, expect, it } from "vitest";
import { KONTINGENT_TEXT, speicherFehlerText } from "./speicherFehler";
import { _wartend, _zuruecksetzen } from "./fehlermelder";

beforeEach(() => _zuruecksetzen());

describe("speicherFehlerText", () => {
  it("das Free-Kontingent bleibt sein eigener Fall", () => {
    // Der einzige Fall, der nicht unser Fehler ist: Da soll kein
    // Fehlerbericht rausgehen und kein Schuldgefühl entstehen.
    expect(speicherFehlerText(new Error("Kontingent erreicht"))).toBe(KONTINGENT_TEXT);
    expect(_wartend()).toHaveLength(0);
  });

  it("ein Schemafehler nennt die fehlende Spalte", () => {
    const echt = {
      code: "PGRST204",
      message: "Could not find the 'withdrawal_end_age' column of 'pension_gap_calculations' in the schema cache",
    };
    const text = speicherFehlerText(echt);
    expect(text).toContain("withdrawal_end_age");
    expect(text).toContain("nicht an Ihrer Eingabe");
  });

  it("die Postgres-Variante wird genauso erkannt", () => {
    // Je nachdem, wo der Fehler entsteht, lautet er anders.
    const text = speicherFehlerText(new Error('column "einnahmen_basis" does not exist'));
    expect(text).toContain("einnahmen_basis");
    expect(text).not.toBe("Ein Fehler ist beim Speichern der Berechnung aufgetreten.");
  });

  it("jeder Fehler wird gemeldet, nicht nur angezeigt", () => {
    /*
     * Der Kern der Änderung. Vorher stand an jeder Aufrufstelle nur
     * `console.error(e)` – ein Fehler, den niemand sieht, lebt so lange, bis
     * ein Nutzer ihn meldet.
     */
    speicherFehlerText({ code: "PGRST204", message: "Could not find the 'x' column" });
    expect(_wartend()).toHaveLength(1);

    _zuruecksetzen();
    speicherFehlerText(new Error("irgendwas ganz anderes"));
    expect(_wartend(), "auch der unbekannte Fall wird gemeldet").toHaveLength(1);
  });

  it("der unbekannte Fall behält seinen Text", () => {
    expect(speicherFehlerText(new Error("Netzwerkfehler"))).toBe(
      "Ein Fehler ist beim Speichern der Berechnung aufgetreten.",
    );
    // Und etwas, das gar kein Fehlerobjekt ist, bringt die Funktion nicht um.
    expect(speicherFehlerText(null)).toContain("Fehler");
    expect(speicherFehlerText("Zeichenkette")).toContain("Fehler");
  });
});
