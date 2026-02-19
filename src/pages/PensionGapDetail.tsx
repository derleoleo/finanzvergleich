import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PensionGapCalculation, type PensionGapModel } from "@/entities/PensionGapCalculation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingDown, TrendingUp, Euro, CheckCircle, FileDown } from "lucide-react";
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";

import { formatCurrency, formatChartAxis } from "@/components/shared/CurrencyDisplay";
import { calculateMonthlyReturn } from "@/components/shared/TaxCalculations";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Legend,
} from "recharts";

function buildSavingsGrowthSeries(calc: PensionGapModel) {
  if (!calc.results || calc.results.gap_already_covered) return [];

  const r = calc.results;
  const annual_return = (calc.assumed_annual_return || 0) / 100;
  const monthly_r = calculateMonthlyReturn(calc.assumed_annual_return || 0);
  const monthly_savings = r.monthly_savings_needed;
  const years_to_retirement = r.years_to_retirement;
  const existing = calc.existing_capital || 0;

  const points: { year: number; age: number; capital: number; target: number }[] = [];
  const currentAge = r.current_age;

  let capital = existing;
  for (let y = 1; y <= years_to_retirement; y++) {
    // Grow existing capital + savings contributions
    for (let m = 0; m < 12; m++) {
      capital = capital * (1 + monthly_r) + monthly_savings;
    }
    points.push({
      year: y,
      age: currentAge + y,
      capital: Math.round(capital),
      target: Math.round(r.capital_needed_at_retirement),
    });
  }

  return points;
}

function buildIncomeBreakdown(calc: PensionGapModel) {
  const desired = calc.desired_monthly_income || 0;
  const statutory = calc.expected_statutory_pension || 0;
  const bav = calc.occupational_pension_bav || 0;
  const basis = calc.basis_rente || 0;
  const rental = calc.rental_income || 0;
  const total = statutory + bav + basis + rental;
  const gap = Math.max(0, desired - total);

  const sources = [
    { name: "Gesetzl. Rente", value: statutory, fill: "#3b82f6" },
    { name: "bAV", value: bav, fill: "#8b5cf6" },
    { name: "Basisrente", value: basis, fill: "#06b6d4" },
    { name: "Mieteinnahmen", value: rental, fill: "#10b981" },
    { name: "Lücke", value: gap, fill: "#ef4444" },
  ].filter((s) => s.value > 0);

  return { sources, total, gap, desired };
}

export default function PensionGapDetail() {
  const navigate = useNavigate();
  const [calculation, setCalculation] = useState<PensionGapModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) { setIsLoading(false); return; }
    PensionGapCalculation.get(id).then((calc) => {
      if (calc) setCalculation(calc);
      setIsLoading(false);
    });
  }, []);

  const savingsSeries = useMemo(() => {
    if (!calculation) return [];
    return buildSavingsGrowthSeries(calculation);
  }, [calculation]);

  const incomeBreakdown = useMemo(() => {
    if (!calculation) return null;
    return buildIncomeBreakdown(calculation);
  }, [calculation]);

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

  const fmt = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <>
    <div id="pdf-content" className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(createPageUrl("PensionGapCalculator"))} className="mb-4" data-pdf-hide>
          <ArrowLeft className="w-4 h-4 mr-2" />Zurück zur Eingabe
        </Button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{calculation.name}</h1>
              <p className="text-slate-600 mt-1">
                Renteneintritt mit {calculation.retirement_age} · Noch {r.years_to_retirement} Jahre
              </p>
            </div>
          </div>
          <Button onClick={openDialog} variant="outline" data-pdf-hide>
            <FileDown className="w-4 h-4 mr-2" />
            Als PDF exportieren
          </Button>
        </div>

        {/* Kein Handlungsbedarf */}
        {r.gap_already_covered ? (
          <Card className="border-0 shadow-lg bg-green-50">
            <CardContent className="p-6 flex items-center gap-4">
              <CheckCircle className="w-10 h-10 text-green-600 shrink-0" />
              <div>
                <div className="text-xl font-bold text-green-800">Keine Rentenlücke!</div>
                <div className="text-green-700 mt-1">
                  Ihre erwarteten Einnahmen decken das gewünschte Monatseinkommen bereits vollständig ab.
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Ergebnis-Kacheln */}
            <div data-pdf-section="ergebnis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-0 shadow-lg bg-red-50">
                <CardContent className="p-5">
                  <div className="text-sm text-red-700 font-medium">Monatliche Lücke</div>
                  <div className="text-2xl font-bold text-red-800 mt-1">{fmt(r.monthly_gap)}</div>
                  <div className="text-xs text-red-600 mt-1">pro Monat im Ruhestand</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-5">
                  <div className="text-sm text-slate-600 font-medium">Kapital bei Rente benötigt</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(r.capital_needed_at_retirement)}</div>
                  <div className="text-xs text-slate-500 mt-1">bis Alter 90 (Annuität)</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white">
                <CardContent className="p-5">
                  <div className="text-sm text-slate-600 font-medium">Vorhandenes Kapital (bei Rente)</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{fmt(r.future_value_of_existing)}</div>
                  <div className="text-xs text-slate-500 mt-1">nach {r.years_to_retirement} Jahren Wachstum</div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-blue-50">
                <CardContent className="p-5">
                  <div className="text-sm text-blue-700 font-medium">Monatliche Sparrate benötigt</div>
                  <div className="text-2xl font-bold text-blue-800 mt-1">{fmt(r.monthly_savings_needed)}</div>
                  <div className="text-xs text-blue-600 mt-1">zusätzlich ab sofort</div>
                </CardContent>
              </Card>
            </div>

            {/* Einkommens-Aufschlüsselung */}
            {incomeBreakdown && (
              <div data-pdf-section="einkommensquellen">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                      <Euro className="w-5 h-5 text-green-600" />
                    </div>
                    Einkommensquellen vs. Bedarf ({fmt(calculation.desired_monthly_income)}/Monat)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[{ name: "Monatseinkommen", ...Object.fromEntries(incomeBreakdown.sources.map((s) => [s.name, s.value])) }]}
                        margin={{ top: 10, right: 20, left: 10, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `${v} €`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value: any) => [`${value} €/Monat`]} />
                        <Legend />
                        {incomeBreakdown.sources.map((s) => (
                          <Bar key={s.name} dataKey={s.name} stackId="a" fill={s.fill} />
                        ))}
                        <ReferenceLine y={calculation.desired_monthly_income} stroke="#1e293b" strokeDasharray="6 3"
                          label={{ value: "Ziel", position: "right", fontSize: 11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {incomeBreakdown.sources.map((s) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.fill }} />
                        <div>
                          <div className="text-xs text-slate-500">{s.name}</div>
                          <div className="text-sm font-semibold">{fmt(s.value)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Kapitalaufbau-Verlauf */}
            {savingsSeries.length > 0 && (
              <div data-pdf-section="kapitalaufbau">
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    Kapitalaufbau mit {fmt(r.monthly_savings_needed)}/Monat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={savingsSeries} margin={{ top: 10, right: 20, left: 10, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="age" tick={{ fontSize: 12 }} label={{ value: "Alter", position: "insideBottom", offset: -4, fontSize: 11 }} />
                        <YAxis tickFormatter={formatChartAxis} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: any, name: any) => [formatCurrency(Number(value || 0)), name === "capital" ? "Angespartes Kapital" : "Benötigtes Kapital"]}
                          labelFormatter={(age: any) => `Alter ${age}`}
                        />
                        <Legend formatter={(v) => v === "capital" ? "Angespartes Kapital" : "Zielkapital"} />
                        <Line type="monotone" dataKey="capital" name="capital" stroke="#2563eb" strokeWidth={3} dot={false} isAnimationActive={false} />
                        <Line type="monotone" dataKey="target" name="target" stroke="#dc2626" strokeWidth={2} dot={false} strokeDasharray="6 3" isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Annahme: {calculation.assumed_annual_return}% jährliche Rendite. Zielkapital zur Deckung der Lücke bis Alter 90.
                  </p>
                </CardContent>
              </Card>
              </div>
            )}

            {/* Zusammenfassung */}
            <div data-pdf-section="zusammenfassung">
            <Card className="border-0 shadow-lg bg-slate-800 text-white">
              <CardContent className="p-6">
                <div className="text-lg font-semibold mb-4">Zusammenfassung</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-slate-300">Monatliche Lücke</span><span className="font-bold text-red-300">{fmt(r.monthly_gap)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Benötigtes Kapital bei Renteneintritt</span><span className="font-bold">{fmt(r.capital_needed_at_retirement)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-300">Vorhandenes Kapital (projiziert)</span><span className="font-bold text-green-300">{fmt(r.future_value_of_existing)}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-slate-300">Noch zu schließende Lücke</span><span className="font-bold text-yellow-300">{fmt(r.additional_capital_needed)}</span></div>
                    <div className="flex justify-between border-t border-slate-600 pt-2 mt-2"><span className="text-slate-200 font-semibold">Empfohlene Sparrate</span><span className="font-bold text-2xl text-blue-300">{fmt(r.monthly_savings_needed)}/Monat</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </>
        )}

        <Button variant="outline" onClick={() => navigate(createPageUrl("PensionGapCalculator"))} data-pdf-hide>
          Neue Berechnung
        </Button>
      </div>
    </div>
    {dialogOpen && (
      <PDFSectionDialog
        sections={[
          { id: "ergebnis", label: "Ergebniskacheln" },
          { id: "einkommensquellen", label: "Einkommensquellen" },
          { id: "kapitalaufbau", label: "Kapitalaufbau-Verlauf" },
          { id: "zusammenfassung", label: "Zusammenfassung" },
        ]}
        isExporting={isExporting}
        onExport={(ids) =>
          doExport(ids, `rentenlücke-${calculation.name}`, "Rentenlücke")
        }
        onClose={closeDialog}
      />
    )}
    </>
  );
}
