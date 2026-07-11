import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { SinglePaymentCalculation, type SinglePaymentModel } from "@/entities/SinglePaymentCalculation";
import { UserDefaults } from "@/entities/UserDefaults";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, TrendingUp, FileDown } from "lucide-react";
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";

import ResultsSummary, { type Mode } from "@/components/results/ResultsSummary";
import ComparisonTable from "@/components/results/ComparisonTable";
import { formatCurrency, formatChartAxis } from "@/components/shared/CurrencyDisplay";
import {
  simulateDepot,
  simulateLv,
  type FundAllocation,
} from "@/lib/finance/simulation";
import { buildYearlySeries } from "@/lib/finance/series";
import {
  depotTaxOptionsFromDefaults,
  lvTaxOptionsFromDefaults,
} from "@/entities/UserDefaults";

import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// Renditeabweichung der pessimistisch/optimistisch-Szenarien in %-Punkten
const SCENARIO_DELTA = 2;

function buildSeries(calc: SinglePaymentModel, mode: Mode, annualReturnOverride?: number) {
  const years = Math.max(1, Math.round(calc.contract_duration_years || 1));
  const months = years * 12;
  const ls = Number(calc.lump_sum || 0);
  const d = UserDefaults.load();
  const annualReturn = annualReturnOverride ?? Number(calc.assumed_annual_return || 0);

  // Multi-Fonds mit Fallback auf Legacy-Einzelfonds-Felder älterer Datensätze
  const lvFunds: FundAllocation[] =
    Array.isArray(calc.lv_funds) && calc.lv_funds.length > 0
      ? calc.lv_funds
      : [{ allocation_eur: ls, ongoing_costs_percent: Number(calc.lv_fund_ongoing_costs_percent || 0) }];
  const depotFunds: FundAllocation[] =
    Array.isArray(calc.depot_funds) && calc.depot_funds.length > 0
      ? calc.depot_funds
      : [{
          allocation_eur: ls,
          ongoing_costs_percent: Number(calc.depot_fund_ongoing_costs_percent || 0),
          initial_charge_percent: Number(calc.depot_fund_initial_charge_percent || 0),
        }];

  const lv = simulateLv({
    months,
    annual_return_percent: annualReturn,
    initial_capital: ls,
    funds: lvFunds,
    cost:
      (calc.lv_cost_type ?? "eur") === "eur"
        ? {
            type: "eur",
            acquisition_costs_eur: Number(calc.life_insurance_acquisition_costs_eur || 0),
            admin_costs_monthly_eur: Number(calc.lv_admin_costs_monthly_eur || 0),
          }
        : {
            type: "percent",
            effective_costs_percent: Number(calc.lv_effective_costs_percent || 0),
          },
  });
  const depot = simulateDepot({
    months,
    annual_return_percent: annualReturn,
    initial_capital: ls,
    funds: depotFunds,
    depot_costs_annual_percent: Number(calc.depot_costs_annual || 0),
  });

  return buildYearlySeries({
    lv: lv.series,
    depot: depot.series,
    mode,
    birth_year: calc.birth_year,
    lvTaxOptions: lvTaxOptionsFromDefaults(d),
    depotTaxOptions: depotTaxOptionsFromDefaults(d),
  });
}

function SinglePaymentChart({
  calculation, mode, onModeChange,
}: {
  calculation: SinglePaymentModel;
  mode: Mode;
  onModeChange: (m: Mode) => void;
}) {
  const [showReal, setShowReal] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const inflationPercent = Number(UserDefaults.load().inflation_percent) || 0;

  const series = useMemo(() => {
    const main = buildSeries(calculation, mode);
    const baseReturn = Number(calculation.assumed_annual_return || 0);
    const low = showScenarios
      ? buildSeries(calculation, mode, baseReturn - SCENARIO_DELTA)
      : null;
    const high = showScenarios
      ? buildSeries(calculation, mode, baseReturn + SCENARIO_DELTA)
      : null;

    const inflationRate = inflationPercent / 100;
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
            depotBand: [deflate(low[i].depot, p.year), deflate(high[i].depot, p.year)],
          }
        : {}),
    }));
  }, [calculation, mode, showReal, showScenarios, inflationPercent]);

  const end = useMemo(() => {
    const r = calculation.results;
    if (!r) return { lv: 0, depot: 0 };
    const nominal =
      mode === "gross"
        ? { lv: r.life_insurance_gross, depot: r.depot_gross }
        : { lv: r.life_insurance_net, depot: r.depot_net };
    if (!showReal) return nominal;
    const years = Math.max(1, Math.round(calculation.contract_duration_years || 1));
    const factor = Math.pow(1 + inflationPercent / 100, years);
    return {
      lv: Math.round(nominal.lv / factor),
      depot: Math.round(nominal.depot / factor),
    };
  }, [calculation, mode, showReal, inflationPercent]);

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
            <Button variant={mode === "gross" ? "default" : "outline"}
              className={mode === "gross" ? "bg-slate-800 hover:bg-slate-700" : ""}
              onClick={() => onModeChange("gross")}>Brutto</Button>
            <Button variant={mode === "net" ? "default" : "outline"}
              className={mode === "net" ? "bg-slate-800 hover:bg-slate-700" : ""}
              onClick={() => onModeChange("net")}>Netto</Button>
            <Button variant={showReal ? "default" : "outline"}
              className={showReal ? "bg-slate-800 hover:bg-slate-700" : ""}
              title={`Kaufkraftbereinigt mit ${inflationPercent.toLocaleString("de-DE")} % Inflation p.a. (Voreinstellungen)`}
              onClick={() => setShowReal((v) => !v)}>Real</Button>
            <Button variant={showScenarios ? "default" : "outline"}
              className={showScenarios ? "bg-slate-800 hover:bg-slate-700" : ""}
              title={`Bandbreite bei Rendite ±${SCENARIO_DELTA} %-Punkte`}
              onClick={() => setShowScenarios((v) => !v)}>Szenarien</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">LV Endwert ({mode === "gross" ? "Brutto" : "Netto"}{showReal ? ", real" : ""})</div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(end.lv)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Depot Endwert ({mode === "gross" ? "Brutto" : "Netto"}{showReal ? ", real" : ""})</div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(end.depot)}</div>
          </div>
        </div>
        <div className="h-90 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 10, right: 20, left: 10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatChartAxis} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any, name: any) => [formatCurrency(Number(value || 0)), name === "lv" ? "LV" : "Depot"]}
                labelFormatter={(year: any) => {
                  const p = series.find((x) => x.year === Number(year));
                  return p ? `Jahr ${year} (Alter ${p.age})` : `Jahr ${year}`;
                }}
              />
              <Legend />
              {showScenarios && (
                <>
                  <Area dataKey="lvBand" stroke="none" fill="#2563eb" fillOpacity={0.12}
                    legendType="none" tooltipType="none" isAnimationActive={false} />
                  <Area dataKey="depotBand" stroke="none" fill="#16a34a" fillOpacity={0.12}
                    legendType="none" tooltipType="none" isAnimationActive={false} />
                </>
              )}
              <Line type="monotone" dataKey="lv" name="LV" stroke="#2563eb" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="depot" name="Depot" stroke="#16a34a" strokeWidth={3} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SinglePaymentDetail() {
  const navigate = useNavigate();
  const [calculation, setCalculation] = useState<SinglePaymentModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("gross");
  const { isPaid } = useSubscription();
  const [showPDFUpgrade, setShowPDFUpgrade] = useState(false);
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  const handlePDFClick = () => {
    if (!isPaid) { setShowPDFUpgrade(true); return; }
    openDialog();
  };

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setIsLoading(false); return; }

    SinglePaymentCalculation.get(id).then((calc) => {
      if (calc) setCalculation(calc);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!calculation) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="text-slate-600">Berechnung nicht gefunden.</div>
      </div>
    );
  }

  const r = calculation.results;

  // Map results to format expected by reusable components
  const summaryResults = r ? {
    total_contributions: r.total_contributions,
    life_insurance_gross: r.life_insurance_gross,
    life_insurance_net: r.life_insurance_net,
    depot_gross: r.depot_gross,
    depot_net: r.depot_net,
  } : null;

  return (
    <>
    <div id="pdf-content" className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("SinglePaymentCalculator"))} className="mb-4" data-pdf-hide>
          <ArrowLeft className="w-4 h-4 mr-2" />Zurück zur Eingabe
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{calculation.name}</h1>
              <p className="text-slate-600 mt-1">
                Einmalanlage – Einmalbetrag {formatCurrency(calculation.lump_sum)} · {calculation.contract_duration_years} Jahre
              </p>
            </div>
          </div>
          {summaryResults && (
            <Button onClick={handlePDFClick} variant="outline" data-pdf-hide>
              <FileDown className="w-4 h-4 mr-2" />
              Als PDF exportieren
            </Button>
          )}
          {showPDFUpgrade && (
            <UpgradePrompt
              title="PDF-Export"
              description="Der PDF-Export ist ab dem Professional-Plan verfügbar."
              onClose={() => setShowPDFUpgrade(false)}
            />
          )}
        </div>

        {summaryResults && (
          <>
            <div data-pdf-section="ergebnis">
              <ResultsSummary results={summaryResults} mode={mode} />
            </div>

            <div data-pdf-section="grafik">
              <SinglePaymentChart calculation={calculation} mode={mode} onModeChange={setMode} />
            </div>

            <div data-pdf-section="vergleich">
              <ComparisonTable calculation={calculation} />
            </div>

            {r && (
              <div data-pdf-section="kosten">
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-slate-900">Kostenübersicht</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <div className="text-sm text-blue-700 font-medium">LV Abschlusskosten</div>
                        <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.li_acquisition_costs)}</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <div className="text-sm text-blue-700 font-medium">LV Verwaltung</div>
                        <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.li_admin_costs)}</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <div className="text-sm text-blue-700 font-medium">LV Fondskosten</div>
                        <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.li_fund_costs)}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl">
                        <div className="text-sm text-green-700 font-medium">Depot Ausgabeaufschlag</div>
                        <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.depot_initial_charges)}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl">
                        <div className="text-sm text-green-700 font-medium">Depot Fondskosten</div>
                        <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.depot_fund_costs)}</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl">
                        <div className="text-sm text-green-700 font-medium">Depotgebühren</div>
                        <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.depot_depot_costs)}</div>
                      </div>
                    </div>
                    {r.li_riy_percent != null && r.depot_riy_percent != null && (
                      <p className="text-sm text-slate-600 mt-4">
                        Effektivkosten (Renditeminderung durch Kosten): LV{" "}
                        <span className="font-semibold">
                          {Number(r.li_riy_percent).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %-Pkt. p.a.
                        </span>{" "}
                        · Depot{" "}
                        <span className="font-semibold">
                          {Number(r.depot_riy_percent).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %-Pkt. p.a.
                        </span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("SinglePaymentCalculator"))}
              data-pdf-hide
            >
              Neue Berechnung
            </Button>
          </>
        )}
      </div>
    </div>
    {dialogOpen && (
      <PDFSectionDialog
        sections={[
          { id: "ergebnis", label: "Ergebnisse (Brutto/Netto)" },
          { id: "grafik", label: "Verlaufsgrafik" },
          { id: "vergleich", label: "Vergleichstabelle" },
          { id: "kosten", label: "Kostenübersicht" },
        ]}
        isExporting={isExporting}
        onExport={(ids) =>
          doExport(ids, `einmalanlage-${calculation.name}`, "Fonds-Einmalanlage")
        }
        onClose={closeDialog}
      />
    )}
    </>
  );
}
