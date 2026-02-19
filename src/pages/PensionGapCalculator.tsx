import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PensionGapCalculation } from "@/entities/PensionGapCalculation";
import { useSubscription } from "@/contexts/SubscriptionContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  TrendingDown, TrendingUp, AlertCircle, Euro, User, Calendar,
} from "lucide-react";

import { calculateMonthlyReturn } from "@/components/shared/TaxCalculations";

const DRAFT_KEY = "fv_pensiongap_draft_v1";

type FormData = {
  name: string;
  birth_year: number;
  retirement_age: number;
  desired_monthly_income: number;
  expected_statutory_pension: number;
  occupational_pension_bav: number;
  basis_rente: number;
  rental_income: number;
  existing_capital: number;
  assumed_annual_return: number;
};

function makeDefaults(): FormData {
  return {
    name: `Rentenlücke ${new Date().toLocaleDateString("de-DE")}`,
    birth_year: 1985,
    retirement_age: 67,
    desired_monthly_income: 3000,
    expected_statutory_pension: 1500,
    occupational_pension_bav: 0,
    basis_rente: 0,
    rental_income: 0,
    existing_capital: 20000,
    assumed_annual_return: 4.0,
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

function calculatePensionGapResults(form: FormData) {
  const currentYear = new Date().getFullYear();
  const current_age = currentYear - toNum(form.birth_year);
  const years_to_retirement = Math.max(0, toNum(form.retirement_age) - current_age);

  const monthly_income_needed = toNum(form.desired_monthly_income);
  const total_monthly_income = toNum(form.expected_statutory_pension)
    + toNum(form.occupational_pension_bav)
    + toNum(form.basis_rente)
    + toNum(form.rental_income);

  const monthly_gap = monthly_income_needed - total_monthly_income;

  if (monthly_gap <= 0) {
    return {
      current_age,
      years_to_retirement,
      monthly_gap: 0,
      capital_needed_at_retirement: 0,
      future_value_of_existing: 0,
      additional_capital_needed: 0,
      monthly_savings_needed: 0,
      gap_already_covered: true,
    };
  }

  const annual_return = toNum(form.assumed_annual_return) / 100;
  const monthly_r = calculateMonthlyReturn(toNum(form.assumed_annual_return));

  // Capital needed at retirement to fund monthly_gap until age 90 (withdrawal horizon)
  const retirement_horizon_months = Math.max(1, (90 - toNum(form.retirement_age)) * 12);
  const capital_needed_at_retirement = monthly_r > 0
    ? monthly_gap * (1 - Math.pow(1 + monthly_r, -retirement_horizon_months)) / monthly_r
    : monthly_gap * retirement_horizon_months;

  // Future value of existing capital at retirement
  const future_value_of_existing = toNum(form.existing_capital) * Math.pow(1 + annual_return, years_to_retirement);

  const additional_capital_needed = Math.max(0, capital_needed_at_retirement - future_value_of_existing);

  // Monthly savings needed (PMT formula for FV)
  const months_to_retirement = years_to_retirement * 12;
  let monthly_savings_needed = 0;
  if (additional_capital_needed > 0 && months_to_retirement > 0) {
    monthly_savings_needed = monthly_r > 0
      ? additional_capital_needed * monthly_r / (Math.pow(1 + monthly_r, months_to_retirement) - 1)
      : additional_capital_needed / months_to_retirement;
  }

  return {
    current_age,
    years_to_retirement,
    monthly_gap: Math.round(monthly_gap),
    capital_needed_at_retirement: Math.round(capital_needed_at_retirement),
    future_value_of_existing: Math.round(future_value_of_existing),
    additional_capital_needed: Math.round(additional_capital_needed),
    monthly_savings_needed: Math.round(monthly_savings_needed),
    gap_already_covered: false,
  };
}

export default function PensionGapCalculator() {
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

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - toNum(formData.birth_year);
  const yearsToRetirement = Math.max(0, toNum(formData.retirement_age) - currentAge);
  const totalMonthlyIncome = toNum(formData.expected_statutory_pension)
    + toNum(formData.occupational_pension_bav)
    + toNum(formData.basis_rente)
    + toNum(formData.rental_income);
  const monthlyGapPreview = toNum(formData.desired_monthly_income) - totalMonthlyIncome;

  const handleCalculate = async () => {
    setError(null);
    setIsCalculating(true);
    try {
      const results = calculatePensionGapResults(formData);
      const newCalc = await PensionGapCalculation.create({ ...formData, results });
      incrementCalculationCount();
      navigate(createPageUrl("PensionGapDetail") + `?id=${newCalc.id}`);
    } catch (e) {
      console.error(e);
      setError("Ein Fehler ist beim Speichern der Berechnung aufgetreten.");
    }
    setIsCalculating(false);
  };

  const inputClass = "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white";

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Rentenlücke</h1>
              <p className="text-slate-600 mt-1">Versorgungslücke berechnen und Sparbedarf ermitteln</p>
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
          {/* Persönliche Daten */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                Persönliche Daten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Name der Berechnung</Label>
                  <Input value={formData.name} onChange={(e) => update("name", e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><User className="w-4 h-4" />Geburtsjahr</div>
                  </Label>
                  <Input type="number" value={formData.birth_year}
                    onChange={(e) => update("birth_year", parseInt(e.target.value || "0", 10))} className={inputClass} />
                  {currentAge > 0 && <div className="text-xs text-slate-500">Aktuelles Alter (ca.): {currentAge}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Renteneintrittsalter</div>
                  </Label>
                  <Input type="number" value={formData.retirement_age}
                    onChange={(e) => update("retirement_age", parseInt(e.target.value || "0", 10))} className={inputClass} />
                  {yearsToRetirement > 0 && <div className="text-xs text-slate-500">Noch {yearsToRetirement} Jahre bis zur Rente</div>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-600 rounded-full" />
                      </div>
                      Angenommene Rendite auf Ersparnisse (%)
                    </div>
                  </Label>
                  <Input type="number" step="0.1" value={formData.assumed_annual_return}
                    onChange={(e) => update("assumed_annual_return", toNum(e.target.value))} className={inputClass} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Einkommensquellen */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Euro className="w-5 h-5 text-green-600" />
                </div>
                Einkommensquellen im Ruhestand (monatlich)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Gewünschtes Monatseinkommen (€)</div>
                </Label>
                <Input type="number" value={formData.desired_monthly_income}
                  onChange={(e) => update("desired_monthly_income", toNum(e.target.value))}
                  className="bg-blue-50 border-blue-200 focus:border-blue-500 font-semibold" />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="text-sm font-medium text-slate-600 mb-4">Erwartete Einnahmen:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Gesetzliche Rente (€/Monat)</Label>
                    <Input type="number" value={formData.expected_statutory_pension}
                      onChange={(e) => update("expected_statutory_pension", toNum(e.target.value))} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Betriebliche Altersvorsorge (€/Monat)</Label>
                    <Input type="number" value={formData.occupational_pension_bav}
                      onChange={(e) => update("occupational_pension_bav", toNum(e.target.value))} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Basisrente / Rüruprente (€/Monat)</Label>
                    <Input type="number" value={formData.basis_rente}
                      onChange={(e) => update("basis_rente", toNum(e.target.value))} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Mieteinnahmen (€/Monat)</Label>
                    <Input type="number" value={formData.rental_income}
                      onChange={(e) => update("rental_income", toNum(e.target.value))} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Live-Vorschau */}
              <div className={`rounded-xl p-4 border ${monthlyGapPreview > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Gesamteinnahmen:</span>
                  <span className="font-bold text-slate-900">
                    {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(totalMonthlyIncome)}/Monat
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-sm font-semibold ${monthlyGapPreview > 0 ? "text-red-700" : "text-green-700"}`}>
                    {monthlyGapPreview > 0 ? "Versorgungslücke:" : "Überschuss:"}
                  </span>
                  <span className={`text-xl font-bold ${monthlyGapPreview > 0 ? "text-red-700" : "text-green-700"}`}>
                    {monthlyGapPreview > 0 ? "–" : "+"}{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Math.abs(monthlyGapPreview))}/Monat
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vorhandenes Vermögen */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                Vorhandenes Vermögen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Aktuelles Kapital / Ersparnisse (€)</div>
                </Label>
                <Input type="number" value={formData.existing_capital}
                  onChange={(e) => update("existing_capital", toNum(e.target.value))}
                  className={inputClass + " md:w-1/2"} />
                <p className="text-xs text-slate-500">
                  Wächst bis zur Rente mit der angenommenen Rendite weiter.
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
                    <TrendingDown className="w-5 h-5" />
                    Rentenlücke berechnen
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
