// src/components/results/CostBreakdown.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PieChart } from "lucide-react";
import {
  formatCurrency,
  formatChartAxis,
} from "@/components/shared/CurrencyDisplay";

import {
  buildLvCostBreakdownActual,
  buildDepotCostBreakdownActual,
} from "@/components/shared/CostBreakdown";

type Calc = {
  // Eingaben (für Fallback / Rekonstruktion)
  contract_duration_years?: number;
  monthly_contribution?: number;

  lv_cost_type?: "eur" | "percent";
  life_insurance_acquisition_costs_eur?: number;
  lv_admin_costs_monthly_eur?: number;

  depot_fund_initial_charge_percent?: number;
  depot_costs_annual?: number;

  results?: {
    li_total_costs?: number;
    depot_total_costs?: number;

    li_acquisition_costs?: number;
    li_fund_costs?: number;
    li_effective_costs?: number; // Verwaltung (eur) / Effektiv-Anteil (percent)

    depot_initial_charges?: number;
    depot_fund_costs?: number;
    depot_depot_costs?: number;
  };
};

function n(v: any): number {
  const x = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(x) ? x : 0;
}

export default function CostBreakdown({ calculation }: { calculation: Calc }) {
  const r = calculation.results ?? {};

  const years = Math.max(
    1,
    Math.floor(n(calculation.contract_duration_years || 0) || 1)
  );
  const months = years * 12;

  // -----------------------------
  // LV: zentrale Rekonstruktion (für EUR-Modus)
  // -----------------------------
  const lvThirdLabel =
    calculation.lv_cost_type === "eur" ? "Verwaltung" : "Effektivkosten";

  // Werte bevorzugt aus results (weil dort die echte Simulation steckt),
  // aber EUR-Modus: Abschluss/Verwaltung kann rekonstruiert werden, falls leer.
  const fallbackLv =
    calculation.lv_cost_type === "eur"
      ? buildLvCostBreakdownActual({
          contractMonths: months,
          acquisitionTotal: n(calculation.life_insurance_acquisition_costs_eur),
          adminMonthly: n(calculation.lv_admin_costs_monthly_eur),
        })
      : null;

  const liAcq =
    n(r.li_acquisition_costs) ||
    n(calculation.life_insurance_acquisition_costs_eur) ||
    n(fallbackLv?.upfront.total) ||
    0;

  const liEff = n(r.li_effective_costs) || n(fallbackLv?.ongoing.total) || 0;

  const liFund = n(r.li_fund_costs) || 0;

  const liTotal = n(r.li_total_costs) || liAcq + liFund + liEff;

  // -----------------------------
  // Depot: bevorzugt results, fallback aus shared-Logik
  // -----------------------------
  const depotInit = n(r.depot_initial_charges) || 0;
  const depotFund = n(r.depot_fund_costs) || 0;
  const depotDepot = n(r.depot_depot_costs) || 0;

  const fallbackDepot = buildDepotCostBreakdownActual({
    contractMonths: months,
    initialChargeTotal: depotInit, // wenn unknown -> 0
    depotFeeMonthly: 0, // wir nehmen besser results.depot_depot_costs
    spreadMonths: 1,
  });

  const depotTotal =
    n(r.depot_total_costs) || depotInit + depotFund + depotDepot;

  // Wenn Breakdown fehlt: NICHT mehr 70/30 raten, sondern 0 lassen.
  // (du hast results jetzt sowieso befüllt)
  const safeDepotFund = depotFund;
  const safeDepotDepot = depotDepot;

  const chartData = [
    {
      name: "Lebensversicherung",
      LV_Abschluss: liAcq,
      LV_Fondskosten: liFund,
      LV_DritteKategorie: liEff,
    },
    {
      name: "Direktanlage",
      Depot_Ausgabeaufschlag: depotInit || fallbackDepot.upfront.total,
      Depot_Fondskosten: safeDepotFund,
      Depot_Depotkosten: safeDepotDepot,
    },
  ];

  return (
    <Card className="border-0 shadow-lg bg-white">
      <style>{`
        .fv-bar-lv-acq path { fill: #2563eb !important; }
        .fv-bar-lv-fund path { fill: #16a34a !important; }
        .fv-bar-lv-third path { fill: #7c3aed !important; }

        .fv-bar-depot-init path { fill: #f97316 !important; }
        .fv-bar-depot-fund path { fill: #22c55e !important; }
        .fv-bar-depot-depot path { fill: #0ea5e9 !important; }

        .recharts-legend-item .recharts-surface { fill: currentColor; }
      `}</style>

      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
            <PieChart className="w-4 h-4 text-orange-600" />
          </div>
          Kosten im Detail
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="h-90 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                tickFormatter={formatChartAxis}
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
              />

              <Tooltip
                formatter={(value) => [formatCurrency(Number(value || 0)), ""]}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Legend />

              {/* LV */}
              <Bar
                className="fv-bar-lv-acq"
                dataKey="LV_Abschluss"
                name="LV Abschluss"
              />
              <Bar
                className="fv-bar-lv-fund"
                dataKey="LV_Fondskosten"
                name="LV Fondskosten"
              />
              <Bar
                className="fv-bar-lv-third"
                dataKey="LV_DritteKategorie"
                name={`LV ${lvThirdLabel}`}
              />

              {/* Depot */}
              <Bar
                className="fv-bar-depot-init"
                dataKey="Depot_Ausgabeaufschlag"
                name="Depot Ausgabeaufschlag"
              />
              <Bar
                className="fv-bar-depot-fund"
                dataKey="Depot_Fondskosten"
                name="Depot Fondskosten"
              />
              <Bar
                className="fv-bar-depot-depot"
                dataKey="Depot_Depotkosten"
                name="Depot Depotkosten"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">
              Lebensversicherung
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Abschluss:</span>
                <span className="font-medium">{formatCurrency(liAcq)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Fondskosten:</span>
                <span className="font-medium">{formatCurrency(liFund)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">{lvThirdLabel}:</span>
                <span className="font-medium">{formatCurrency(liEff)}</span>
              </div>
              <div className="flex justify-between border-t border-blue-300 pt-1">
                <span className="text-blue-800 font-medium">Gesamt:</span>
                <span className="font-bold">{formatCurrency(liTotal)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-xl border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">Direktanlage</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Ausgabeaufschlag:</span>
                <span className="font-medium">{formatCurrency(depotInit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Fondskosten:</span>
                <span className="font-medium">
                  {formatCurrency(safeDepotFund)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">Depotkosten:</span>
                <span className="font-medium">
                  {formatCurrency(safeDepotDepot)}
                </span>
              </div>
              <div className="flex justify-between border-t border-green-300 pt-1">
                <span className="text-green-800 font-medium">Gesamt:</span>
                <span className="font-bold">{formatCurrency(depotTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
