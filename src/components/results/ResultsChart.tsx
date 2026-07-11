// src/components/results/ResultsChart.tsx
// Verlaufschart LV vs. Depot auf Basis der gemeinsamen Simulations-Engine.
// Einziger Chart für Sparvertrag (CalculatorDetail); unterstützt Multi-Fonds
// mit Fallback auf die Legacy-Einzelfonds-Felder älterer Datensätze.

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatChartAxis,
} from "@/components/shared/CurrencyDisplay";
import {
  UserDefaults,
  depotTaxOptionsFromDefaults,
  lvTaxOptionsFromDefaults,
} from "@/entities/UserDefaults";
import {
  simulateDepot,
  simulateLv,
  type FundAllocation,
} from "@/lib/finance/simulation";
import { buildYearlySeries, type Mode } from "@/lib/finance/series";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

// Renditeabweichung der pessimistisch/optimistisch-Szenarien in %-Punkten
const SCENARIO_DELTA = 2;

export type { Mode };

export type Calc = {
  monthly_contribution: number;
  contract_duration_years: number;
  assumed_annual_return: number;
  birth_year: number;
  dynamik_percent?: number;

  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur?: number;
  lv_effective_costs_percent: number;
  lv_fund_ongoing_costs_percent: number;

  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;
  depot_costs_annual: number;

  // Multi-Fonds (neuere Datensätze); Fallback auf die Legacy-Felder oben
  lv_funds?: FundAllocation[];
  depot_funds?: FundAllocation[];

  results?: {
    life_insurance_gross: number;
    life_insurance_net: number;
    depot_gross: number;
    depot_net: number;
  };
};

export function lvFundsOf(calc: Calc): FundAllocation[] {
  if (Array.isArray(calc.lv_funds) && calc.lv_funds.length > 0) return calc.lv_funds;
  return [
    {
      allocation_eur: Number(calc.monthly_contribution) || 0,
      ongoing_costs_percent: Number(calc.lv_fund_ongoing_costs_percent) || 0,
    },
  ];
}

export function depotFundsOf(calc: Calc): FundAllocation[] {
  if (Array.isArray(calc.depot_funds) && calc.depot_funds.length > 0)
    return calc.depot_funds;
  return [
    {
      allocation_eur: Number(calc.monthly_contribution) || 0,
      ongoing_costs_percent: Number(calc.depot_fund_ongoing_costs_percent) || 0,
      initial_charge_percent: Number(calc.depot_fund_initial_charge_percent) || 0,
    },
  ];
}

type Props = {
  calculation: Calc;
  mode?: Mode;
  onModeChange?: (m: Mode) => void;
  showModeToggle?: boolean; // default true
};

export default function ResultsChart({
  calculation,
  mode,
  onModeChange,
  showModeToggle = true,
}: Props) {
  const [internalMode, setInternalMode] = useState<Mode>("gross");
  const [showReal, setShowReal] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const activeMode = mode ?? internalMode;

  const setMode = (m: Mode) => {
    if (onModeChange) onModeChange(m);
    if (mode === undefined) setInternalMode(m);
  };

  const inflationPercent = Number(UserDefaults.load().inflation_percent) || 0;

  const series = useMemo(() => {
    const years = Math.max(1, Math.round(calculation.contract_duration_years || 1));
    const months = years * 12;
    const d = UserDefaults.load();
    const baseReturn = Number(calculation.assumed_annual_return) || 0;

    const run = (annualReturn: number) => {
      const lv = simulateLv({
        months,
        annual_return_percent: annualReturn,
        monthly_contribution: Number(calculation.monthly_contribution) || 0,
        dynamik_percent: Number(calculation.dynamik_percent) || 0,
        funds: lvFundsOf(calculation),
        cost:
          (calculation.lv_cost_type ?? "eur") === "eur"
            ? {
                type: "eur",
                acquisition_costs_eur:
                  Number(calculation.life_insurance_acquisition_costs_eur) || 0,
                admin_costs_monthly_eur:
                  Number(calculation.lv_admin_costs_monthly_eur) || 0,
              }
            : {
                type: "percent",
                effective_costs_percent:
                  Number(calculation.lv_effective_costs_percent) || 0,
              },
      });
      const depot = simulateDepot({
        months,
        annual_return_percent: annualReturn,
        monthly_contribution: Number(calculation.monthly_contribution) || 0,
        dynamik_percent: Number(calculation.dynamik_percent) || 0,
        funds: depotFundsOf(calculation),
        depot_costs_annual_percent: Number(calculation.depot_costs_annual) || 0,
      });
      return buildYearlySeries({
        lv: lv.series,
        depot: depot.series,
        mode: activeMode,
        birth_year: calculation.birth_year,
        lvTaxOptions: lvTaxOptionsFromDefaults(d),
        depotTaxOptions: depotTaxOptionsFromDefaults(d),
      });
    };

    const main = run(baseReturn);
    const low = showScenarios ? run(baseReturn - SCENARIO_DELTA) : null;
    const high = showScenarios ? run(baseReturn + SCENARIO_DELTA) : null;

    const inflationRate = (Number(d.inflation_percent) || 0) / 100;
    const deflate = (value: number, year: number) =>
      showReal ? Math.round(value / Math.pow(1 + inflationRate, year)) : value;

    return main.map((p, i) => ({
      year: p.year,
      age: p.age,
      lv: deflate(p.lv, p.year),
      depot: deflate(p.depot, p.year),
      ...(low && high
        ? {
            lvBand: [deflate(low[i].lv, p.year), deflate(high[i].lv, p.year)],
            depotBand: [
              deflate(low[i].depot, p.year),
              deflate(high[i].depot, p.year),
            ],
          }
        : {}),
    }));
  }, [calculation, activeMode, showReal, showScenarios]);

  const end = useMemo(() => {
    const r = calculation.results;
    if (!r) return { lv: 0, depot: 0 };
    const nominal =
      activeMode === "gross"
        ? {
            lv: Number(r.life_insurance_gross || 0),
            depot: Number(r.depot_gross || 0),
          }
        : {
            lv: Number(r.life_insurance_net || 0),
            depot: Number(r.depot_net || 0),
          };
    if (!showReal) return nominal;
    const years = Math.max(1, Math.round(calculation.contract_duration_years || 1));
    const factor = Math.pow(1 + inflationPercent / 100, years);
    return {
      lv: Math.round(nominal.lv / factor),
      depot: Math.round(nominal.depot / factor),
    };
  }, [calculation, activeMode, showReal, inflationPercent]);

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 bg-linear-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Verlauf (LV vs Depot)
          </CardTitle>

          <div className="flex flex-wrap gap-2">
            {showModeToggle && (
              <>
                <Button
                  variant={activeMode === "gross" ? "default" : "outline"}
                  className={
                    activeMode === "gross" ? "bg-slate-800 hover:bg-slate-700" : ""
                  }
                  onClick={() => setMode("gross")}
                >
                  Brutto
                </Button>
                <Button
                  variant={activeMode === "net" ? "default" : "outline"}
                  className={
                    activeMode === "net" ? "bg-slate-800 hover:bg-slate-700" : ""
                  }
                  onClick={() => setMode("net")}
                >
                  Netto
                </Button>
              </>
            )}
            <Button
              variant={showReal ? "default" : "outline"}
              className={showReal ? "bg-slate-800 hover:bg-slate-700" : ""}
              onClick={() => setShowReal((v) => !v)}
              title={`Kaufkraftbereinigt mit ${inflationPercent.toLocaleString("de-DE")} % Inflation p.a. (Voreinstellungen)`}
            >
              Real
            </Button>
            <Button
              variant={showScenarios ? "default" : "outline"}
              className={showScenarios ? "bg-slate-800 hover:bg-slate-700" : ""}
              onClick={() => setShowScenarios((v) => !v)}
              title={`Bandbreite bei Rendite ±${SCENARIO_DELTA} %-Punkte`}
            >
              Szenarien
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {calculation.results && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">
                LV Endwert ({activeMode === "gross" ? "Brutto" : "Netto"}
                {showReal ? ", real" : ""})
              </div>
              <div className="text-xl font-bold text-slate-900">
                {formatCurrency(end.lv)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">
                Depot Endwert ({activeMode === "gross" ? "Brutto" : "Netto"}
                {showReal ? ", real" : ""})
              </div>
              <div className="text-xl font-bold text-slate-900">
                {formatCurrency(end.depot)}
              </div>
            </div>
          </div>
        )}

        <div className="h-90 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={series}
              margin={{ top: 10, right: 20, left: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatChartAxis} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const label = name === "lv" ? "LV" : "Depot";
                  return [formatCurrency(Number(value || 0)), label];
                }}
                labelFormatter={(year: any) => {
                  const p = series.find((x) => x.year === Number(year));
                  return p ? `Jahr ${year} (Alter ${p.age})` : `Jahr ${year}`;
                }}
              />
              <Legend />
              {showScenarios && (
                <>
                  <Area
                    dataKey="lvBand"
                    stroke="none"
                    fill="#2563eb"
                    fillOpacity={0.12}
                    legendType="none"
                    tooltipType="none"
                    isAnimationActive={false}
                  />
                  <Area
                    dataKey="depotBand"
                    stroke="none"
                    fill="#16a34a"
                    fillOpacity={0.12}
                    legendType="none"
                    tooltipType="none"
                    isAnimationActive={false}
                  />
                </>
              )}
              <Line
                type="monotone"
                dataKey="lv"
                name="LV"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="depot"
                name="Depot"
                stroke="#16a34a"
                strokeWidth={3}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="text-sm text-slate-600">
          Tipp: Mit der Maus über den Graph fahren → Jahreswerte + Alter.
          Standard ist <strong>Brutto</strong>.
          {showReal && (
            <>
              {" "}
              <strong>Real</strong>: kaufkraftbereinigt mit{" "}
              {inflationPercent.toLocaleString("de-DE")} % Inflation p.a.
            </>
          )}
          {showScenarios && (
            <>
              {" "}
              <strong>Szenarien</strong>: Bandbreite bei Rendite ±
              {SCENARIO_DELTA} %-Punkte.
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
