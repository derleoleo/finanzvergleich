import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { SinglePaymentCalculation } from "@/entities/SinglePaymentCalculation";
import { UserDefaults } from "@/entities/UserDefaults";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

import {
  DollarSign, TrendingUp, AlertCircle, Shield, Percent,
  Calendar, User, FileText, AlertTriangle,
} from "lucide-react";
import { looksLikeName } from "@/utils/nameDetection";

import {
  calculateAgeAtPayout,
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  calculateMonthlyReturn,
} from "@/components/shared/TaxCalculations";

const DRAFT_KEY = "fv_singlepayment_draft_v1";

type FormData = {
  name: string;
  lump_sum: number;
  contract_duration_years: number;
  birth_year: number;
  assumed_annual_return: number;
  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur: number;
  lv_effective_costs_percent: number;
  lv_fund_ongoing_costs_percent: number;
  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;
  depot_costs_annual: number;
};

function makeDefaults(): FormData {
  const d = UserDefaults.load();
  return {
    name: `Einmalanlage ${new Date().toLocaleDateString("de-DE")}`,
    lump_sum: d.lump_sum,
    contract_duration_years: d.contract_duration_years,
    birth_year: d.birth_year,
    assumed_annual_return: d.assumed_annual_return,
    lv_cost_type: d.lv_cost_type,
    life_insurance_acquisition_costs_eur: d.life_insurance_acquisition_costs_eur,
    lv_admin_costs_monthly_eur: d.lv_admin_costs_monthly_eur,
    lv_effective_costs_percent: d.lv_effective_costs_percent,
    lv_fund_ongoing_costs_percent: d.lv_fund_ongoing_costs_percent,
    depot_fund_initial_charge_percent: d.depot_fund_initial_charge_percent,
    depot_fund_ongoing_costs_percent: d.depot_fund_ongoing_costs_percent,
    depot_costs_annual: d.depot_costs_annual,
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

export default function SinglePaymentCalculator() {
  const navigate = useNavigate();
  const defaults = useMemo(() => makeDefaults(), []);
  const [formData, setFormData] = useState<FormData>(() => loadDraft() ?? defaults);
  const { canCreateCalculation, incrementCalculationCount } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
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

  const calculateResults = () => {
    const years = Math.max(1, toNum(formData.contract_duration_years));
    const months = years * 12;
    const monthly_return = calculateMonthlyReturn(toNum(formData.assumed_annual_return));
    const ls = toNum(formData.lump_sum);

    // LV
    let li_capital = 0;
    let li_acquisition_costs = 0;
    let li_fund_costs = 0;
    let li_admin_costs = 0;

    if (formData.lv_cost_type === "eur") {
      const acq = toNum(formData.life_insurance_acquisition_costs_eur);
      li_acquisition_costs = acq;
      li_capital = ls - acq;
      const adminMonthly = toNum(formData.lv_admin_costs_monthly_eur);

      for (let m = 1; m <= months; m++) {
        const fundCost = li_capital * (toNum(formData.lv_fund_ongoing_costs_percent) / 100 / 12);
        li_fund_costs += fundCost;
        li_admin_costs += adminMonthly;
        li_capital = li_capital * (1 + monthly_return) - fundCost - adminMonthly;
      }
    } else {
      li_capital = ls;
      const effRate = toNum(formData.lv_effective_costs_percent) / 100 / 12;
      let totalContractCosts = 0;

      for (let m = 1; m <= months; m++) {
        const fundCost = li_capital * (toNum(formData.lv_fund_ongoing_costs_percent) / 100 / 12);
        const effCost = li_capital * effRate;
        li_fund_costs += fundCost;
        totalContractCosts += effCost;
        li_capital = li_capital * (1 + monthly_return) - fundCost - effCost;
      }

      const acqShare = years > 5 ? 0.7 : 0.6;
      li_acquisition_costs = totalContractCosts * acqShare;
      li_admin_costs = totalContractCosts * (1 - acqShare);
    }

    // Depot
    const initCharge = toNum(formData.depot_fund_initial_charge_percent) / 100;
    let depot_capital = ls * (1 - initCharge);
    const depot_initial_charges = ls * initCharge;
    let depot_fund_costs = 0;
    let depot_depot_costs = 0;

    for (let m = 1; m <= months; m++) {
      const depotCost = depot_capital * (toNum(formData.depot_costs_annual) / 100 / 12);
      const fundCost = depot_capital * (toNum(formData.depot_fund_ongoing_costs_percent) / 100 / 12);
      depot_depot_costs += depotCost;
      depot_fund_costs += fundCost;
      depot_capital = depot_capital * (1 + monthly_return) - depotCost - fundCost;
    }

    // Taxes
    const age_at_payout = calculateAgeAtPayout(toNum(formData.birth_year), years);
    const li_tax = calculateLifeInsuranceTax(li_capital - ls, years, age_at_payout, {
      personalIncomeTaxRate: UserDefaults.load().lv_personal_income_tax_rate / 100,
    });
    const depot_tax = calculateCapitalGainsTax(depot_capital - ls);

    return {
      lump_sum: Math.round(ls),
      total_contributions: Math.round(ls),
      life_insurance_gross: Math.round(li_capital),
      life_insurance_net: Math.round(li_capital - li_tax),
      depot_gross: Math.round(depot_capital),
      depot_net: Math.round(depot_capital - depot_tax),
      li_total_costs: Math.round(li_acquisition_costs + li_fund_costs + li_admin_costs),
      depot_total_costs: Math.round(depot_initial_charges + depot_fund_costs + depot_depot_costs),
      li_acquisition_costs: Math.round(li_acquisition_costs),
      li_fund_costs: Math.round(li_fund_costs),
      li_admin_costs: Math.round(li_admin_costs),
      depot_initial_charges: Math.round(depot_initial_charges),
      depot_fund_costs: Math.round(depot_fund_costs),
      depot_depot_costs: Math.round(depot_depot_costs),
      li_tax: Math.round(li_tax),
      depot_tax: Math.round(depot_tax),
    };
  };

  const handleCalculate = async () => {
    if (!canCreateCalculation) {
      setShowUpgradePrompt(true);
      return;
    }
    setError(null);
    setIsCalculating(true);
    try {
      const results = calculateResults();
      const newCalc = await SinglePaymentCalculation.create({ ...formData, results });
      incrementCalculationCount();
      navigate(createPageUrl("SinglePaymentDetail") + `?id=${newCalc.id}`);
    } catch (e) {
      console.error(e);
      setError("Ein Fehler ist beim Speichern der Berechnung aufgetreten.");
    }
    setIsCalculating(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      {showUpgradePrompt && (
        <UpgradePrompt
          title="Limit erreicht"
          description="Sie haben das Limit von 3 kostenlosen Berechnungen erreicht. Upgraden Sie, um unbegrenzt zu rechnen."
          onClose={() => setShowUpgradePrompt(false)}
        />
      )}
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Fonds-Einmalanlage</h1>
              <p className="text-slate-600 mt-1">Einmalbetrag – LV vs. Direktanlage vergleichen</p>
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
                    placeholder="Bitte keine Klarnamen"
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                  {looksLikeName(formData.name) && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Möglicher Klarname erkannt – bitte Pseudonym verwenden
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><User className="w-4 h-4" />Geburtsjahr</div>
                  </Label>
                  <Input type="number" value={formData.birth_year}
                    onChange={(e) => update("birth_year", parseInt(e.target.value || "0", 10))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                  <div className="text-xs text-slate-500">
                    {currentAge > 0 ? `Aktuelles Alter (ca.): ${currentAge}` : ""}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" />Einmalbetrag (€)</div>
                  </Label>
                  <Input type="number" value={formData.lump_sum}
                    onChange={(e) => update("lump_sum", toNum(e.target.value))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Laufzeit (Jahre)</div>
                  </Label>
                  <Input type="number" value={formData.contract_duration_years}
                    onChange={(e) => update("contract_duration_years", parseInt(e.target.value || "0", 10))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                  {endAge > 0 && (
                    <div className="text-xs text-slate-500">Endalter: <span className="font-semibold text-slate-700">{endAge}</span></div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Angenommene jährliche Rendite (%)</Label>
                <Input type="number" step="0.1" value={formData.assumed_annual_return}
                  onChange={(e) => update("assumed_annual_return", toNum(e.target.value))}
                  className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white md:w-1/2" />
              </div>
            </CardContent>
          </Card>

          {/* LV */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                Lebens-/Rentenversicherung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                      <p className="text-xs text-slate-500">Wird einmalig vom Einmalbetrag abgezogen.</p>
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

          {/* Depot */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                Direktanlage (Depot)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Ausgabeaufschlag (%)</div>
                  </Label>
                  <Input type="number" step="0.01" value={formData.depot_fund_initial_charge_percent ?? ""}
                    onChange={(e) => update("depot_fund_initial_charge_percent", toNum(e.target.value))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500" />
                  <p className="text-xs text-slate-500">Einmalig vom Einmalbetrag abgezogen.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Fondskosten p.a. (TER, %)</div>
                  </Label>
                  <Input type="number" step="0.01" value={formData.depot_fund_ongoing_costs_percent ?? ""}
                    onChange={(e) => update("depot_fund_ongoing_costs_percent", toNum(e.target.value))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Depotkosten p.a. (%)</div>
                  </Label>
                  <Input type="number" step="0.01" value={formData.depot_costs_annual ?? ""}
                    onChange={(e) => update("depot_costs_annual", toNum(e.target.value))}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  Gewinne werden mit der <strong>Abgeltungsteuer</strong> (25%) besteuert.
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
