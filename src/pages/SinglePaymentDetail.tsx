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
  calculateAgeAtPayout,
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  calculateMonthlyReturn,
} from "@/components/shared/TaxCalculations";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

function buildSeries(calc: SinglePaymentModel, mode: Mode) {
  const years = Math.max(1, Math.round(calc.contract_duration_years || 1));
  const months = years * 12;
  const monthlyReturn = calculateMonthlyReturn(Number(calc.assumed_annual_return || 0));
  const ls = Number(calc.lump_sum || 0);

  const lvFundMonthlyRate = Number(calc.lv_fund_ongoing_costs_percent || 0) / 100 / 12;
  const lvEffectiveMonthlyRate = Number(calc.lv_effective_costs_percent || 0) / 100 / 12;

  let lvCapital = calc.lv_cost_type === "eur"
    ? ls - Number(calc.life_insurance_acquisition_costs_eur || 0)
    : ls;
  const adminMonthly = Number(calc.lv_admin_costs_monthly_eur || 0);

  const initCharge = Number(calc.depot_fund_initial_charge_percent || 0) / 100;
  let depotCapital = ls * (1 - initCharge);
  const depotFundMonthlyRate = Number(calc.depot_fund_ongoing_costs_percent || 0) / 100 / 12;
  const depotDepotMonthlyRate = Number(calc.depot_costs_annual || 0) / 100 / 12;

  const points: { year: number; age: number; lv: number; depot: number }[] = [];

  for (let m = 1; m <= months; m++) {
    // LV
    const lvFundCost = lvCapital * lvFundMonthlyRate;
    if ((calc.lv_cost_type ?? "eur") === "eur") {
      lvCapital = lvCapital * (1 + monthlyReturn) - lvFundCost - adminMonthly;
    } else {
      const effCost = lvCapital * lvEffectiveMonthlyRate;
      lvCapital = lvCapital * (1 + monthlyReturn) - lvFundCost - effCost;
    }

    // Depot
    const depotFundCost = depotCapital * depotFundMonthlyRate;
    const depotCost = depotCapital * depotDepotMonthlyRate;
    depotCapital = depotCapital * (1 + monthlyReturn) - depotFundCost - depotCost;

    if (m % 12 === 0) {
      const year = m / 12;
      const age = calculateAgeAtPayout(calc.birth_year, year);

      if (mode === "gross") {
        points.push({ year, age, lv: Math.round(lvCapital), depot: Math.round(depotCapital) });
      } else {
        const lvGains = lvCapital - ls;
        const depotGains = depotCapital - ls;
        const lvTax = calculateLifeInsuranceTax(lvGains, year, age, {
          personalIncomeTaxRate: UserDefaults.load().lv_personal_income_tax_rate / 100,
        });
        const depotTax = calculateCapitalGainsTax(depotGains);
        points.push({
          year, age,
          lv: Math.round(lvCapital - lvTax),
          depot: Math.round(depotCapital - depotTax),
        });
      }
    }
  }

  return points;
}

function SinglePaymentChart({
  calculation, mode, onModeChange,
}: {
  calculation: SinglePaymentModel;
  mode: Mode;
  onModeChange: (m: Mode) => void;
}) {
  const series = useMemo(() => buildSeries(calculation, mode), [calculation, mode]);

  const end = useMemo(() => {
    const r = calculation.results;
    if (!r) return { lv: 0, depot: 0 };
    return mode === "gross"
      ? { lv: r.life_insurance_gross, depot: r.depot_gross }
      : { lv: r.life_insurance_net, depot: r.depot_net };
  }, [calculation.results, mode]);

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
          <div className="flex gap-2">
            <Button variant={mode === "gross" ? "default" : "outline"}
              className={mode === "gross" ? "bg-slate-800 hover:bg-slate-700" : ""}
              onClick={() => onModeChange("gross")}>Brutto</Button>
            <Button variant={mode === "net" ? "default" : "outline"}
              className={mode === "net" ? "bg-slate-800 hover:bg-slate-700" : ""}
              onClick={() => onModeChange("net")}>Netto</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">LV Endwert ({mode === "gross" ? "Brutto" : "Netto"})</div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(end.lv)}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Depot Endwert ({mode === "gross" ? "Brutto" : "Netto"})</div>
            <div className="text-xl font-bold text-slate-900">{formatCurrency(end.depot)}</div>
          </div>
        </div>
        <div className="h-90 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 10, right: 20, left: 10, bottom: 8 }}>
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
              <Line type="monotone" dataKey="lv" name="LV" stroke="#2563eb" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="depot" name="Depot" stroke="#16a34a" strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
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
