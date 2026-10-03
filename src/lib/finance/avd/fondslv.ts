// src/lib/finance/avd/fondslv.ts
// Fondsgebundene Lebensversicherung als Vergleichs- und Zweitvertrag im
// Altersvorsorgedepot-Rechner.
//
// Bewusst nur eine dünne Hülle über `simulateLv` aus der allgemeinen Engine:
// Eine zweite Monatsschleife würde früher oder später von der ersten
// abweichen. Die Hülle leistet dreierlei:
//   1. Einheiten übersetzen – das AVD-Modul rechnet in Dezimalen (0,07), die
//      allgemeine Engine in Prozentpunkten (7). Diese Umrechnung steht hier
//      an genau einer Stelle und nirgends sonst.
//   2. Die Besteuerung anhängen, die `simulateLv` nicht kennt.
//   3. Die Jahresreihe in dieselbe Form bringen wie `AvdErgebnis.jahre`.
//
// Steuerlich entscheidend: Bei mindestens zwölf Jahren Laufzeit und Auszahlung
// ab Alter 62 greift das Halbeinkünfteverfahren (42,5 % der Erträge zum
// persönlichen Satz, § 20 Abs. 1 Nr. 6 S. 2 EStG). Genau das ist der Grund,
// warum eine Fondspolice gegen den voll nachgelagert besteuerten AVD antreten
// kann. Darunter fällt sie auf Abgeltungsteuer zurück – ein Sprung von rund
// einem Drittel, der ohne Hinweis unerklärlich wirkt.

import { simulateLv, type LvCostConfig, type LvSimulationResult } from '../simulation';
import {
  calculateLifeInsuranceTax,
  calculateMonthlyReturn,
} from '@/components/shared/TaxCalculations';
import type { Hinweis } from './simulation';

/** Dezimal (0,07) → Prozentpunkte (7). Die einzige Stelle für diese Umrechnung. */
export const alsProzentpunkte = (dezimal: number): number => (Number(dezimal) || 0) * 100;

export type FondsLvKosten =
  | { art: 'eur'; abschlusskostenGesamt: number; verwaltungProMonat: number }
  | { art: 'prozent'; effektivkostenPaJahr: number };

export type FondsLvEingabe = {
  jahre: number;
  beitragMonatlich: number;
  /** Jährliche Beitragssteigerung als Dezimal. Ohne sie zahlt die Police
   *  weniger ein als der verglichene Vertrag. */
  beitragsdynamikPaJahr?: number;
  /** Alle Raten als Dezimal, wie im übrigen AVD-Modul. */
  renditeBruttoPaJahr: number;
  terPaJahr: number;
  kosten: FondsLvKosten;
  alterBeiAuszahlung: number;
  steuersatzImAlter: number;
  soliBeruecksichtigen: boolean;
  kirchensteuersatz: number;
  /** Nur für die Auszahlungsschätzung: Ende des Auszahlplans. */
  auszahlplanEndalter: number;
};

export type FondsLvErgebnis = {
  eingezahlt: number;
  endkapitalVorSteuer: number;
  steuer: number;
  endkapitalNachSteuer: number;
  /** Kapital am Ende jedes Laufzeitjahres, vor der Endbesteuerung. */
  kapitalProJahr: number[];
  kosten: LvSimulationResult['costs'];
  /** true, wenn das Halbeinkünfteverfahren greift. */
  halbeinkuenfte: boolean;
  hinweise: Hinweis[];
};

/** Mindestlaufzeit und Mindestalter für das Halbeinkünfteverfahren. */
const HALBEINKUENFTE_JAHRE = 12;
const HALBEINKUENFTE_ALTER = 62;

export function simuliereFondsLv(e: FondsLvEingabe): FondsLvErgebnis {
  const jahre = Math.max(1, Math.round(e.jahre));
  const months = jahre * 12;

  const cost: LvCostConfig =
    e.kosten.art === 'eur'
      ? {
          type: 'eur',
          acquisition_costs_eur: Math.max(0, e.kosten.abschlusskostenGesamt),
          admin_costs_monthly_eur: Math.max(0, e.kosten.verwaltungProMonat),
        }
      : {
          type: 'percent',
          effective_costs_percent: alsProzentpunkte(e.kosten.effektivkostenPaJahr),
        };

  const lv = simulateLv({
    months,
    annual_return_percent: alsProzentpunkte(e.renditeBruttoPaJahr),
    monthly_contribution: Math.max(0, e.beitragMonatlich),
    dynamik_percent: alsProzentpunkte(e.beitragsdynamikPaJahr ?? 0),
    // Ein einzelner Fonds: `weightedFundCosts` zählt ihn unabhängig von der
    // Allokation voll, der Betrag ist deshalb beliebig.
    funds: [{ allocation_eur: 1, ongoing_costs_percent: alsProzentpunkte(e.terPaJahr) }],
    cost,
  });

  const gewinn = Math.max(0, lv.gross_capital - lv.total_contributions);
  const halbeinkuenfte =
    jahre >= HALBEINKUENFTE_JAHRE && e.alterBeiAuszahlung >= HALBEINKUENFTE_ALTER;

  const steuer = calculateLifeInsuranceTax(gewinn, jahre, e.alterBeiAuszahlung, {
    personalIncomeTaxRate: e.steuersatzImAlter,
    solidaritaetszuschlag: e.soliBeruecksichtigen,
    // Achtung: Die Steuerhelfer erwarten ganze Prozent, das AVD-Modul liefert
    // Dezimalbrüche. Ohne diese Umrechnung wäre die Kirchensteuer 100-fach.
    kirchensteuer_percent: alsProzentpunkte(e.kirchensteuersatz),
  });

  const kapitalProJahr: number[] = [];
  for (let jahr = 1; jahr <= jahre; jahr++) {
    kapitalProJahr.push(lv.series[jahr * 12 - 1]?.capital ?? 0);
  }

  const hinweise: Hinweis[] = [];
  if (!halbeinkuenfte) {
    hinweise.push({
      art: 'warnung',
      text:
        `Das Halbeinkünfteverfahren greift erst ab ${HALBEINKUENFTE_JAHRE} Jahren Laufzeit ` +
        `und Auszahlung ab Alter ${HALBEINKUENFTE_ALTER}. Hier wird die Police deshalb mit ` +
        `Abgeltungsteuer auf 85 % der Erträge belastet – das ist deutlich mehr.`,
    });
  }

  return {
    eingezahlt: lv.total_contributions,
    endkapitalVorSteuer: lv.gross_capital,
    steuer,
    endkapitalNachSteuer: lv.gross_capital - steuer,
    kapitalProJahr,
    kosten: lv.costs,
    halbeinkuenfte,
    hinweise,
  };
}

/**
 * Tragbare monatliche Entnahme aus dem Nachsteuerkapital der Police.
 * Verwendet bewusst dieselbe Annuitätenformel wie AVD-Auszahlplan und
 * Vergleichsdepot – sonst entstünde der Unterschied allein aus dem Rechenweg.
 */
export function monatsentnahmeFondsLv(
  e: Pick<
    FondsLvEingabe,
    'renditeBruttoPaJahr' | 'terPaJahr' | 'alterBeiAuszahlung' | 'auszahlplanEndalter'
  >,
  endkapitalNachSteuer: number,
  monatlicheEntnahme: (kapital: number, rMonat: number, monate: number) => number
): number {
  const monate = Math.max(12, Math.round((e.auszahlplanEndalter - e.alterBeiAuszahlung) * 12));
  const rMonat = calculateMonthlyReturn(
    alsProzentpunkte(e.renditeBruttoPaJahr) - alsProzentpunkte(e.terPaJahr)
  );
  return monatlicheEntnahme(endkapitalNachSteuer, rMonat, monate);
}
