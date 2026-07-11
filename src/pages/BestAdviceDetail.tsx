import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BestAdviceCalculation, type BestAdviceModel, type LVResult } from "@/entities/BestAdviceCalculation";
import { UserDefaults } from "@/entities/UserDefaults";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, TrendingUp, Lock, Shield, FileDown } from "lucide-react";
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";

import { formatCurrency, formatChartAxis } from "@/components/shared/CurrencyDisplay";
import {
  calculateAgeAtPayout,
  calculateLifeInsuranceTax,
} from "@/components/shared/TaxCalculations";
import { simulateLv } from "@/lib/finance/simulation";
import { buildGuaranteedSeries } from "@/lib/finance/series";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type Mode = "gross" | "net";

function buildSeries(calc: BestAdviceModel, mode: Mode) {
  const years = Math.max(1, Math.round(calc.contract_duration_years || 1));
  const months = years * 12;
  const monthlyContrib = Number(calc.current_monthly_contribution || 0);
  const startCapital = Number(calc.current_capital || 0);
  const personalIncomeTaxRate =
    UserDefaults.load().lv_personal_income_tax_rate / 100;

  // Fonds-LV über die gemeinsame Engine
  const lv = simulateLv({
    months,
    annual_return_percent: Number(calc.assumed_annual_return || 0),
    monthly_contribution: monthlyContrib,
    initial_capital: startCapital,
    funds: [
      {
        allocation_eur: monthlyContrib,
        ongoing_costs_percent: Number(calc.lv_fund_ongoing_costs_percent || 0),
      },
    ],
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

  // Bestand: lineare Interpolation Kapital → garantiertes Endkapital
  const bestand = buildGuaranteedSeries({
    initial_capital: startCapital,
    monthly_contribution: monthlyContrib,
    guaranteed_end_capital: Number(calc.guaranteed_end_capital || 0),
    months,
  });

  const points: { year: number; age: number; fondsLV: number; bestand: number }[] = [];

  for (let m = 12; m <= months; m += 12) {
    const year = m / 12;
    const age = calculateAgeAtPayout(calc.birth_year, year);
    const lvPoint = lv.series[m - 1];
    const bestandPoint = bestand[m - 1];

    if (mode === "gross") {
      points.push({
        year,
        age,
        fondsLV: Math.round(lvPoint.capital),
        bestand: Math.round(bestandPoint.capital),
      });
    } else {
      const lvTax = calculateLifeInsuranceTax(
        lvPoint.capital - lvPoint.contributions_cum,
        year,
        age,
        { personalIncomeTaxRate }
      );

      // Bestands-LV ist ebenfalls eine Versicherung → Halbeinkünfte-Regel
      // (Vertragsbeginn ist im gespeicherten Datensatz nicht verfügbar,
      // daher Qualifikation über das Checkpoint-Jahr wie bei der Fonds-LV).
      let bestandNet = bestandPoint.capital;
      if (!calc.current_product_tax_free) {
        const bestandTax = calculateLifeInsuranceTax(
          bestandPoint.capital - bestandPoint.contributions_cum,
          year,
          age,
          { personalIncomeTaxRate }
        );
        bestandNet = bestandPoint.capital - bestandTax;
      }

      points.push({
        year,
        age,
        fondsLV: Math.round(lvPoint.capital - lvTax),
        bestand: Math.round(bestandNet),
      });
    }
  }

  return points;
}

export default function BestAdviceDetail() {
  const navigate = useNavigate();
  const [calculation, setCalculation] = useState<BestAdviceModel | null>(null);
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
    BestAdviceCalculation.get(id).then((calc) => {
      if (calc) setCalculation(calc);
      setIsLoading(false);
    });
  }, []);

  const series = useMemo(() => {
    if (!calculation) return [];
    return buildSeries(calculation, mode);
  }, [calculation, mode]);

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
  if (!r) return null;

  const fondsLVEnd = mode === "gross" ? r.life_insurance_gross : r.life_insurance_net;
  const bestandEnd = mode === "gross" ? r.depot_gross : r.depot_net;
  const difference = fondsLVEnd - bestandEnd;
  const fondsLVBetter = difference > 0;

  return (
    <>
    <div id="pdf-content" className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("BestAdviceCalculator"))} className="mb-4" data-pdf-hide>
          <ArrowLeft className="w-4 h-4 mr-2" />Zurück zur Eingabe
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{calculation.name}</h1>
              <p className="text-slate-600 mt-1">
                BestAdvice – {calculation.contract_duration_years} Jahre Restlaufzeit
              </p>
            </div>
          </div>
          <Button onClick={handlePDFClick} variant="outline" data-pdf-hide>
            <FileDown className="w-4 h-4 mr-2" />
            Als PDF exportieren
          </Button>
          {showPDFUpgrade && (
            <UpgradePrompt
              title="PDF-Export"
              description="Der PDF-Export ist ab dem Professional-Plan verfügbar."
              onClose={() => setShowPDFUpgrade(false)}
            />
          )}
        </div>

        {/* Empfehlung */}
        <div data-pdf-section="empfehlung">
        <Card className={`border-0 shadow-lg ${fondsLVBetter ? "bg-linear-to-r from-blue-50 to-blue-100" : "bg-linear-to-r from-amber-50 to-amber-100"}`}>
          <CardContent className="p-6 text-center">
            <div className={`text-2xl font-bold mb-2 ${fondsLVBetter ? "text-blue-700" : "text-amber-700"}`}>
              {fondsLVBetter ? "Empfehlung: Umschichten in Fonds-LV" : "Empfehlung: Bestandsvertrag behalten"}
            </div>
            <div className="text-lg text-slate-700">
              Unterschied ({mode === "gross" ? "Brutto" : "Netto"}):
              <span className={`font-bold ml-2 ${fondsLVBetter ? "text-blue-700" : "text-amber-700"}`}>
                {fondsLVBetter ? "+" : ""}{formatCurrency(difference)}
              </span>
              {" "}zugunsten {fondsLVBetter ? "der Fonds-LV" : "des Bestandsvertrags"}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Vergleich-Kacheln */}
        <div data-pdf-section="vergleich" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Lock className="w-5 h-5 text-amber-500" />
                Bestandsvertrag (garantiert)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-slate-500">Endkapital {mode === "gross" ? "brutto" : "netto"}</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(bestandEnd)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Steuerfrei</div>
                  <div className="font-medium">{calculation.current_product_tax_free ? "Ja" : "Nein"}</div>
                </div>
                <div>
                  <div className="text-slate-500">Steuern</div>
                  <div className="font-medium text-red-600">{formatCurrency(r.depot_tax)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <Shield className="w-5 h-5 text-blue-500" />
                Fonds-LV (Alternative)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-slate-500">Endkapital {mode === "gross" ? "brutto" : "netto"}</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(fondsLVEnd)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Gesamtkosten LV</div>
                  <div className="font-medium text-red-600">{formatCurrency(r.li_total_costs)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Steuern</div>
                  <div className="font-medium text-red-600">{formatCurrency(r.li_tax)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-LV-Aufschlüsselung (nur bei mehreren LVs) */}
        {r.lvs_results && r.lvs_results.length > 1 && (
          <div data-pdf-section="lv-aufschluesselung">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500" />
                Bestandsverträge einzeln
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 text-slate-600 font-medium">Vertrag</th>
                      <th className="text-right py-2 pr-4 text-slate-600 font-medium">Endkapital brutto</th>
                      <th className="text-right py-2 pr-4 text-slate-600 font-medium">Steuern</th>
                      <th className="text-right py-2 text-slate-600 font-medium">Endkapital netto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.lvs_results.map((lv: LVResult, i: number) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-4 font-medium text-slate-800">{lv.label}</td>
                        <td className="py-2 pr-4 text-right text-slate-700">{formatCurrency(lv.depot_gross)}</td>
                        <td className="py-2 pr-4 text-right text-red-600">{lv.depot_tax > 0 ? `− ${formatCurrency(lv.depot_tax)}` : "—"}</td>
                        <td className="py-2 text-right font-semibold text-slate-900">{formatCurrency(lv.depot_net)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td className="py-2 pr-4 font-bold text-slate-900">Summe</td>
                      <td className="py-2 pr-4 text-right font-bold text-slate-900">{formatCurrency(r.depot_gross)}</td>
                      <td className="py-2 pr-4 text-right font-bold text-red-600">{r.depot_tax > 0 ? `− ${formatCurrency(r.depot_tax)}` : "—"}</td>
                      <td className="py-2 text-right font-bold text-slate-900">{formatCurrency(r.depot_net)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>
        )}

        {/* Chart */}
        <div data-pdf-section="grafik">
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="w-9 h-9 bg-linear-to-r from-blue-500 to-amber-500 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                Verlauf (Fonds-LV vs. Bestandsvertrag)
              </CardTitle>
              <div className="flex gap-2">
                <Button variant={mode === "gross" ? "default" : "outline"}
                  className={mode === "gross" ? "bg-slate-800 hover:bg-slate-700" : ""}
                  onClick={() => setMode("gross")}>Brutto</Button>
                <Button variant={mode === "net" ? "default" : "outline"}
                  className={mode === "net" ? "bg-slate-800 hover:bg-slate-700" : ""}
                  onClick={() => setMode("net")}>Netto</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-90 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 20, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatChartAxis} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value || 0)),
                      name === "fondsLV" ? "Fonds-LV" : "Bestandsvertrag"
                    ]}
                    labelFormatter={(year: any) => {
                      const p = series.find((x) => x.year === Number(year));
                      return p ? `Jahr ${year} (Alter ${p.age})` : `Jahr ${year}`;
                    }}
                  />
                  <Legend formatter={(value) => value === "fondsLV" ? "Fonds-LV" : "Bestandsvertrag"} />
                  <Line type="monotone" dataKey="fondsLV" name="fondsLV" stroke="#2563eb" strokeWidth={3} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="bestand" name="bestand" stroke="#d97706" strokeWidth={3} dot={false} isAnimationActive={false} strokeDasharray="6 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Bestandsvertrag als lineare Projektion von Kapital → Endkapital. Fonds-LV: Monatsweise Simulation.
            </p>
          </CardContent>
        </Card>
        </div>

        {/* Kostendetails LV */}
        <div data-pdf-section="kosten">
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-slate-900">Kostendetails Fonds-LV</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="text-sm text-blue-700 font-medium">Abschlusskosten</div>
                <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.li_acquisition_costs)}</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="text-sm text-blue-700 font-medium">Verwaltung</div>
                <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.li_admin_costs)}</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="text-sm text-blue-700 font-medium">Fondskosten (TER)</div>
                <div className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(r.li_fund_costs)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        <Button variant="outline" onClick={() => navigate(createPageUrl("BestAdviceCalculator"))} data-pdf-hide>
          Neue Berechnung
        </Button>
      </div>
    </div>
    {dialogOpen && (
      <PDFSectionDialog
        sections={[
          { id: "empfehlung", label: "Empfehlung" },
          { id: "vergleich", label: "Vergleich (Bestand vs. Fonds-LV)" },
          { id: "lv-aufschluesselung", label: "LV-Aufschlüsselung" },
          { id: "grafik", label: "Verlaufsgrafik" },
          { id: "kosten", label: "Kostendetails" },
        ]}
        isExporting={isExporting}
        onExport={(ids) =>
          doExport(ids, `bestadvice-${calculation.name}`, "BestAdvice")
        }
        onClose={closeDialog}
      />
    )}
    </>
  );
}
