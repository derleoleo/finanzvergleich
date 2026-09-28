import { describe, expect, it } from "vitest";
import {
  MODELL_VERSION,
  modellStempel,
  stammtAusAelteremModell,
} from "./modell";
import { buildYearlySeries } from "./series";

describe("Modellstempel (F13)", () => {
  it("stempelt Version, Stichtag und Alter", () => {
    const stempel = modellStempel(67);
    expect(stempel.modell_version).toBe(MODELL_VERSION);
    expect(stempel.bewertet_am).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(stempel.alter_bei_auszahlung).toBe(67);
    expect(stempel.rechtsstand).toContain("2026");
  });

  it("erkennt ältere Berechnungen", () => {
    expect(stammtAusAelteremModell(undefined)).toBe(true);
    expect(stammtAusAelteremModell({ modell_version: "2020-01-01" })).toBe(true);
    expect(stammtAusAelteremModell(modellStempel())).toBe(false);
  });
});

describe("Verlauf mit festem Stichtagsalter (F13)", () => {
  const reihe = Array.from({ length: 24 }, (_, i) => ({
    month: i + 1,
    capital: 1000 * (i + 1),
    contributions_cum: 900 * (i + 1),
  }));

  it("nutzt das gespeicherte Alter statt des Kalenderjahres", () => {
    const mit = buildYearlySeries({
      lv: reihe, depot: reihe, mode: "gross", birth_year: 1985, alter_heute: 40,
    });
    expect(mit.map((p) => p.age)).toEqual([41, 42]);
  });

  it("fällt ohne gespeichertes Alter auf das Geburtsjahr zurück", () => {
    const ohne = buildYearlySeries({
      lv: reihe, depot: reihe, mode: "gross", birth_year: 1985,
    });
    const alterHeute = new Date().getFullYear() - 1985;
    expect(ohne.map((p) => p.age)).toEqual([alterHeute + 1, alterHeute + 2]);
  });
});
