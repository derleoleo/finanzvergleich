import { describe, expect, it } from "vitest";
import { baueEntnahmeplan } from "./entnahmeplan";

const basis = {
  startCapital: 100_000,
  annualWithdrawal: 10_000,
  annualReturnPercent: 0,
  startAge: 65,
  endAge: 75,
};

describe("Entnahmeplan (F15)", () => {
  it("entnimmt ab dem ersten Jahr, ohne Freijahr", () => {
    const plan = baueEntnahmeplan(basis);
    expect(plan[0].age).toBe(65);
    expect(plan[0].withdrawal).toBe(10_000);
  });

  it("respektiert einen Aufschub", () => {
    const plan = baueEntnahmeplan({ ...basis, aufschubJahre: 2 });
    expect(plan[0].withdrawal).toBe(0);
    expect(plan[1].withdrawal).toBe(0);
    expect(plan[2].withdrawal).toBe(10_000);
  });

  it("erzwingt keine Komplettentnahme am Ende", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 70 });
    const letzte = plan[plan.length - 1];
    expect(letzte.withdrawal).toBe(10_000);
    expect(letzte.endCapital).toBeGreaterThan(0); // Restkapital bleibt stehen
  });

  it("entnimmt am Ende alles, wenn es gewünscht ist", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 70, komplettentnahmeAmEnde: true });
    const letzte = plan[plan.length - 1];
    expect(letzte.endCapital).toBe(0);
    expect(letzte.withdrawal).toBeGreaterThan(10_000);
  });

  it("weist Verluste als negatives Wachstum aus", () => {
    const plan = baueEntnahmeplan({ ...basis, annualReturnPercent: -10 });
    expect(plan[0].growth).toBeLessThan(0);
  });

  it("stoppt, wenn das Kapital aufgebraucht ist", () => {
    const plan = baueEntnahmeplan({ ...basis, annualWithdrawal: 30_000 });
    const letzte = plan[plan.length - 1];
    expect(letzte.endCapital).toBeLessThanOrEqual(0);
    expect(letzte.totalWithdrawn).toBeCloseTo(100_000, 0);
    expect(plan.length).toBeLessThan(11);
  });

  it("berücksichtigt Sonderentnahmen", () => {
    const plan = baueEntnahmeplan({ ...basis, specialWithdrawals: { 1: 25_000 } });
    expect(plan[1].withdrawal).toBe(25_000);
    expect(plan[2].withdrawal).toBe(10_000);
  });

  it("verkraftet Startalter gleich Endalter", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 65 });
    expect(plan).toHaveLength(1);
  });

  it("erzwingt auch bei einer einzigen Periode keine Komplettentnahme", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 65 });
    expect(plan[0].withdrawal).toBe(10_000);
    expect(plan[0].endCapital).toBe(90_000); // Restkapital bleibt stehen
  });

  it("entnimmt bei einer einzigen Periode alles, wenn es gewünscht ist", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 65, komplettentnahmeAmEnde: true });
    expect(plan[0].withdrawal).toBe(100_000);
    expect(plan[0].endCapital).toBe(0);
  });

  it("beachtet eine Sonderentnahme in der einzigen Periode", () => {
    const plan = baueEntnahmeplan({
      ...basis,
      endAge: 65,
      specialWithdrawals: { 0: 4_000 },
    });
    expect(plan[0].withdrawal).toBe(4_000);
  });

  it("beachtet einen Aufschub in der einzigen Periode", () => {
    const plan = baueEntnahmeplan({ ...basis, endAge: 65, aufschubJahre: 1 });
    expect(plan[0].withdrawal).toBe(0);
  });
  // Einzahlungen (Erbe o. Ae.): negativer Sonderbetrag. Die Richtung ist durch
  // die gespeicherten Plaene vorgegeben - positiv bleibt die Entnahme.
  describe("Einzahlungen", () => {
    it("erhoeht das Kapital, statt es zu mindern", () => {
      const plan = baueEntnahmeplan({
        ...basis,
        specialWithdrawals: { 2: -50_000 },
      });
      expect(plan[2].withdrawal).toBe(-50_000);
      // Jahresanfang 80.000, Einzahlung 50.000, keine Rendite
      expect(plan[2].startCapital).toBe(80_000);
      expect(plan[2].endCapital).toBe(130_000);
    });

    it("laesst den Plan laenger reichen, ohne die Entnahme zu aendern", () => {
      const ohne = baueEntnahmeplan({ ...basis, endAge: 95 });
      const mit = baueEntnahmeplan({
        ...basis,
        endAge: 95,
        specialWithdrawals: { 1: -30_000 },
      });
      // Die jaehrliche Entnahme bleibt, wie sie war
      expect(mit[0].withdrawal).toBe(10_000);
      expect(mit[5].withdrawal).toBe(10_000);
      // ... aber 30.000 zusaetzlich tragen drei Entnahmen mehr. Gezaehlt
      // werden die Entnahmejahre, nicht die Zeilen: Das Einzahlungsjahr ist
      // selbst eine Zeile, in der nichts entnommen wird.
      const entnahmejahre = (zeilen: typeof ohne) =>
        zeilen.filter((z) => z.withdrawal > 0).length;
      expect(entnahmejahre(ohne)).toBe(10);
      expect(entnahmejahre(mit)).toBe(13);
    });

    it("zaehlt nicht in die Gesamtentnahme", () => {
      const plan = baueEntnahmeplan({
        ...basis,
        specialWithdrawals: { 1: -20_000 },
      });
      const letzte = plan[plan.length - 1];
      // Elf Planjahre, davon eines die Einzahlung: zehn Entnahmen zu 10.000.
      // Die Einzahlung mindert die Summe nicht, sie taucht darin gar nicht auf.
      expect(letzte.totalWithdrawn).toBe(100_000);
    });

    it("wird nicht auf das vorhandene Kapital gedeckelt", () => {
      // Der Deckel gilt nur fuer Entnahmen. Eine Einzahlung von 200.000 bei
      // 100.000 Kapital muss vollstaendig ankommen.
      const plan = baueEntnahmeplan({
        ...basis,
        specialWithdrawals: { 0: -200_000 },
      });
      expect(plan[0].endCapital).toBe(300_000);
    });

    it("wirkt auch waehrend der Aufschubzeit", () => {
      // Ein Erbe vor dem Entnahmebeginn ist ein sinnvoller Fall. Vorher wurde
      // jeder Sonderbetrag im Aufschub stillschweigend verworfen.
      const plan = baueEntnahmeplan({
        ...basis,
        aufschubJahre: 3,
        specialWithdrawals: { 1: -40_000 },
      });
      expect(plan[1].withdrawal).toBe(-40_000);
      expect(plan[1].endCapital).toBe(140_000);
      // Entnommen wird trotzdem erst nach dem Aufschub
      expect(plan[2].withdrawal).toBe(0);
      expect(plan[3].withdrawal).toBe(10_000);
    });
  });

  // Schutz der gespeicherten Plaene: Sie enthalten ausschliesslich positive
  // Sonderbetraege. Waere die Richtung gedreht worden, laese jeder alte Plan
  // seine Entnahmen als Einzahlungen - deshalb diese Zusage.
  it("rechnet einen Plan ohne negative Sonderbetraege unveraendert", () => {
    const plan = baueEntnahmeplan({
      ...basis,
      specialWithdrawals: { 0: 25_000, 3: 0, 5: 40_000 },
    });
    expect(plan.map((z) => z.withdrawal).slice(0, 7)).toEqual([
      25_000, 10_000, 10_000, 0, 10_000, 40_000,
      // Nach der Sonderentnahme von 40.000 sind nur noch 5.000 uebrig - die
      // Deckelung auf das vorhandene Kapital greift hier schon.
      5_000,
    ]);
    // Und die Deckelung auf das vorhandene Kapital gilt weiter
    const knapp = baueEntnahmeplan({
      ...basis,
      startCapital: 5_000,
      specialWithdrawals: { 0: 99_000 },
    });
    expect(knapp[0].withdrawal).toBe(5_000);
    expect(knapp[0].endCapital).toBe(0);
  });
});
