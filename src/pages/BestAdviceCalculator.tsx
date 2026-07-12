import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl, toNum } from "@/utils";
import { BestAdviceCalculation } from "@/entities/BestAdviceCalculation";
import {
  UserDefaults,
  lvTaxOptionsFromSettings,
  taxSettingsSnapshot,
} from "@/entities/UserDefaults";
import { useSubscription } from "@/contexts/SubscriptionContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

import {
  Target, TrendingUp, AlertCircle, Shield, Percent,
  Calendar, User, FileText, Euro, Lock, AlertTriangle, Plus, Trash2,
} from "lucide-react";
import { looksLikeName } from "@/utils/nameDetection";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";

import {
  calculateAgeAtPayout,
  calculateLifeInsuranceTax,
} from "@/components/shared/TaxCalculations";
import { simulateLv } from "@/lib/finance/simulation";

const DRAFT_KEY = "fv_bestadvice_draft_v1";

type ExtraLV = {
  id: string;
  label: string;
  monthly_contribution: number;
  current_capital: number;
  guaranteed_end_capital: number;
  current_product_tax_free: boolean;
  // Vertragsbeginn (Jahr) für die 12-Jahres-Prüfung des Halbeinkünfteverfahrens;
  // ohne Angabe wird die Restlaufzeit herangezogen. Nur Formular-State,
  // wird nicht in Supabase gespeichert.
  contract_start_year?: number | null;
};

type FormData = {
  name: string;
  // Bestandsvertrag #1
  current_monthly_contribution: number;
  current_product_tax_free: boolean;
  contract_duration_years: number;
  current_capital: number;
  guaranteed_end_capital: number;
  current_contract_start_year: number | null;
  // Weitere Bestandsverträge
  extra_lvs: ExtraLV[];
  // Fonds-LV
  birth_year: number;
  assumed_annual_return: number;
  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur: number;
  lv_effective_costs_percent: number;
  lv_fund_ongoing_costs_percent: number;
  // Optionale Fonds-LV-Überschreibungen (Summen)
  fonds_lv_monthly_override: number | null;
  fonds_lv_capital_override: number | null;
};

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function makeDefaults(): FormData {
  const d = UserDefaults.load();
  return {
    name: `BestAdvice ${new Date().toLocaleDateString("de-DE")}`,
    current_monthly_contribution: d.monthly_contribution,
    current_product_tax_free: false,
    contract_duration_years: d.contract_duration_years,
    current_capital: 10000,
    guaranteed_end_capital: 80000,
    current_contract_start_year: null,
    extra_lvs: [],
    birth_year: d.birth_year,
    assumed_annual_return: d.assumed_annual_return,
    lv_cost_type: d.lv_cost_type,
    life_insurance_acquisition_costs_eur: d.life_insurance_acquisition_costs_eur,
    lv_admin_costs_monthly_eur: d.lv_admin_costs_monthly_eur,
    lv_effective_costs_percent: d.lv_effective_costs_percent,
    lv_fund_ongoing_costs_percent: d.lv_fund_ongoing_costs_percent,
    fonds_lv_monthly_override: null,
    fonds_lv_capital_override: null,
  };
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

  const update = (field: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const currentAge = getCurrentAge(toNum(formData.birth_year));
  const endAge = currentAge > 0 ? currentAge + toNum(formData.contract_duration_years) : 0;

  // Alle LVs als einheitliche Liste
  const allLVs = [
    {
      label: "LV 1",
      monthly_contribution: toNum(formData.current_monthly_contribution),
      current_capital: toNum(formData.current_capital),
      guaranteed_end_capital: toNum(formData.guaranteed_end_capital),
      current_product_tax_free: formData.current_product_tax_free,
      contract_start_year: formData.current_contract_start_year,
    },
    ...(formData.extra_lvs ?? []),
  ];

  const totalMonthly = allLVs.reduce((s, lv) => s + lv.monthly_contribution, 0);
  const totalCapital = allLVs.reduce((s, lv) => s + lv.current_capital, 0);
  const effectiveMonthly = formData.fonds_lv_monthly_override ?? totalMonthly;
  const effectiveCapital = formData.fonds_lv_capital_override ?? totalCapital;
  const isMultiLV = (formData.extra_lvs ?? []).length > 0;

  const calculateResults = () => {
    const years = Math.max(1, toNum(formData.contract_duration_years));
    const months = years * 12;
    const tax_settings = taxSettingsSnapshot();
    const lvTaxOptions = lvTaxOptionsFromSettings(tax_settings);

    // Fonds-LV: mit effektiven Gesamtwerten aller LVs, über die gemeinsame Engine
    const lvSim = simulateLv({
      months,
      annual_return_percent: toNum(formData.assumed_annual_return),
      monthly_contribution: effectiveMonthly,
      initial_capital: effectiveCapital,
      funds: [
        {
          allocation_eur: effectiveMonthly,
          ongoing_costs_percent: toNum(formData.lv_fund_ongoing_costs_percent),
        },
      ],
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

    const li_capital = lvSim.gross_capital;
    const total_contributions = lvSim.total_contributions;
    const li_acquisition_costs = lvSim.costs.acquisition;
    const li_admin_costs = lvSim.costs.admin;
    const li_fund_costs = lvSim.costs.fund;

    // LV-Steuer
    const age_at_payout = calculateAgeAtPayout(toNum(formData.birth_year), years);
    const li_gains = li_capital - total_contributions;
    const li_tax = calculateLifeInsuranceTax(
      li_gains,
      years,
      age_at_payout,
      lvTaxOptions
    );

    // Bestandsverträge: jede LV einzeln berechnen.
    // Auch Bestands-LVs sind Versicherungen → Halbeinkünfteverfahren statt
    // Abgeltungsteuer. Für die 12-Jahres-Prüfung zählt die Gesamtlaufzeit
    // (Auszahlungsjahr − Vertragsbeginn), falls der Vertragsbeginn angegeben
    // wurde; sonst konservativ die Restlaufzeit.
    const currentYear = new Date().getFullYear();
    const payoutYear = currentYear + years;
    const lvs_results = allLVs.map((lv) => {
      const lv_total_contributions = lv.current_capital + lv.monthly_contribution * months;
      const gross = lv.guaranteed_end_capital;
      let tax = 0;
      if (!lv.current_product_tax_free) {
        const gains = gross - lv_total_contributions;
        const startYear = toNum(lv.contract_start_year ?? 0);
        const qualDuration =
          startYear > 1900 ? payoutYear - startYear : years;
        tax = calculateLifeInsuranceTax(
          gains,
          qualDuration,
          age_at_payout,
          lvTaxOptions
        );
      }
      return {
        label: lv.label,
        total_contributions: Math.round(lv_total_contributions),
        depot_gross: Math.round(gross),
        depot_net: Math.round(gross - tax),
        depot_tax: Math.round(tax),
      };
    });

    const depot_gross = lvs_results.reduce((s, r) => s + r.depot_gross, 0);
    const depot_net = lvs_results.reduce((s, r) => s + r.depot_net, 0);
    const depot_tax = lvs_results.reduce((s, r) => s + r.depot_tax, 0);

    return {
      total_contributions: Math.round(total_contributions),
      life_insurance_gross: Math.round(li_capital),
      life_insurance_net: Math.round(li_capital - li_tax),
      li_total_costs: Math.round(li_acquisition_costs + li_fund_costs + li_admin_costs),
      li_acquisition_costs: Math.round(li_acquisition_costs),
      li_fund_costs: Math.round(li_fund_costs),
      li_admin_costs: Math.round(li_admin_costs),
      li_tax: Math.round(li_tax),
      depot_gross,
      depot_net,
      depot_tax,
      lvs_results,
      // Annahmen zum Berechnungszeitpunkt mitspeichern → geräteunabhängige Anzeige
      tax_settings,
    };
  };

  const handleCalculate = async () => {
    setError(null);
    setIsCalculating(true);
    try {
      const results = calculateResults();
      // extra_lvs + overrides + Vertragsbeginn werden nicht separat gespeichert,
      // sondern via results. Die top-level-Felder werden mit den effektiven
      // Gesamtwerten überschrieben.
      const {
        extra_lvs: _el,
        fonds_lv_monthly_override: _fm,
        fonds_lv_capital_override: _fc,
        current_contract_start_year: _cs,
        ...formBase
      } = formData;
      const totalGuaranteed = allLVs.reduce((s, lv) => s + lv.guaranteed_end_capital, 0);
      const newCalc = await BestAdviceCalculation.create({
        ...formBase,
        current_monthly_contribution: effectiveMonthly,
        current_capital: effectiveCapital,
        guaranteed_end_capital: totalGuaranteed,
        current_product_tax_free: false,
        results,
      });
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
                  {currentAge > 0 && <div className="text-xs text-slate-500">Aktuelles Alter (ca.): {currentAge}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Restlaufzeit (Jahre)</div>
                  </Label>
                  <NumericInput value={formData.contract_duration_years}
                    onChange={(val) => update("contract_duration_years", val)}
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
                  <NumericInput step="0.1" value={formData.assumed_annual_return}
                    onChange={(val) => update("assumed_annual_return", val)}
                    className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bestandsverträge */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-600" />
                </div>
                Bestandsverträge (aktuell)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* LV 1 (Primär) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="text-sm font-semibold text-slate-700">LV 1</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Sparrate (€/Monat)</div>
                    </Label>
                    <NumericInput value={formData.current_monthly_contribution}
                      onChange={(val) => update("current_monthly_contribution", val)}
                      className="bg-white border-slate-300 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Kapital / Rückkaufswert (€)</div>
                    </Label>
                    <NumericInput value={formData.current_capital}
                      onChange={(val) => update("current_capital", val)}
                      className="bg-white border-slate-300 focus:border-blue-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2"><Lock className="w-4 h-4" />Garantiertes Endkapital (€)</div>
                    </Label>
                    <NumericInput value={formData.guaranteed_end_capital}
                      onChange={(val) => update("guaranteed_end_capital", val)}
                      className="bg-white border-slate-300 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Vertragsbeginn (Jahr, optional)</div>
                    </Label>
                    <NumericInput value={formData.current_contract_start_year ?? 0}
                      onChange={(val) => update("current_contract_start_year", val > 1900 ? val : null)}
                      className="bg-white border-slate-300 focus:border-blue-500" />
                    <p className="text-xs text-slate-500">
                      Für die 12-Jahres-Prüfung (Halbeinkünfteverfahren). Ohne Angabe zählt die Restlaufzeit.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Switch
                    checked={formData.current_product_tax_free}
                    onCheckedChange={(checked) => update("current_product_tax_free", checked)}
                  />
                  <Label className="text-sm font-medium text-slate-700">
                    {formData.current_product_tax_free ? "Steuerfrei (z.B. vor 2005)" : "Steuerpflichtig"}
                  </Label>
                </div>
              </div>

              {/* Weitere LVs */}
              {(formData.extra_lvs ?? []).map((lv) => (
                <div key={lv.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <Input
                      value={lv.label}
                      onChange={(e) => {
                        const updated = formData.extra_lvs.map((x) =>
                          x.id === lv.id ? { ...x, label: e.target.value } : x
                        );
                        update("extra_lvs", updated);
                      }}
                      className="text-sm font-semibold text-slate-700 bg-transparent border-0 border-b border-slate-300 rounded-none px-0 h-7 w-40 focus:border-blue-500 focus:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        update("extra_lvs", formData.extra_lvs.filter((x) => x.id !== lv.id));
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      title="LV entfernen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Sparrate (€/Monat)</div>
                      </Label>
                      <NumericInput value={lv.monthly_contribution}
                        onChange={(val) => {
                          const updated = formData.extra_lvs.map((x) =>
                            x.id === lv.id ? { ...x, monthly_contribution: val } : x
                          );
                          update("extra_lvs", updated);
                        }}
                        className="bg-white border-slate-300 focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Kapital / Rückkaufswert (€)</div>
                      </Label>
                      <NumericInput value={lv.current_capital}
                        onChange={(val) => {
                          const updated = formData.extra_lvs.map((x) =>
                            x.id === lv.id ? { ...x, current_capital: val } : x
                          );
                          update("extra_lvs", updated);
                        }}
                        className="bg-white border-slate-300 focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        <div className="flex items-center gap-2"><Lock className="w-4 h-4" />Garantiertes Endkapital (€)</div>
                      </Label>
                      <NumericInput value={lv.guaranteed_end_capital}
                        onChange={(val) => {
                          const updated = formData.extra_lvs.map((x) =>
                            x.id === lv.id ? { ...x, guaranteed_end_capital: val } : x
                          );
                          update("extra_lvs", updated);
                        }}
                        className="bg-white border-slate-300 focus:border-blue-500" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">
                        <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Vertragsbeginn (Jahr, optional)</div>
                      </Label>
                      <NumericInput value={lv.contract_start_year ?? 0}
                        onChange={(val) => {
                          const updated = formData.extra_lvs.map((x) =>
                            x.id === lv.id ? { ...x, contract_start_year: val > 1900 ? val : null } : x
                          );
                          update("extra_lvs", updated);
                        }}
                        className="bg-white border-slate-300 focus:border-blue-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    <Switch
                      checked={lv.current_product_tax_free}
                      onCheckedChange={(checked) => {
                        const updated = formData.extra_lvs.map((x) =>
                          x.id === lv.id ? { ...x, current_product_tax_free: checked } : x
                        );
                        update("extra_lvs", updated);
                      }}
                    />
                    <Label className="text-sm font-medium text-slate-700">
                      {lv.current_product_tax_free ? "Steuerfrei (z.B. vor 2005)" : "Steuerpflichtig"}
                    </Label>
                  </div>
                </div>
              ))}

              {/* + Weitere LV hinzufügen */}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const newLV: ExtraLV = {
                    id: genId(),
                    label: `LV ${(formData.extra_lvs ?? []).length + 2}`,
                    monthly_contribution: 0,
                    current_capital: 0,
                    guaranteed_end_capital: 0,
                    current_product_tax_free: false,
                  };
                  update("extra_lvs", [...(formData.extra_lvs ?? []), newLV]);
                }}
                className="w-full border-dashed border-slate-300 text-slate-600 hover:border-amber-400 hover:text-amber-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Weitere LV hinzufügen
              </Button>

              {/* Summe bei mehreren LVs */}
              {isMultiLV && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-800">
                  <div className="font-semibold mb-1">Summe aller Bestandsverträge</div>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-slate-600">Gesamte Sparrate:</span>
                    <span className="font-medium">{formatCurrency(totalMonthly)}/Monat</span>
                    <span className="text-slate-600">Gesamtkapital:</span>
                    <span className="font-medium">{formatCurrency(totalCapital)}</span>
                  </div>
                </div>
              )}
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
                  {isMultiLV
                    ? "Das Gesamtkapital und die Gesamtsparrate aller Bestandsverträge werden in die Fonds-LV übertragen."
                    : "Das aktuelle Kapital wird in die Fonds-LV übertragen; die Sparrate fließt weiterhin monatlich ein."}
                </p>
              </div>

              {/* Überschreibbare Summen bei mehreren LVs */}
              {isMultiLV && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                  <div className="text-sm font-semibold text-slate-700">Einzahlungen in die Fonds-LV</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">
                        Monatsbeitrag (€) — auto: {formatCurrency(totalMonthly)}/Monat
                      </Label>
                      <NumericInput
                        value={formData.fonds_lv_monthly_override ?? totalMonthly}
                        onChange={(val) => update("fonds_lv_monthly_override", val === totalMonthly ? null : val)}
                        className="bg-white border-slate-300 focus:border-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">
                        Startkapital (€) — auto: {formatCurrency(totalCapital)}
                      </Label>
                      <NumericInput
                        value={formData.fonds_lv_capital_override ?? totalCapital}
                        onChange={(val) => update("fonds_lv_capital_override", val === totalCapital ? null : val)}
                        className="bg-white border-slate-300 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    Werte werden automatisch aus den Bestandsverträgen summiert. Zur manuellen Anpassung einfach überschreiben.
                  </p>
                </div>
              )}

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
                      <p className="text-xs text-slate-500">Wird gezillmert über die ersten 5 Jahre (max. 60 Monate).</p>
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
                  <div className="flex items-center gap-2"><Percent className="w-4 h-4" />Laufende Kosten LV-Fonds p.a. (%)</div>
                </Label>
                <NumericInput step="0.01" value={formData.lv_fund_ongoing_costs_percent ?? 0}
                  onChange={(val) => update("lv_fund_ongoing_costs_percent", val)}
                  className="bg-slate-50 border-slate-200 focus:border-blue-500 md:w-1/2" />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-700">
                  Bei Verträgen ≥12 Jahre und Auszahlung nach dem 62. Lebensjahr gilt das <strong>Halbeinkünfteverfahren</strong> (42,5 % der Erträge steuerpflichtig).
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
