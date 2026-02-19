// src/shared/CostBreakdown.ts
// Single Source of Truth: Kosten-Aufschlüsselung für LV & Depot
// - LV "actual": Abschluss/Vertrieb gezillmert (max 60 Monate) + Verwaltung monatlich über Laufzeit
// - LV "effective": 70/30 (Sonderfall <= 60 Monate: 60/40) -> upfront/ongoing verteilt
// - Depot "actual": initial charge (AA) + depot fee monatlich (optional: spreadMonths für AA)

export type CostModel = "lv" | "depot";
export type CostMode = "actual" | "effective";

export type CostBucket = {
  /** Gesamtkosten dieser Kategorie in € */
  total: number;
  /** Über wie viele Monate verteilt (für upfront). Für ongoing entspricht das meist der Laufzeit. */
  months: number;
  /** €/Monat über months verteilt */
  perMonth: number;
};

export type CostBreakdown = {
  months: number;

  /** anfänglich/gezillmert/AA */
  upfront: CostBucket;

  /** laufend/Verwaltung/Depotgebühr */
  ongoing: CostBucket;

  totals: {
    total: number;
    /** €/Monat in den ersten 60 Monaten (oder weniger bei kurzer Laufzeit) */
    perMonthYears1to5: number;
    /** €/Monat ab Monat 61 (bei Laufzeiten > 60), i.d.R. ongoing */
    perMonthAfter5y: number;
  };

  meta: {
    model: CostModel;
    mode: CostMode;
    /** optionaler Hinweis für UI/Debug */
    notes?: string;
  };
};

/** Ergebnis für Simulation/Charts: Monatskosten pro Monat (Länge = months) */
export type MonthlyCostSeries = {
  months: number;
  /** Kosten je Monat (Summe) */
  total: number[];
  /** optional: Aufschlüsselung */
  upfront: number[];
  ongoing: number[];
};

/* ----------------------------- Utilities ----------------------------- */

function toSafeMonths(value: number): number {
  const n = Number.isFinite(value) ? Math.floor(value) : 0;
  return Math.max(1, n);
}

function nn(value: number): number {
  const n = Number.isFinite(value) ? value : 0;
  return Math.max(0, n);
}

function div(numerator: number, denominator: number): number {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  )
    return 0;
  return numerator / denominator;
}

function buildTotals(
  months: number,
  upfrontPerMonth: number,
  ongoingPerMonth: number
) {
  const m = toSafeMonths(months);
  const zMonths = Math.min(60, m);

  const pm1to5 = nn(upfrontPerMonth) + nn(ongoingPerMonth);
  const pmAfter = nn(ongoingPerMonth);

  return {
    perMonthYears1to5: pm1to5,
    perMonthAfter5y: pmAfter,
    zillmerMonths: zMonths,
  };
}

function makeSeries(
  months: number,
  upfront: CostBucket,
  ongoing: CostBucket
): MonthlyCostSeries {
  const m = toSafeMonths(months);

  const upfrontArr = Array.from({ length: m }, (_, i) =>
    i < upfront.months ? upfront.perMonth : 0
  );
  const ongoingArr = Array.from({ length: m }, () => ongoing.perMonth);

  const totalArr = upfrontArr.map((u, i) => u + ongoingArr[i]);

  return {
    months: m,
    upfront: upfrontArr,
    ongoing: ongoingArr,
    total: totalArr,
  };
}

/* -------------------------- LV: ACTUAL -------------------------- */

export type BuildLvActualArgs = {
  contractMonths: number;

  /** Abschluss- & Vertriebskosten gesamt (€) */
  acquisitionTotal: number;

  /** Verwaltungskosten als fixer Monatsbetrag (€/Monat) über die gesamte Laufzeit */
  adminMonthly: number;

  /** Zillmer-Kappung (Default: 60 Monate) */
  zillmerCapMonths?: number;
};

/**
 * LV tatsächliche Kosten:
 * - Abschluss/Vertrieb: gezillmert über min(60, Laufzeit) Monate
 * - Verwaltung: adminMonthly über komplette Laufzeit
 */
export function buildLvCostBreakdownActual(
  args: BuildLvActualArgs
): CostBreakdown {
  const months = toSafeMonths(args.contractMonths);
  const zCap = args.zillmerCapMonths ?? 60;

  const acquisitionTotal = nn(args.acquisitionTotal);
  const adminMonthly = nn(args.adminMonthly);

  const upfrontMonths = Math.min(Math.max(1, Math.floor(zCap)), months);
  const upfrontPerMonth = div(acquisitionTotal, upfrontMonths);

  const ongoingMonths = months;
  const ongoingPerMonth = adminMonthly;
  const ongoingTotal = ongoingPerMonth * ongoingMonths;

  const total = acquisitionTotal + ongoingTotal;

  const t = buildTotals(months, upfrontPerMonth, ongoingPerMonth);

  return {
    months,
    upfront: {
      total: acquisitionTotal,
      months: upfrontMonths,
      perMonth: upfrontPerMonth,
    },
    ongoing: {
      total: ongoingTotal,
      months: ongoingMonths,
      perMonth: ongoingPerMonth,
    },
    totals: {
      total,
      perMonthYears1to5: t.perMonthYears1to5,
      perMonthAfter5y: t.perMonthAfter5y,
    },
    meta: {
      model: "lv",
      mode: "actual",
      notes: `Zillmerung über ${upfrontMonths} Monate, Verwaltung ${ongoingPerMonth.toFixed(
        2
      )} €/Monat`,
    },
  };
}

/* ------------------------ LV: EFFECTIVE (70/30) ------------------------ */

export type EffectiveShares = {
  normal: { upfront: number; ongoing: number }; // sum = 1
  short: { upfront: number; ongoing: number }; // sum = 1
  shortThresholdMonths: number; // Default: 60
};

export type BuildLvEffectiveArgs = {
  contractMonths: number;

  /**
   * Gesamtkosten über die komplette Laufzeit in €,
   * die nach 70/30 (bzw. 60/40 bei <= 60 Monaten) verteilt werden.
   */
  totalCosts: number;

  /** Verteilmonate für upfront (Default: 60) */
  upfrontCapMonths?: number;

  /** Default: 70/30 und short <= 60: 60/40 */
  shares?: Partial<EffectiveShares>;
};

const DEFAULT_SHARES: EffectiveShares = {
  normal: { upfront: 0.7, ongoing: 0.3 },
  short: { upfront: 0.6, ongoing: 0.4 },
  shortThresholdMonths: 60,
};

function resolveShares(custom?: Partial<EffectiveShares>): EffectiveShares {
  const merged: EffectiveShares = {
    normal: {
      upfront: custom?.normal?.upfront ?? DEFAULT_SHARES.normal.upfront,
      ongoing: custom?.normal?.ongoing ?? DEFAULT_SHARES.normal.ongoing,
    },
    short: {
      upfront: custom?.short?.upfront ?? DEFAULT_SHARES.short.upfront,
      ongoing: custom?.short?.ongoing ?? DEFAULT_SHARES.short.ongoing,
    },
    shortThresholdMonths:
      custom?.shortThresholdMonths ?? DEFAULT_SHARES.shortThresholdMonths,
  };

  // minimal guard: normalize to sum=1 if user sets weird numbers
  const fix = (u: number, o: number) => {
    const s = u + o;
    if (!Number.isFinite(s) || s <= 0) return { upfront: 0.7, ongoing: 0.3 };
    return { upfront: u / s, ongoing: o / s };
  };

  merged.normal = fix(nn(merged.normal.upfront), nn(merged.normal.ongoing));
  merged.short = fix(nn(merged.short.upfront), nn(merged.short.ongoing));
  merged.shortThresholdMonths = Math.max(
    1,
    Math.floor(merged.shortThresholdMonths)
  );

  return merged;
}

/**
 * LV Effektivkosten:
 * - totalCosts wird nach Shares verteilt:
 *   - standard: 70% upfront / 30% ongoing
 *   - bei Laufzeit <= 60 Monate: 60% upfront / 40% ongoing
 * - upfront wird über min(60, Laufzeit) Monate verteilt (oder upfrontCapMonths)
 * - ongoing gleichmäßig über Laufzeit
 */
export function buildLvCostBreakdownEffective(
  args: BuildLvEffectiveArgs
): CostBreakdown {
  const months = toSafeMonths(args.contractMonths);
  const totalCosts = nn(args.totalCosts);

  const shares = resolveShares(args.shares);
  const useShort = months <= shares.shortThresholdMonths;

  const sh = useShort ? shares.short : shares.normal;

  const upfrontTotal = totalCosts * sh.upfront;
  const ongoingTotal = totalCosts * sh.ongoing;

  const cap = args.upfrontCapMonths ?? 60;

  const upfrontMonths = Math.min(Math.max(1, Math.floor(cap)), months);
  const upfrontPerMonth = div(upfrontTotal, upfrontMonths);

  const ongoingMonths = months;
  const ongoingPerMonth = div(ongoingTotal, ongoingMonths);

  const t = buildTotals(months, upfrontPerMonth, ongoingPerMonth);

  return {
    months,
    upfront: {
      total: upfrontTotal,
      months: upfrontMonths,
      perMonth: upfrontPerMonth,
    },
    ongoing: {
      total: ongoingTotal,
      months: ongoingMonths,
      perMonth: ongoingPerMonth,
    },
    totals: {
      total: totalCosts,
      perMonthYears1to5: t.perMonthYears1to5,
      perMonthAfter5y: t.perMonthAfter5y,
    },
    meta: {
      model: "lv",
      mode: "effective",
      notes: useShort
        ? "Effektivkosten (short): 60/40"
        : "Effektivkosten (normal): 70/30",
    },
  };
}

/* -------------------------- DEPOT: ACTUAL -------------------------- */

export type BuildDepotActualArgs = {
  contractMonths: number;

  /** Ausgabeaufschlag / initial charges gesamt (€) */
  initialChargeTotal: number;

  /** Depotkosten als fixer Monatsbetrag (€/Monat) */
  depotFeeMonthly: number;

  /**
   * Optional: wenn der initial charge für UI/Simulation über X Monate verteilt werden soll.
   * Default: 1 (praktisch einmalig). Wenn du wie LV "über 60 Monate" darstellen willst, setz 60.
   */
  spreadMonths?: number;
};

export function buildDepotCostBreakdownActual(
  args: BuildDepotActualArgs
): CostBreakdown {
  const months = toSafeMonths(args.contractMonths);

  const initTotal = nn(args.initialChargeTotal);
  const depotFeeMonthly = nn(args.depotFeeMonthly);

  const spread = args.spreadMonths ?? 1;
  const upfrontMonths = Math.min(Math.max(1, Math.floor(spread)), months);
  const upfrontPerMonth = div(initTotal, upfrontMonths);

  const ongoingMonths = months;
  const ongoingPerMonth = depotFeeMonthly;
  const ongoingTotal = ongoingPerMonth * ongoingMonths;

  const total = initTotal + ongoingTotal;

  const t = buildTotals(months, upfrontPerMonth, ongoingPerMonth);

  return {
    months,
    upfront: {
      total: initTotal,
      months: upfrontMonths,
      perMonth: upfrontPerMonth,
    },
    ongoing: {
      total: ongoingTotal,
      months: ongoingMonths,
      perMonth: ongoingPerMonth,
    },
    totals: {
      total,
      perMonthYears1to5: t.perMonthYears1to5,
      perMonthAfter5y: t.perMonthAfter5y,
    },
    meta: {
      model: "depot",
      mode: "actual",
      notes: `Initial charges verteilt über ${upfrontMonths} Monat(e), Depotgebühr ${ongoingPerMonth.toFixed(
        2
      )} €/Monat`,
    },
  };
}

/* ---------------------- Convenience Helpers ---------------------- */

/** Erzeugt eine Monatskosten-Serie (z. B. für Simulation, Tooltip, Charts) */
export function toMonthlyCostSeries(
  breakdown: CostBreakdown
): MonthlyCostSeries {
  return makeSeries(breakdown.months, breakdown.upfront, breakdown.ongoing);
}

/**
 * Praktischer Helper fürs UI: liefert einen Breakdown aus 2 Kategorien (upfront/ongoing)
 * als "ChartData"-Format, falls du später Recharts stacked bars nutzen willst.
 */
export function toStackedChartDatum(
  label: string,
  breakdown: CostBreakdown,
  keys?: { upfrontKey?: string; ongoingKey?: string }
): Record<string, string | number> {
  const upfrontKey = keys?.upfrontKey ?? "Upfront";
  const ongoingKey = keys?.ongoingKey ?? "Ongoing";
  return {
    name: label,
    [upfrontKey]: breakdown.upfront.total,
    [ongoingKey]: breakdown.ongoing.total,
  };
}
