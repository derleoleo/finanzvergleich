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

import BasicInputs from "@/components/calculator/BasicInputs";
import InsuranceInputs from "@/components/calculator/InsuranceInputs";
import FundInputs from "@/components/calculator/FundInputs";

import {
  calculateAgeAtPayout,
  calculateCapitalGainsTax,
  calculateLifeInsuranceTax,
  calculateMonthlyReturn,
  calculateZillmerMonths,
} from "@/components/shared/TaxCalculations";

const DRAFT_KEY = "fv_calculator_draft_v1";

type FormData = {
  name: string;
  monthly_contribution: number;
  contract_duration_years: number;

  lv_cost_type: "eur" | "percent";
  life_insurance_acquisition_costs_eur: number;
  lv_admin_costs_monthly_eur: number; // ✅ NEU
  lv_effective_costs_percent: number;

  lv_fund_identifier: string;
  lv_fund_ongoing_costs_percent: number;

  depot_fund_identifier: string;
  depot_fund_initial_charge_percent: number;
  depot_fund_ongoing_costs_percent: number;
  depot_costs_annual: number;
  depot_provider: string;

  assumed_annual_return: number;
  birth_year: number;
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
    depot_costs_annual: d.depot_costs_annual,
    depot_provider: d.depot_provider,
    assumed_annual_return: d.assumed_annual_return,
    birth_year: d.birth_year,
  };
}

function loadDraft(): FormData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<FormData>;
    const defaults = makeDefaults();

    const migrated: FormData = {
      ...defaults,
      ...parsed,

      // Safety: Union-Wert absichern
      lv_cost_type: parsed.lv_cost_type === "percent" ? "percent" : "eur",

      // Safety: neues Feld, wenn alte Drafts es nicht haben
      lv_admin_costs_monthly_eur:
        typeof parsed.lv_admin_costs_monthly_eur === "number"
          ? parsed.lv_admin_costs_monthly_eur
          : defaults.lv_admin_costs_monthly_eur,
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

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateResults = () => {
    const {
      monthly_contribution,
      contract_duration_years,
      lv_cost_type,
      life_insurance_acquisition_costs_eur,
      lv_admin_costs_monthly_eur, // ✅ NEU
      lv_effective_costs_percent,
      lv_fund_ongoing_costs_percent,
      depot_fund_initial_charge_percent,
      depot_fund_ongoing_costs_percent,
      depot_costs_annual,
      assumed_annual_return,
      birth_year,
    } = formData;

    const years = Math.max(1, Number(contract_duration_years || 1));
    const months = years * 12;
    const total_contributions = monthly_contribution * months;
    const monthly_return = calculateMonthlyReturn(assumed_annual_return);

    // =========================
    // LV
    // =========================
    let li_capital = 0;

    // Wir speichern getrennte Kosten-Container (für Kosten-Detailseite)
    let li_acquisition_costs = 0; // Abschluss
    let li_fund_costs = 0; // Fondskosten
    let li_admin_costs = 0; // Verwaltung (wir nutzen dafür später li_effective_costs Feld)

    if (lv_cost_type === "eur") {
      // Abschlusskosten in EUR: Zillmerung über max. 60 Monate
      const zillmer_months = calculateZillmerMonths(months);
      const monthly_zillmer =
        life_insurance_acquisition_costs_eur / Math.max(1, zillmer_months);

      li_acquisition_costs = life_insurance_acquisition_costs_eur;

      const adminMonthly = Number(lv_admin_costs_monthly_eur || 0) || 0;

      for (let m = 1; m <= months; m++) {
        const contribAfter =
          m <= zillmer_months
            ? monthly_contribution - monthly_zillmer
            : monthly_contribution;

        const fundCost =
          li_capital * (lv_fund_ongoing_costs_percent / 100 / 12);

        const adminCost = adminMonthly;

        li_fund_costs += fundCost;
        li_admin_costs += adminCost;

        li_capital =
          li_capital * (1 + monthly_return) +
          contribAfter -
          fundCost -
          adminCost;
      }
    } else {
      // Effektivkosten % p.a.: monatlicher Abzug vom Kapital
      const effRate = lv_effective_costs_percent / 100 / 12;

      let totalContractCosts = 0; // Abschluss+Verwaltung zusammen (ohne Fondskosten)

      for (let m = 1; m <= months; m++) {
        const fundCost =
          li_capital * (lv_fund_ongoing_costs_percent / 100 / 12);
        const effCost = li_capital * effRate;

        li_fund_costs += fundCost;
        totalContractCosts += effCost;

        li_capital =
          li_capital * (1 + monthly_return) +
          monthly_contribution -
          fundCost -
          effCost;
      }

      // ✅ SPLIT Abschluss vs Verwaltung nach deiner Regel:
      // - Laufzeit <= 5: 60% Abschluss / 40% Verwaltung
      // - Laufzeit > 5: 70% in den ersten 5 Jahren, 30% im Rest (Verwaltung gleichmäßig pro Jahr)
      let acqShare = 0.6;
      let adminShare = 0.4;

      if (years > 5) {
        adminShare = (0.3 * years) / (years - 5);
        acqShare = 1 - adminShare;

        // Sicherheitsklemmen
        adminShare = Math.max(0, Math.min(1, adminShare));
        acqShare = Math.max(0, Math.min(1, acqShare));
      }

      li_acquisition_costs = totalContractCosts * acqShare;
      li_admin_costs = totalContractCosts * adminShare;
    }

    const li_total_costs =
      li_acquisition_costs + li_admin_costs + li_fund_costs;

    // =========================
    // Depot
    // =========================
    let depot_capital = 0;

    let depot_initial_charges = 0; // Ausgabeaufschläge (Summe)
    let depot_fund_costs = 0; // laufende Fondskosten
    let depot_depot_costs = 0; // Depotkosten

    const initialChargeFactor = 1 - depot_fund_initial_charge_percent / 100;

    for (let m = 1; m <= months; m++) {
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

    // =========================
    // Taxes (Ende)
    // =========================
    const age_at_payout = calculateAgeAtPayout(birth_year, years);

    const li_gains = li_capital - total_contributions;
    const li_tax = calculateLifeInsuranceTax(li_gains, years, age_at_payout, {
      personalIncomeTaxRate: UserDefaults.load().lv_personal_income_tax_rate / 100,
    });

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

      // totals
      li_total_costs: Math.round(li_total_costs),
      depot_total_costs: Math.round(depot_total_costs),

      // breakdown (für Kosten im Detail)
      li_acquisition_costs: Math.round(li_acquisition_costs),
      li_fund_costs: Math.round(li_fund_costs),
      li_effective_costs: Math.round(li_admin_costs), // ✅ Verwaltung (EUR) / Effektiv-Anteil (percent)

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
      const payload = { ...formData, results };

      const newCalc = await Calculation.create(payload as any);
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
                Fonds-Sparvertrag
              </h1>
              <p className="text-slate-600 mt-1">
                Lebensversicherung vs. Direktanlage vergleichen
              </p>
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
