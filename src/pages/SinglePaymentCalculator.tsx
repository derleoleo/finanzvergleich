import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl, toNum } from "@/utils";
import { SinglePaymentCalculation } from "@/entities/SinglePaymentCalculation";
import { UserDefaults } from "@/entities/UserDefaults";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

import {
  DollarSign, TrendingUp, AlertCircle, Shield, Percent,
  Calendar, User, FileText, AlertTriangle,
} from "lucide-react";
import { looksLikeName } from "@/utils/nameDetection";
import MultiFundEditor, { type FundEntry } from "@/components/calculator/MultiFundEditor";

import { simulateDepot, simulateLv } from "@/lib/finance/simulation";
import { buildComparisonResults } from "@/lib/finance/series";
import {
  depotTaxOptionsFromDefaults,
  lvTaxOptionsFromDefaults,
} from "@/entities/UserDefaults";
import TaxInputs from "@/components/calculator/TaxInputs";

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
  // Legacy single-fund (für Draft-Migration)
  lv_fund_ongoing_costs_percent: number;
  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;
  // Multi-Fonds-Arrays
  lv_funds: FundEntry[];
  depot_funds: FundEntry[];
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
    lv_funds: [
      {
        id: "lv-1",
        name: d.lv_fund_identifier || "Fonds 1",
        allocation_eur: d.lump_sum,
        ongoing_costs_percent: d.lv_fund_ongoing_costs_percent,
        identifier: d.lv_fund_identifier,
      },
    ],
    depot_funds: [
      {
        id: "depot-1",
        name: d.depot_fund_identifier || "Fonds 1",
        allocation_eur: d.lump_sum,
        ongoing_costs_percent: d.depot_fund_ongoing_costs_percent,
        initial_charge_percent: d.depot_fund_initial_charge_percent,
        identifier: d.depot_fund_identifier,
      },
    ],
    depot_costs_annual: d.depot_costs_annual,
  };
}

function loadDraft(): FormData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FormData>;
    const base: FormData = { ...makeDefaults(), ...parsed };
    // Migration: alte Drafts ohne lv_funds/depot_funds
    return {
      ...base,
      lv_funds:
        Array.isArray(parsed.lv_funds) && parsed.lv_funds.length > 0
          ? parsed.lv_funds
          : [
              {
                id: "lv-1",
                name: "Fonds 1",
                allocation_eur: base.lump_sum,
                ongoing_costs_percent: base.lv_fund_ongoing_costs_percent,
              },
            ],
      depot_funds:
        Array.isArray(parsed.depot_funds) && parsed.depot_funds.length > 0
          ? parsed.depot_funds
          : [
              {
                id: "depot-1",
                name: "Fonds 1",
                allocation_eur: base.lump_sum,
                ongoing_costs_percent: base.depot_fund_ongoing_costs_percent,
                initial_charge_percent: base.depot_fund_initial_charge_percent,
              },
            ],
    };
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

  // Berechnung über die gemeinsame Engine. Der Kostensplit im Prozent-Modus
  // folgt jetzt der einheitlichen gleitenden Regel (statt fix 70/30).
  const calculateResults = () => {
    const years = Math.max(1, toNum(formData.contract_duration_years));
    const months = years * 12;
    const ls = toNum(formData.lump_sum);
    const d = UserDefaults.load();

    const lv = simulateLv({
      months,
      annual_return_percent: toNum(formData.assumed_annual_return),
      initial_capital: ls,
      funds: formData.lv_funds,
      cost:
        formData.lv_cost_type === "eur"
          ? {
              type: "eur",
              acquisition_costs_eur: toNum(
                formData.life_insurance_acquisition_costs_eur
              ),
              admin_costs_monthly_eur: toNum(formData.lv_admin_costs_monthly_eur),
            }
          : {
              type: "percent",
              effective_costs_percent: toNum(formData.lv_effective_costs_percent),
            },
    });

    const depot = simulateDepot({
      months,
      annual_return_percent: toNum(formData.assumed_annual_return),
      initial_capital: ls,
      funds: formData.depot_funds,
      depot_costs_annual_percent: toNum(formData.depot_costs_annual),
    });

    const results = buildComparisonResults({
      lv,
      depot,
      years,
      birth_year: toNum(formData.birth_year),
      lvTaxOptions: lvTaxOptionsFromDefaults(d),
      depotTaxOptions: depotTaxOptionsFromDefaults(d),
      riyInputs: {
        annual_return_percent: toNum(formData.assumed_annual_return),
        initial_capital: ls,
        months,
      },
    });

    return { lump_sum: Math.round(ls), ...results };
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
                  <NumericInput value={formData.birth_year}
                    onChange={(val) => update("birth_year", val)}
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
                  <NumericInput value={formData.lump_sum}
                    onChange={(val) => update("lump_sum", val)}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Laufzeit (Jahre)</div>
                  </Label>
                  <NumericInput value={formData.contract_duration_years}
                    onChange={(val) => update("contract_duration_years", val)}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                  {endAge > 0 && (
                    <div className="text-xs text-slate-500">Endalter: <span className="font-semibold text-slate-700">{endAge}</span></div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Angenommene jährliche Rendite (%)</Label>
                <NumericInput step="0.1" value={formData.assumed_annual_return}
                  onChange={(val) => update("assumed_annual_return", val)}
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
                      <NumericInput value={formData.life_insurance_acquisition_costs_eur ?? 0}
                        onChange={(val) => update("life_insurance_acquisition_costs_eur", val)}
                        className="bg-white border-slate-300 focus:border-blue-500" />
                      <p className="text-xs text-slate-500">Wird einmalig vom Einmalbetrag abgezogen.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Verwaltungskosten (€ pro Monat)</Label>
                      <NumericInput step="0.01" value={formData.lv_admin_costs_monthly_eur ?? 0}
                        onChange={(val) => update("lv_admin_costs_monthly_eur", val)}
                        className="bg-white border-slate-300 focus:border-blue-500 md:w-1/2" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Effektivkosten p.a. (%)</div>
                    </Label>
                    <NumericInput step="0.01" value={formData.lv_effective_costs_percent ?? 0}
                      onChange={(val) => update("lv_effective_costs_percent", val)}
                      className="bg-white border-slate-300 focus:border-blue-500" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Fonds innerhalb der LV-Police</div>
                </Label>
                <MultiFundEditor
                  funds={formData.lv_funds}
                  totalAmount={toNum(formData.lump_sum)}
                  allocationLabel="Einzelbetrag (€)"
                  mode="lv"
                  onChange={(funds) => update("lv_funds", funds)}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-700">
                  Bei Verträgen ≥12 Jahre und Auszahlung nach dem 62. Lebensjahr gilt das <strong>Halbeinkünfteverfahren</strong> (42,5 % der Erträge steuerpflichtig).
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
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />Fonds im Depot</div>
                </Label>
                <MultiFundEditor
                  funds={formData.depot_funds}
                  totalAmount={toNum(formData.lump_sum)}
                  allocationLabel="Einzelbetrag (€)"
                  mode="depot"
                  onChange={(funds) => update("depot_funds", funds)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Depotkosten p.a. (%)</div>
                </Label>
                <NumericInput step="0.01" value={formData.depot_costs_annual ?? 0}
                  onChange={(val) => update("depot_costs_annual", val)}
                  className="bg-slate-50 border-slate-200 focus:border-blue-500 md:w-1/3" />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  Gewinne werden mit der <strong>Abgeltungsteuer</strong> (25 %) besteuert –
                  abzüglich Teilfreistellung (siehe Karte „Steuern").
                </p>
              </div>
            </CardContent>
          </Card>

          <TaxInputs />

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
