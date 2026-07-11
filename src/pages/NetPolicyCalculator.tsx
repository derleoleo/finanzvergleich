// src/pages/NetPolicyCalculator.tsx
// Netto- vs. Bruttopolice (Honorarberatung): zwei LV-Läufe über die gemeinsame
// Engine mit identischen Beiträgen/Fonds. Nettotarif ohne Abschlusskosten und
// mit reduzierter Verwaltung, dafür einmaliges Beratungshonorar.
//
// Vereinfachung: Das Honorar wird separat gezahlt (nicht aus dem Vertrag
// entnommen) und ohne Verzinsungseffekt vom Netto-Endwert abgezogen.
// v1 ohne Supabase-Persistenz: nur localStorage-Draft + PDF-Export.
// Nur sichtbar, wenn in den Voreinstellungen "Honorarberatung" aktiviert ist.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl, toNum } from "@/utils";
import { UserDefaults, lvTaxOptionsFromDefaults } from "@/entities/UserDefaults";
import { simulateLv } from "@/lib/finance/simulation";
import {
  calculateAgeAtPayout,
  calculateLifeInsuranceTax,
} from "@/components/shared/TaxCalculations";
import { reductionInYield } from "@/lib/finance/riy";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatChartAxis } from "@/components/shared/CurrencyDisplay";
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";
import { Handshake, FileDown, ArrowLeft } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const DRAFT_KEY = "fv_netpolicy_draft_v1";

const inputClass =
  "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white";

type FormData = {
  birth_year: number;
  monthly_contribution: number;
  contract_duration_years: number;
  assumed_annual_return: number;
  dynamik_percent: number;
  lv_fund_ongoing_costs_percent: number;

  brutto_acquisition_costs_eur: number;
  brutto_admin_monthly_eur: number;

  netto_admin_monthly_eur: number;
  honorar_eur: number;
};

function makeDefaults(): FormData {
  const d = UserDefaults.load();
  return {
    birth_year: d.birth_year,
    monthly_contribution: d.monthly_contribution,
    contract_duration_years: d.contract_duration_years,
    assumed_annual_return: d.assumed_annual_return,
    dynamik_percent: d.dynamik_percent,
    lv_fund_ongoing_costs_percent: d.lv_fund_ongoing_costs_percent,

    brutto_acquisition_costs_eur: d.life_insurance_acquisition_costs_eur,
    brutto_admin_monthly_eur: d.lv_admin_costs_monthly_eur,

    netto_admin_monthly_eur: 2,
    honorar_eur: 1500,
  };
}

function loadDraft(): FormData {
  const defaults = makeDefaults();
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<FormData>) };
  } catch {
    return defaults;
  }
}

export default function NetPolicyCalculator() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(() => loadDraft());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  const updateFormData = (field: keyof FormData, value: number) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
        } catch { /* ignore */ }
      }, 250);
      return next;
    });
  };

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const results = useMemo(() => {
    const years = Math.max(1, toNum(formData.contract_duration_years));
    const months = years * 12;
    const monthly = toNum(formData.monthly_contribution);
    const honorar = Math.max(0, toNum(formData.honorar_eur));
    const annualReturn = toNum(formData.assumed_annual_return);
    const lvTaxOptions = lvTaxOptionsFromDefaults();
    const ageAtPayout = calculateAgeAtPayout(toNum(formData.birth_year), years);

    const common = {
      months,
      annual_return_percent: annualReturn,
      monthly_contribution: monthly,
      dynamik_percent: toNum(formData.dynamik_percent),
      funds: [
        {
          allocation_eur: monthly,
          ongoing_costs_percent: toNum(formData.lv_fund_ongoing_costs_percent),
        },
      ],
    };

    const brutto = simulateLv({
      ...common,
      cost: {
        type: "eur",
        acquisition_costs_eur: toNum(formData.brutto_acquisition_costs_eur),
        admin_costs_monthly_eur: toNum(formData.brutto_admin_monthly_eur),
      },
    });
    const netto = simulateLv({
      ...common,
      cost: {
        type: "eur",
        acquisition_costs_eur: 0,
        admin_costs_monthly_eur: toNum(formData.netto_admin_monthly_eur),
      },
    });

    const taxOf = (grossCapital: number, contributions: number) =>
      calculateLifeInsuranceTax(
        grossCapital - contributions,
        years,
        ageAtPayout,
        lvTaxOptions
      );

    const bruttoTax = taxOf(brutto.gross_capital, brutto.total_contributions);
    const nettoTax = taxOf(netto.gross_capital, netto.total_contributions);
    const bruttoNet = brutto.gross_capital - bruttoTax;
    // Honorar separat gezahlt → ohne Verzinsung vom Netto-Ergebnis abgezogen
    const nettoNet = netto.gross_capital - nettoTax - honorar;

    const stream = {
      monthly_contribution: monthly,
      months,
      dynamik_percent: toNum(formData.dynamik_percent),
    };

    // Jahres-Serie (netto nach Steuern; Nettopolice inkl. Honorar-Abzug)
    const series: { year: number; age: number; brutto: number; netto: number }[] = [];
    for (let m = 12; m <= months; m += 12) {
      const year = m / 12;
      const age = calculateAgeAtPayout(toNum(formData.birth_year), year);
      const b = brutto.series[m - 1];
      const n = netto.series[m - 1];
      const bTax = calculateLifeInsuranceTax(
        b.capital - b.contributions_cum, year, age, lvTaxOptions
      );
      const nTax = calculateLifeInsuranceTax(
        n.capital - n.contributions_cum, year, age, lvTaxOptions
      );
      series.push({
        year,
        age,
        brutto: Math.round(b.capital - bTax),
        netto: Math.round(n.capital - nTax - honorar),
      });
    }

    return {
      years,
      total_contributions: Math.round(brutto.total_contributions),
      honorar,
      brutto_gross: Math.round(brutto.gross_capital),
      brutto_net: Math.round(bruttoNet),
      brutto_costs: Math.round(brutto.costs.total),
      brutto_riy:
        Math.round(reductionInYield(brutto.gross_capital, annualReturn, stream) * 100) / 100,
      netto_gross: Math.round(netto.gross_capital),
      netto_net: Math.round(nettoNet),
      netto_costs: Math.round(netto.costs.total + honorar),
      netto_riy:
        Math.round(reductionInYield(netto.gross_capital, annualReturn, stream) * 100) / 100,
      advantage: Math.round(nettoNet - bruttoNet),
      series,
    };
  }, [formData]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6" data-pdf-root>
        {/* Header */}
        <div className="flex items-center justify-between" data-pdf-hide>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Netto- vs. Bruttopolice</h1>
              <p className="text-slate-600 mt-1">
                Honorarberatung: Nettotarif + Beratungshonorar gegen klassischen Courtagetarif
              </p>
            </div>
          </div>
          <Button
            onClick={openDialog}
            disabled={isExporting}
            className="bg-slate-800 hover:bg-slate-700 text-white"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? "Exportiere…" : "PDF"}
          </Button>
        </div>

        {/* Eingaben */}
        <div data-pdf-section="eingaben">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Handshake className="w-4 h-4 text-blue-600" />
                </div>
                Eingaben
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Geburtsjahr</Label>
                  <NumericInput value={formData.birth_year}
                    onChange={(v) => updateFormData("birth_year", v)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Monatlicher Beitrag (€)</Label>
                  <NumericInput value={formData.monthly_contribution}
                    onChange={(v) => updateFormData("monthly_contribution", v)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Laufzeit (Jahre)</Label>
                  <NumericInput value={formData.contract_duration_years}
                    onChange={(v) => updateFormData("contract_duration_years", v)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Rendite p.a. (%)</Label>
                  <NumericInput step={0.1} value={formData.assumed_annual_return}
                    onChange={(v) => updateFormData("assumed_annual_return", v)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Beitragsdynamik p.a. (%)</Label>
                  <NumericInput step={0.5} value={formData.dynamik_percent}
                    onChange={(v) => updateFormData("dynamik_percent", v)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Fondskosten TER p.a. (%)</Label>
                  <NumericInput step={0.05} value={formData.lv_fund_ongoing_costs_percent}
                    onChange={(v) => updateFormData("lv_fund_ongoing_costs_percent", v)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                  <p className="text-sm font-semibold text-slate-900">Bruttopolice (Courtagetarif)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Abschlusskosten (€)</Label>
                      <NumericInput value={formData.brutto_acquisition_costs_eur}
                        onChange={(v) => updateFormData("brutto_acquisition_costs_eur", v)} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Verwaltung (€/Monat)</Label>
                      <NumericInput step={0.5} value={formData.brutto_admin_monthly_eur}
                        onChange={(v) => updateFormData("brutto_admin_monthly_eur", v)} className={inputClass} />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                  <p className="text-sm font-semibold text-slate-900">Nettopolice (Honorartarif)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Beratungshonorar (€, einmalig)</Label>
                      <NumericInput value={formData.honorar_eur}
                        onChange={(v) => updateFormData("honorar_eur", v)} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Verwaltung (€/Monat)</Label>
                      <NumericInput step={0.5} value={formData.netto_admin_monthly_eur}
                        onChange={(v) => updateFormData("netto_admin_monthly_eur", v)} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ergebnis */}
        <div data-pdf-section="ergebnis">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="text-xs text-slate-500 mb-1">Bruttopolice (netto nach Steuern)</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(results.brutto_net)}</div>
                <div className="text-sm text-slate-600 mt-1">
                  Kosten {formatCurrency(results.brutto_costs)} · Effektivkosten{" "}
                  {results.brutto_riy.toLocaleString("de-DE", { minimumFractionDigits: 2 })} %-Pkt. p.a.
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <div className="text-xs text-slate-500 mb-1">Nettopolice (netto, inkl. Honorar-Abzug)</div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(results.netto_net)}</div>
                <div className="text-sm text-slate-600 mt-1">
                  Kosten inkl. Honorar {formatCurrency(results.netto_costs)} · Effektivkosten{" "}
                  {results.netto_riy.toLocaleString("de-DE", { minimumFractionDigits: 2 })} %-Pkt. p.a.
                </div>
              </CardContent>
            </Card>
            <Card className={`border-0 shadow-lg ${results.advantage >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <CardContent className="p-6">
                <div className="text-xs text-slate-500 mb-1">Vorteil Nettopolice</div>
                <div className={`text-2xl font-bold ${results.advantage >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatCurrency(results.advantage)}
                </div>
                <div className="text-sm text-slate-600 mt-1">
                  Beiträge gesamt {formatCurrency(results.total_contributions)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Verlauf */}
        <div data-pdf-section="verlauf">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-slate-900">
                Verlauf (netto nach Steuern)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-90 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.series} margin={{ top: 10, right: 20, left: 10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatChartAxis} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        formatCurrency(Number(value || 0)),
                        name === "netto" ? "Nettopolice" : "Bruttopolice",
                      ]}
                      labelFormatter={(year: any) => {
                        const p = results.series.find((x) => x.year === Number(year));
                        return p ? `Jahr ${year} (Alter ${p.age})` : `Jahr ${year}`;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="netto" name="Nettopolice" stroke="#2563eb"
                      strokeWidth={3} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="brutto" name="Bruttopolice" stroke="#f59e0b"
                      strokeWidth={3} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-slate-600 mt-3">
                Beide Läufe mit identischen Beiträgen, Fonds und Steuerregeln (Halbeinkünfte-Qualifikation
                je Laufzeitjahr geprüft). Das Beratungshonorar wird separat gezahlt und ohne
                Verzinsungseffekt von der Nettopolice abgezogen.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {dialogOpen && (
        <PDFSectionDialog
          sections={[
            { id: "eingaben", label: "Eingaben" },
            { id: "ergebnis", label: "Ergebnis" },
            { id: "verlauf", label: "Verlauf" },
          ]}
          isExporting={isExporting}
          onExport={(ids) =>
            doExport(ids, "netto-vs-bruttopolice", "Netto- vs. Bruttopolice")
          }
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
