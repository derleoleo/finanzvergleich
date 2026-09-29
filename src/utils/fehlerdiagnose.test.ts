import { describe, expect, it } from "vitest";
import { ohneParameter } from "./fehlerdiagnose";

describe("Adressen für die Fehlerdiagnose (F20)", () => {
  it("entfernt die Kennung gespeicherter Berechnungen", () => {
    expect(ohneParameter("https://www.vorsorgewaage.de/calculator/detail?id=abc-123"))
      .toBe("https://www.vorsorgewaage.de/calculator/detail");
  });

  it("lässt Adressen ohne Parameter unverändert", () => {
    expect(ohneParameter("https://www.vorsorgewaage.de/pricing"))
      .toBe("https://www.vorsorgewaage.de/pricing");
  });

  it("kommt mit relativen Pfaden zurecht", () => {
    expect(ohneParameter("/net-policy?id=xyz")).toMatch(/\/net-policy$/);
  });

  it("reicht leere Werte durch", () => {
    expect(ohneParameter(undefined)).toBeUndefined();
    expect(ohneParameter("")).toBe("");
  });
});
