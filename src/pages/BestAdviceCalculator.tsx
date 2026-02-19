import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BestAdviceCalculation } from "@/entities/BestAdviceCalculation";
import { useSubscription } from "@/contexts/SubscriptionContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

import {
  Target, TrendingUp, AlertCircle, Shield, Percent,
  Calendar, User, FileText, Euro, Lock,
} from "lucide-react";

import {
  calculateAgeAtPayout,
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  calculateMonthlyReturn,
  calculateZillmerMonths,
} from "@/components/shared/TaxCalculations";

const DRAFT_KEY = "fv_bestadvice_draft_v1";

type FormData = {
  name: string;
  // Current product
  current_monthly_contribution: number;
  current_product_tax_free: boolean;
  contract_duration_years: number;
  current_capital: number;
  guaranteed_end_capital: number;
  // Fonds-LV
  birth_year: number;
  assumed_annual_return: number;
  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur: number;
  lv_effective_costs_percent: number;
  lv_fund_ongoing_costs_percent: number;
};

function makeDefaults(): FormData {
  return {
    name: `BestAdvice ${new Date().toLocaleDateString("de-DE")}`,
    current_monthly_contribution: 200,
    current_product_tax_free: false,
    contract_duration_years: 20,
    current_capital: 10000,
    guaranteed_end_capital: 80000,
    birth_year: 1985,
    assumed_annual_return: 5.0,
    lv_cost_type: "eur",
    life_insurance_acquisition_costs_eur: 2000,
    lv_admin_costs_monthly_eur: 6,
    lv_effective_costs_percent: 0.7,
    lv_fund_ongoing_costs_percent: 0.3,
  };
}

function toNum(v: any): number {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function loadDraft(): FormData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return { ...makeDefaults(), ...JSON.parse(raw) };
  } catch {
    return null;
  }
}
function saveDraft(data: FormData) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

function getCurrentAge(birthYear: number) {
  const y = new Date().getFullYear();
  if (!birthYear || birthYear < 1900 || birthYear > y) return 0;
  return y - birthYear;
}

export default function BestAdviceCalculator() {
  const navigate = useNavigate();
  const defaults = useMemo(() => makeDefaults(), []);
  const [formData, setFormData] = useState<FormData>(() => loadDraft() ?? defaults);
  const { incrementCalculationCount } = useSubscription();
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDraft(formData), 250);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [formData]);

  const update = (field: string, value: any) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const currentAge = getCurrentAge(toNum(formData.birth_year));
  const endAge = currentAge > 0 ? currentAge + toNum(formData.contract_duration_years) : 0;
  const totalContributions = toNum(formData.current_capital) +
    toNum(formData.current_monthly_contribution) * toNum(formData.contract_duration_years) * 12;

  const calculateResults = () => {
    const years = Math.max(1, toNum(formData.contract_duration_years));
    const months = years * 12;
    const monthly_return = calculateMonthlyReturn(toNum(formData.assumed_annual_return));
    const monthly_contrib = toNum(formData.current_monthly_contribution);
    const start_capital = toNum(formData.current_capital);
    const total_contributions = start_capital + monthly_contrib * months;

    // Fonds-LV: start with current_capital + redirect monthly contributions
    let li_capital = start_capital;
    let li_acquisition_costs = 0;
    let li_fund_costs = 0;
    let li_admin_costs = 0;

    if (formData.lv_cost_type === "eur") {
      const acq = toNum(formData.life_insurance_acquisition_costs_eur);
      const zillmer_months = calculateZillmerMonths(months);
      const monthly_zillmer = acq / Math.max(1, zillmer_months);
      li_acquisition_costs = acq;
      const adminMonthly = toNum(formData.lv_admin_costs_monthly_eur);

      for (let m = 1; m <= months; m++) {
        const contribAfter = m <= zillmer_months
          ? monthly_contrib - monthly_zillmer
          : monthly_contrib;
        const fundCost = li_capital * (toNum(formData.lv_fund_ongoing_costs_percent) / 100 / 12);
        li_fund_costs += fundCost;
        li_admin_costs += adminMonthly;
        li_capital = li_capital * (1 + monthly_return) + contribAfter - fundCost - adminMonthly;
      }
    } else {
      const effRate = toNum(formData.lv_effective_costs_percent) / 100 / 12;
      let totalContractCosts = 0;

      for (let m = 1; m <= months; m++) {
        const fundCost = li_capital * (toNum(formData.lv_fund_ongoing_costs_percent) / 100 / 12);
        const effCost = li_capital * effRate;
        li_fund_costs += fundCost;
        totalContractCosts += effCost;
        li_capital = li_capital * (1 + monthly_return) + monthly_contrib - fundCost - effCost;
      }

      const acqShare = years > 5 ? 0.7 : 0.6;
      li_acquisition_costs = totalContractCosts * acqShare;
      li_admin_costs = totalContractCosts * (1 - acqShare);
    }

    // LV tax
    const age_at_payout = calculateAgeAtPayout(toNum(formData.birth_year), years);
    const li_gains = li_capital - total_contributions;
    const li_tax = calculateLifeInsuranceTax(li_gains, years, age_at_payout);

    // Current (guaranteed) product
    const depot_gross = toNum(formData.guaranteed_end_capital);
    let depot_tax = 0;
    if (!formData.current_product_tax_free) {
      const depot_gains = depot_gross - total_contributions;
      depot_tax = calculateCapitalGainsTax(depot_gains);
    }

    return {
      total_contributions: Math.round(total_contributions),
      life_insurance_gross: Math.round(li_capital),
      life_insurance_net: Math.round(li_capital - li_tax),
      li_total_costs: Math.round(li_acquisition_costs + li_fund_costs + li_admin_costs),
      li_acquisition_costs: Math.round(li_acquisition_costs),
      li_fund_costs: Math.round(li_fund_costs),
      li_admin_costs: Math.round(li_admin_costs),
      li_tax: Math.round(li_tax),
      depot_gross: Math.round(depot_gross),
      depot_net: Math.round(depot_gross - depot_tax),
      depot_tax: Math.round(depot_tax),
    };
  };

  const handleCalculate = async () => {
    setError(null);
    setIsCalculating(true);
    try {
      const results = calculateResults();
      const newCalc = await BestAdviceCalculation.create({ ...formData, results });
      incrementCalculationCount();
      navigate(createPageUrl("BestAdviceDetail") + `?id=${newCalc.id}`);
    } catch (e) {
      console.error(e);
      setError("Ein Fehler ist beim Speichern der Berechnung aufgetreten.");
    }
    setIsCalculating(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">BestAdvice</h1>
              <p className="text-slate-600 mt-1">Bestandsvertrag vs. Umschichtung in Fonds-LV</p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid gap-8">
          {/* Grunddaten */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                Grunddaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Name der Berechnung</Label>
                  <Input value={formData.name} onChange={(e) => update("name", e.target.value)}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><User className="w-4 h-4" />Geburtsjahr</div>
                  </Label>
                  <Input type="number" value={formData.birth_year}
                    onChange={(e) => update("birth_year", parseInt(e.target.value || "0", 10))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                  {currentAge > 0 && <div className="text-xs text-slate-500">Aktuelles Alter (ca.): {currentAge}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Restlaufzeit (Jahre)</div>
                  </Label>
                  <Input type="number" value={formData.contract_duration_years}
                    onChange={(e) => update("contract_duration_years", parseInt(e.target.value || "0", 10))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                  {endAge > 0 && <div className="text-xs text-slate-500">Endalter: <span className="font-semibold text-slate-700">{endAge}</span></div>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-600 rounded-full" />
                      </div>
                      Angenommene Rendite Fonds-LV (%)
                    </div>
                  </Label>
                  <Input type="number" step="0.1" value={formData.assumed_annual_return}
                    onChange={(e) => update("assumed_annual_return", toNum(e.target.value))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bestandsvertrag */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                Bestandsvertrag (aktuell)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Aktuelle Sparrate (€/Monat)</div>
                  </Label>
                  <Input type="number" value={formData.current_monthly_contribution}
                    onChange={(e) => update("current_monthly_contribution", toNum(e.target.value))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Aktuelles Kapital / Rückkaufswert (€)</div>
                  </Label>
                  <Input type="number" value={formData.current_capital}
                    onChange={(e) => update("current_capital", toNum(e.target.value))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Lock className="w-4 h-4" />Garantiertes Endkapital (€)</div>
                </Label>
                <Input type="number" value={formData.guaranteed_end_capital}
                  onChange={(e) => update("guaranteed_end_capital", toNum(e.target.value))}
                  className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white md:w-1/2" />
                <p className="text-xs text-slate-500">
                  Garantierte Ablaufleistung laut aktuellem Vertrag.
                  Gesamte Einzahlungen (Kapital + Sparrate × Laufzeit): <strong>{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(totalContributions)}</strong>
                </p>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <Switch
                  checked={formData.current_product_tax_free}
                  onCheckedChange={(checked) => update("current_product_tax_free", checked)}
                />
                <div>
                  <Label className="text-sm font-medium text-slate-700">Steuerfrei</Label>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formData.current_product_tax_free
                      ? "Keine Abgeltungsteuer auf Gewinne (z.B. alter Vertrag vor 2005)."
                      : "Gewinne werden mit Abgeltungsteuer (25%) besteuert."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fonds-LV */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                Fonds-LV (Alternative)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  Das aktuelle Kapital wird in die Fonds-LV übertragen; die Sparrate fließt weiterhin monatlich ein.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <Label className="text-sm font-medium text-slate-700">Kostentyp</Label>
                  <div className="flex items-center gap-2">
                    <Label className={`text-sm ${formData.lv_cost_type === "eur" ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                      Tatsächliche Kosten (€)
                    </Label>
                    <Switch
                      checked={formData.lv_cost_type === "percent"}
                      onCheckedChange={(checked) => update("lv_cost_type", checked ? "percent" : "eur")}
                    />
                    <Label className={`text-sm ${formData.lv_cost_type === "percent" ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                      Effektivkosten (%)
                    </Label>
                  </div>
                </div>

                {formData.lv_cost_type === "eur" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Abschluss- und Vertriebskosten (€)</Label>
                      <Input type="number" value={formData.life_insurance_acquisition_costs_eur ?? ""}
                        onChange={(e) => update("life_insurance_acquisition_costs_eur", toNum(e.target.value))}
                        className="bg-white border-slate-300 focus:border-blue-500" />
                      <p className="text-xs text-slate-500">Wird gezillmert über die ersten 5 Jahre (max. 60 Monate).</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Verwaltungskosten (€ pro Monat)</Label>
                      <Input type="number" step="0.01" value={formData.lv_admin_costs_monthly_eur ?? ""}
                        onChange={(e) => update("lv_admin_costs_monthly_eur", toNum(e.target.value))}
                        className="bg-white border-slate-300 focus:border-blue-500 md:w-1/2" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Effektivkosten p.a. (%)</div>
                    </Label>
                    <Input type="number" step="0.01" value={formData.lv_effective_costs_percent ?? ""}
                      onChange={(e) => update("lv_effective_costs_percent", toNum(e.target.value))}
                      className="bg-white border-slate-300 focus:border-blue-500" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Laufende Kosten LV-Fonds p.a. (%)</div>
                </Label>
                <Input type="number" step="0.01" value={formData.lv_fund_ongoing_costs_percent ?? ""}
                  onChange={(e) => update("lv_fund_ongoing_costs_percent", toNum(e.target.value))}
                  className="bg-slate-50 border-slate-200 focus:border-blue-500 md:w-1/2" />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-700">
                  Bei Verträgen ≥12 Jahre und Auszahlung nach dem 62. Lebensjahr gilt das <strong>Teileinkünfteverfahren</strong>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-8 flex justify-center">
              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 text-lg font-medium rounded-xl flex items-center gap-3"
                size="md"
              >
                {isCalculating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Wird berechnet...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    Vergleich berechnen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
