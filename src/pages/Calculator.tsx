// src/pages/Calculator.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";

import { Calculation } from "@/entities/Calculation";
import { UserDefaults } from "@/entities/UserDefaults";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Calculator as CalcIcon, TrendingUp, AlertCircle } from "lucide-react";

import AnlageModeToggle from "@/components/calculator/AnlageModeToggle";
import BasicInputs from "@/components/calculator/BasicInputs";
import InsuranceInputs from "@/components/calculator/InsuranceInputs";
import FundInputs from "@/components/calculator/FundInputs";
import type { FundEntry } from "@/components/calculator/MultiFundEditor";

import { simulateDepot, simulateLv } from "@/lib/finance/simulation";
import { buildComparisonResults } from "@/lib/finance/series";
import {
  depotTaxOptionsFromDefaults,
  lvTaxOptionsFromDefaults,
} from "@/entities/UserDefaults";
import TaxInputs from "@/components/calculator/TaxInputs";

const DRAFT_KEY = "fv_calculator_draft_v1";

type FormData = {
  name: string;
  monthly_contribution: number;
  contract_duration_years: number;

  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur: number;
  lv_effective_costs_percent: number;

  // Legacy single-fund fields (für Draft-Migration)
  lv_fund_identifier: string;
  lv_fund_ongoing_costs_percent: number;
  depot_fund_identifier: string;
  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;

  // Multi-Fonds-Arrays (überschreiben die Legacy-Felder in der Berechnung)
  lv_funds: FundEntry[];
  depot_funds: FundEntry[];

  depot_costs_annual: number;
  depot_provider: string;

  assumed_annual_return: number;
  birth_year: number;
  dynamik_percent: number;
};

function makeDefaults(): FormData {
  const d = UserDefaults.load();
  return {
    name: `Berechnung ${new Date().toLocaleDateString("de-DE")}`,
    monthly_contribution: d.monthly_contribution,
    contract_duration_years: d.contract_duration_years,
    lv_cost_type: d.lv_cost_type,
    life_insurance_acquisition_costs_eur: d.life_insurance_acquisition_costs_eur,
    lv_admin_costs_monthly_eur: d.lv_admin_costs_monthly_eur,
    lv_effective_costs_percent: d.lv_effective_costs_percent,
    lv_fund_identifier: d.lv_fund_identifier,
    lv_fund_ongoing_costs_percent: d.lv_fund_ongoing_costs_percent,
    depot_fund_identifier: d.depot_fund_identifier,
    depot_fund_initial_charge_percent: d.depot_fund_initial_charge_percent,
    depot_fund_ongoing_costs_percent: d.depot_fund_ongoing_costs_percent,
    lv_funds: [
      {
        id: "lv-1",
        name: d.lv_fund_identifier || "Fonds 1",
        allocation_eur: d.monthly_contribution,
        ongoing_costs_percent: d.lv_fund_ongoing_costs_percent,
        identifier: d.lv_fund_identifier,
      },
    ],
    depot_funds: [
      {
        id: "depot-1",
        name: d.depot_fund_identifier || "Fonds 1",
        allocation_eur: d.monthly_contribution,
        ongoing_costs_percent: d.depot_fund_ongoing_costs_percent,
        initial_charge_percent: d.depot_fund_initial_charge_percent,
        identifier: d.depot_fund_identifier,
      },
    ],
    depot_costs_annual: d.depot_costs_annual,
    depot_provider: d.depot_provider,
    assumed_annual_return: d.assumed_annual_return,
    birth_year: d.birth_year,
    dynamik_percent: d.dynamik_percent,
  };
}

function loadDraft(): FormData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<FormData>;
    const defaults = makeDefaults();

    const base: FormData = {
      ...defaults,
      ...parsed,
      lv_cost_type: parsed.lv_cost_type === "percent" ? "percent" : "eur",
      lv_admin_costs_monthly_eur:
        typeof parsed.lv_admin_costs_monthly_eur === "number"
          ? parsed.lv_admin_costs_monthly_eur
          : defaults.lv_admin_costs_monthly_eur,
    };

    // Migration: alte Drafts ohne lv_funds/depot_funds
    const migrated: FormData = {
      ...base,
      lv_funds:
        Array.isArray(parsed.lv_funds) && parsed.lv_funds.length > 0
          ? parsed.lv_funds
          : [
              {
                id: "lv-1",
                name: base.lv_fund_identifier || "Fonds 1",
                allocation_eur: base.monthly_contribution,
                ongoing_costs_percent: base.lv_fund_ongoing_costs_percent,
                identifier: base.lv_fund_identifier,
              },
            ],
      depot_funds:
        Array.isArray(parsed.depot_funds) && parsed.depot_funds.length > 0
          ? parsed.depot_funds
          : [
              {
                id: "depot-1",
                name: base.depot_fund_identifier || "Fonds 1",
                allocation_eur: base.monthly_contribution,
                ongoing_costs_percent: base.depot_fund_ongoing_costs_percent,
                initial_charge_percent: base.depot_fund_initial_charge_percent,
                identifier: base.depot_fund_identifier,
              },
            ],
    };

    return migrated;
  } catch {
    return null;
  }
}

function saveDraft(data: FormData) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export default function Calculator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const defaults = useMemo(() => makeDefaults(), []);
  const resume = searchParams.get("resume") === "1";

  const { canCreateCalculation, incrementCalculationCount } = useSubscription();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Initial: nur wenn resume=1 dann Draft, sonst Defaults
  const [formData, setFormData] = useState<FormData>(() => {
    if (resume) return loadDraft() ?? defaults;
    return defaults;
  });

  // ✅ Wenn man per URL zwischen /calculator und /calculator?resume=1 wechselt,
  // sollen die Werte neu geladen werden.
  useEffect(() => {
    if (resume) {
      setFormData(loadDraft() ?? defaults);
    } else {
      setFormData(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume]);

  // ✅ Draft speichern (immer), damit "letzte Eingaben" zuverlässig sind.
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDraft(formData), 250);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [formData]);

  const updateFormData = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateResults = () => {
    const years = Math.max(1, Number(formData.contract_duration_years || 1));
    const months = years * 12;
    const d = UserDefaults.load();

    const lv = simulateLv({
      months,
      annual_return_percent: formData.assumed_annual_return,
      monthly_contribution: formData.monthly_contribution,
      dynamik_percent: formData.dynamik_percent,
      funds: formData.lv_funds,
      cost:
        formData.lv_cost_type === "eur"
          ? {
              type: "eur",
              acquisition_costs_eur:
                formData.life_insurance_acquisition_costs_eur,
              admin_costs_monthly_eur:
                Number(formData.lv_admin_costs_monthly_eur || 0) || 0,
            }
          : {
              type: "percent",
              effective_costs_percent: formData.lv_effective_costs_percent,
            },
    });

    const depot = simulateDepot({
      months,
      annual_return_percent: formData.assumed_annual_return,
      monthly_contribution: formData.monthly_contribution,
      dynamik_percent: formData.dynamik_percent,
      funds: formData.depot_funds,
      depot_costs_annual_percent: formData.depot_costs_annual,
    });

    return buildComparisonResults({
      lv,
      depot,
      years,
      birth_year: formData.birth_year,
      lvTaxOptions: lvTaxOptionsFromDefaults(d),
      depotTaxOptions: depotTaxOptionsFromDefaults(d),
      riyInputs: {
        annual_return_percent: formData.assumed_annual_return,
        monthly_contribution: formData.monthly_contribution,
        months,
        dynamik_percent: formData.dynamik_percent,
      },
    });
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
      const payload = { ...formData, results };

      const newCalc = await Calculation.create(payload);
      incrementCalculationCount();
      navigate(createPageUrl("CalculatorDetail") + `?id=${newCalc.id}`);
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
              <CalcIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Depot vs. LV
              </h1>
              <p className="text-slate-600 mt-1">
                Monatliche Anlage – Lebensversicherung vs. Direktanlage vergleichen
              </p>
            </div>
          </div>

          <div className="mt-4">
            <AnlageModeToggle mode="monthly" />
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
          <BasicInputs formData={formData} updateFormData={updateFormData} />

          <InsuranceInputs
            formData={formData}
            updateFormData={updateFormData}
          />

          <FundInputs
            formData={formData}
            updateFormData={updateFormData}
          />

          <TaxInputs />

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleCalculate}
                  disabled={isCalculating}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 text-lg font-medium rounded-xl transition-all duration-200 flex items-center gap-3"
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

                <Button
                  variant="outline"
                  onClick={() => navigate(createPageUrl("Results"))}
                  size="md"
                >
                  Zu den Ergebnissen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
