import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calculation } from "@/entities/Calculation";
import { UserDefaults } from "@/entities/UserDefaults";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";
import { Button } from "@/components/ui/button";

import { ArrowLeft, Calculator as CalcIcon, Save, FileDown } from "lucide-react";
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";

import BasicInputs from "@/components/calculator/BasicInputs";
import InsuranceInputs from "@/components/calculator/InsuranceInputs";
import FundInputs from "@/components/calculator/FundInputs";

import ResultsSummary, { Mode } from "@/components/results/ResultsSummary";
import ResultsChart from "@/pages/Results";
import ComparisonTable from "@/components/results/ComparisonTable";

import {
  calculateAgeAtPayout,
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  calculateMonthlyReturn,
  calculateZillmerMonths,
} from "@/components/shared/TaxCalculations";

export default function CalculatorDetail() {
  const navigate = useNavigate();
  const [calculation, setCalculation] = useState<any | null>(null);
  const [formData, setFormData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // ✅ EIN Toggle-State für Kacheln + Graph
  const [mode, setMode] = useState<Mode>("gross");
  const { isPaid } = useSubscription();
  const [showPDFUpgrade, setShowPDFUpgrade] = useState(false);
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  const handlePDFClick = () => {
    if (!isPaid) { setShowPDFUpgrade(true); return; }
    openDialog();
  };

  useEffect(() => {
    const loadCalculation = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get("id");
      if (!id) {
        setIsLoading(false);
        return;
      }

      const allCalcs = await Calculation.list();
      const calc = (allCalcs as any[]).find((c) => String(c.id) === String(id));

      if (calc) {
        setCalculation(calc);
        setFormData({ ...calc });
      }

      setIsLoading(false);
    };

    loadCalculation();
  }, []);

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const calculateResults = () => {
    const {
      monthly_contribution,
      contract_duration_years,
      lv_cost_type,
      life_insurance_acquisition_costs_eur,
      lv_effective_costs_percent,
      lv_fund_ongoing_costs_percent,
      depot_fund_initial_charge_percent,
      depot_fund_ongoing_costs_percent,
      depot_costs_annual,
      assumed_annual_return,
      birth_year,
    } = formData;

    const months = contract_duration_years * 12;
    const total_contributions = monthly_contribution * months;
    const monthly_return = calculateMonthlyReturn(assumed_annual_return);

    // LV
    let li_capital = 0;

    let li_acquisition_costs = 0;
    let li_fund_costs = 0;
    let li_effective_costs = 0;

    if (lv_cost_type === "eur") {
      const zillmer_months = calculateZillmerMonths(months);
      const monthly_zillmer =
        life_insurance_acquisition_costs_eur / Math.max(1, zillmer_months);
      li_acquisition_costs = life_insurance_acquisition_costs_eur;

      for (let month = 1; month <= months; month++) {
        const contribAfter =
          month <= zillmer_months
            ? monthly_contribution - monthly_zillmer
            : monthly_contribution;
        const fundCost =
          li_capital * (lv_fund_ongoing_costs_percent / 100 / 12);
        li_fund_costs += fundCost;
        li_capital =
          li_capital * (1 + monthly_return) + contribAfter - fundCost;
      }
    } else {
      const effRate = lv_effective_costs_percent / 100 / 12;
      for (let month = 1; month <= months; month++) {
        const fundCost =
          li_capital * (lv_fund_ongoing_costs_percent / 100 / 12);
        const effCost = li_capital * effRate;
        li_fund_costs += fundCost;
        li_effective_costs += effCost;
        li_capital =
          li_capital * (1 + monthly_return) +
          monthly_contribution -
          fundCost -
          effCost;
      }
    }

    const li_total_costs =
      li_acquisition_costs + li_fund_costs + li_effective_costs;

    // Depot
    let depot_capital = 0;

    let depot_initial_charges = 0;
    let depot_fund_costs = 0;
    let depot_depot_costs = 0;

    const initialChargeFactor = 1 - depot_fund_initial_charge_percent / 100;

    for (let month = 1; month <= months; month++) {
      const initCost =
        monthly_contribution * (depot_fund_initial_charge_percent / 100);
      depot_initial_charges += initCost;

      const contribAfterInit = monthly_contribution * initialChargeFactor;

      const depotCost = depot_capital * (depot_costs_annual / 100 / 12);
      depot_depot_costs += depotCost;

      const fundCost =
        depot_capital * (depot_fund_ongoing_costs_percent / 100 / 12);
      depot_fund_costs += fundCost;

      depot_capital =
        depot_capital * (1 + monthly_return) +
        contribAfterInit -
        depotCost -
        fundCost;
    }

    const depot_total_costs =
      depot_initial_charges + depot_fund_costs + depot_depot_costs;

    // Taxes
    const age_at_payout = calculateAgeAtPayout(
      birth_year,
      contract_duration_years
    );

    const li_gains = li_capital - total_contributions;
    const li_tax = calculateLifeInsuranceTax(
      li_gains,
      contract_duration_years,
      age_at_payout,
      { personalIncomeTaxRate: UserDefaults.load().lv_personal_income_tax_rate / 100 }
    );

    const depot_gains = depot_capital - total_contributions;
    const depot_tax = calculateCapitalGainsTax(depot_gains);

    const li_net = li_capital - li_tax;
    const depot_net = depot_capital - depot_tax;

    return {
      total_contributions: Math.round(total_contributions),

      life_insurance_gross: Math.round(li_capital),
      life_insurance_net: Math.round(li_net),

      depot_gross: Math.round(depot_capital),
      depot_net: Math.round(depot_net),

      li_total_costs: Math.round(li_total_costs),
      depot_total_costs: Math.round(depot_total_costs),

      li_acquisition_costs: Math.round(li_acquisition_costs),
      li_fund_costs: Math.round(li_fund_costs),
      li_effective_costs: Math.round(li_effective_costs),

      depot_initial_charges: Math.round(depot_initial_charges),
      depot_fund_costs: Math.round(depot_fund_costs),
      depot_depot_costs: Math.round(depot_depot_costs),

      li_tax: Math.round(li_tax),
      depot_tax: Math.round(depot_tax),
    };
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    const results = calculateResults();
    const updatedData = { ...formData, results };
    await Calculation.update(calculation.id, updatedData);
    setCalculation(updatedData);
    setFormData(updatedData);
    setIsRecalculating(false);
  };

  if (isLoading || !calculation || !formData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div id="pdf-content" className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Calculator") + "?resume=1")}
          className="mb-4"
          data-pdf-hide
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück zur Eingabe
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
              <CalcIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                {calculation.name}
              </h1>
              <p className="text-slate-600 mt-1">
                Sparvertrag – Ergebnisse & Eingaben
              </p>
            </div>
          </div>
          {calculation.results && (
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

        {/* ✅ Ergebnisse: Kacheln + Graph synchron (Brutto/Netto) */}
        {calculation.results && (
          <>
            <div data-pdf-section="ergebnis">
              <ResultsSummary results={calculation.results} mode={mode} onModeChange={setMode} />
            </div>

            <div data-pdf-section="grafik">
              <ResultsChart
                calculation={calculation}
                mode={mode}
              />
            </div>

            <div data-pdf-section="vergleich">
              <ComparisonTable calculation={calculation} />
            </div>

            {/* Kosten im Detail – standardmäßig ausgeblendet, optional im PDF */}
            <div data-pdf-section="kosten" style={{ display: "none" }}>
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-slate-900">Kosten im Detail</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="p-6">
                      <div className="text-xs text-slate-500 mb-1">Gesamtkosten LV</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(Number(calculation.results?.li_total_costs ?? 0))}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Abschluss {formatCurrency(Number(calculation.results?.li_acquisition_costs ?? 0))} ·{" "}
                        Verwaltung {formatCurrency(Number(calculation.results?.li_effective_costs ?? 0))} ·{" "}
                        Fonds {formatCurrency(Number(calculation.results?.li_fund_costs ?? 0))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-lg bg-white">
                    <CardContent className="p-6">
                      <div className="text-xs text-slate-500 mb-1">Gesamtkosten Depot</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(Number(calculation.results?.depot_total_costs ?? 0))}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        Ausgabeaufschlag {formatCurrency(Number(calculation.results?.depot_initial_charges ?? 0))} ·{" "}
                        Depot {formatCurrency(Number(calculation.results?.depot_depot_costs ?? 0))} ·{" "}
                        Fonds {formatCurrency(Number(calculation.results?.depot_fund_costs ?? 0))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card className="border-0 shadow-lg bg-white">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-slate-900">Aufschlüsselung</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="font-semibold text-slate-700">Kategorie</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">LV</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Depot</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="border-slate-100">
                          <TableCell className="text-slate-900 font-medium">Abschluss / Ausgabeaufschlag</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(calculation.results?.li_acquisition_costs ?? 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(calculation.results?.depot_initial_charges ?? 0))}</TableCell>
                        </TableRow>
                        <TableRow className="border-slate-100">
                          <TableCell className="text-slate-900 font-medium">Verwaltung / Depotkosten</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(calculation.results?.li_effective_costs ?? 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(calculation.results?.depot_depot_costs ?? 0))}</TableCell>
                        </TableRow>
                        <TableRow className="border-slate-100">
                          <TableCell className="text-slate-900 font-medium">Fondskosten</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(calculation.results?.li_fund_costs ?? 0))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(calculation.results?.depot_fund_costs ?? 0))}</TableCell>
                        </TableRow>
                        <TableRow className="border-slate-200 bg-slate-50">
                          <TableCell className="text-slate-900 font-bold">Gesamt</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(Number(calculation.results?.li_total_costs ?? 0))}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(Number(calculation.results?.depot_total_costs ?? 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3" data-pdf-hide>
              <Button
                variant="outline"
                onClick={() =>
                  navigate(
                    createPageUrl("CalculatorCostsDetail") +
                      `?id=${calculation.id}`
                  )
                }
              >
                Kosten im Detail
              </Button>

              <Button
                className="bg-slate-800 hover:bg-slate-700 text-white"
                onClick={() =>
                  navigate(createPageUrl("Calculator") + "?resume=1")
                }
              >
                Zurück zum Rechner (letzte Eingaben)
              </Button>
            </div>
          </>
        )}

        {/* Eingaben unten (optional, bleibt wie bei dir) */}
        <div data-pdf-section="eingaben" className="grid gap-8">
          <BasicInputs formData={formData} updateFormData={updateFormData} />
          <InsuranceInputs
            formData={formData}
            updateFormData={updateFormData}
            fetchLVFundCosts={() => {}}
            isFetchingLV={false}
          />
          <FundInputs
            formData={formData}
            updateFormData={updateFormData}
            fetchDepotFundCosts={() => {}}
            isFetchingDepot={false}
          />
        </div>

        <Card className="border-0 shadow-lg bg-white" data-pdf-hide>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <Button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 text-lg font-medium rounded-xl"
                size="md"
              >
                {isRecalculating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Wird berechnet...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Neu berechnen & speichern
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    {dialogOpen && (
      <PDFSectionDialog
        sections={[
          { id: "ergebnis", label: "Ergebnisse (Brutto/Netto)" },
          { id: "grafik", label: "Verlaufsgrafik" },
          { id: "vergleich", label: "Vergleichstabelle" },
          { id: "kosten", label: "Kosten im Detail", defaultChecked: false },
          { id: "eingaben", label: "Eingaben", defaultChecked: false },
        ]}
        isExporting={isExporting}
        onExport={(ids) =>
          doExport(ids, `sparvertrag-${calculation.name}`, "Fonds-Sparvertrag")
        }
        onClose={closeDialog}
      />
    )}
    </>
  );
}
