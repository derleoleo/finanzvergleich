import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatChartAxis,
} from "@/components/shared/CurrencyDisplay";
import {
  calculateAgeAtPayout,
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  calculateMonthlyReturn,
  calculateZillmerMonths,
} from "@/components/shared/TaxCalculations";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";

export type Mode = "gross" | "net";

export type Calc = {
  monthly_contribution: number;
  contract_duration_years: number;
  assumed_annual_return: number;
  birth_year: number;

  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_effective_costs_percent: number;
  lv_fund_ongoing_costs_percent: number;

  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;
  depot_costs_annual: number;

  results?: {
    total_contributions?: number;
    life_insurance_gross: number;
    life_insurance_net: number;
    depot_gross: number;
    depot_net: number;
  };
};

type SeriesPoint = {
  year: number;
  age: number;
  lv: number;
  depot: number;
};

function buildSeries(calc: Calc, mode: Mode): SeriesPoint[] {
  const years = Math.max(1, Math.round(calc.contract_duration_years || 1));
  const months = years * 12;

  const monthlyContribution = Number(calc.monthly_contribution || 0);
  const monthlyReturn = calculateMonthlyReturn(
    Number(calc.assumed_annual_return || 0)
  );

  // LV
  let lvCapital = 0;
  const lvFundMonthlyRate =
    Number(calc.lv_fund_ongoing_costs_percent || 0) / 100 / 12;
  const zillmerMonths = calculateZillmerMonths(months);
  const monthlyZillmer =
    Number(calc.life_insurance_acquisition_costs_eur || 0) /
    Math.max(1, zillmerMonths);
  const lvEffectiveMonthlyRate =
    Number(calc.lv_effective_costs_percent || 0) / 100 / 12;

  // Depot
  let depotCapital = 0;
  const initialChargeRate =
    Number(calc.depot_fund_initial_charge_percent || 0) / 100;
  const initialChargeFactor = 1 - initialChargeRate;
  const depotFundMonthlyRate =
    Number(calc.depot_fund_ongoing_costs_percent || 0) / 100 / 12;
  const depotDepotMonthlyRate = Number(calc.depot_costs_annual || 0) / 100 / 12;

  const points: SeriesPoint[] = [];
  let contributionsSoFar = 0;

  for (let m = 1; m <= months; m++) {
    contributionsSoFar += monthlyContribution;

    // LV month
    const lvFundCost = lvCapital * lvFundMonthlyRate;
    if ((calc.lv_cost_type ?? "eur") === "eur") {
      const contribAfterZillmer =
        m <= zillmerMonths
          ? monthlyContribution - monthlyZillmer
          : monthlyContribution;
      lvCapital =
        lvCapital * (1 + monthlyReturn) + contribAfterZillmer - lvFundCost;
    } else {
      const lvEffectiveCost = lvCapital * lvEffectiveMonthlyRate;
      lvCapital =
        lvCapital * (1 + monthlyReturn) +
        monthlyContribution -
        lvFundCost -
        lvEffectiveCost;
    }

    // Depot month
    const depotFundCost = depotCapital * depotFundMonthlyRate;
    const depotCost = depotCapital * depotDepotMonthlyRate;
    const contribAfterInitial = monthlyContribution * initialChargeFactor;
    depotCapital =
      depotCapital * (1 + monthlyReturn) +
      contribAfterInitial -
      depotFundCost -
      depotCost;

    // yearly checkpoint
    if (m % 12 === 0) {
      const year = m / 12;
      const age = calculateAgeAtPayout(calc.birth_year, year);

      if (mode === "gross") {
        points.push({
          year,
          age,
          lv: Math.round(lvCapital),
          depot: Math.round(depotCapital),
        });
      } else {
        const lvGains = lvCapital - contributionsSoFar;
        const depotGains = depotCapital - contributionsSoFar;

        const lvTax = calculateLifeInsuranceTax(lvGains, year, age);
        const depotTax = calculateCapitalGainsTax(depotGains);

        points.push({
          year,
          age,
          lv: Math.round(lvCapital - lvTax),
          depot: Math.round(depotCapital - depotTax),
        });
      }
    }
  }

  return points;
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
  const activeMode = mode ?? internalMode;

  const setMode = (m: Mode) => {
    if (onModeChange) onModeChange(m);
    if (mode === undefined) setInternalMode(m);
  };

  const series = useMemo(
    () => buildSeries(calculation, activeMode),
    [calculation, activeMode]
  );

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

          {showModeToggle && (
            <div className="flex gap-2">
              <Button
                variant={activeMode === "gross" ? "default" : "outline"}
                className={
                  activeMode === "gross"
                    ? "bg-slate-800 hover:bg-slate-700"
                    : ""
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
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="h-90 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="text-sm text-slate-600">
          Tipp: Mit der Maus über den Graph fahren → du siehst Jahreswerte und
          Alter. Standard ist <strong>Brutto</strong>.
        </div>
      </CardContent>
    </Card>
  );
}
