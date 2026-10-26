// src/components/calculator/InsuranceInputs.tsx

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Shield, Percent } from "lucide-react";
import MultiFundEditor, { type FundEntry } from "./MultiFundEditor";

import { toNum as toNumber } from "@/utils";
import { buildLvCostBreakdownActual } from "@/components/shared/CostBreakdown";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";

type InsuranceFormData = {
  contract_duration_years?: number;
  life_insurance_acquisition_costs_eur?: number;
  lv_admin_costs_monthly_eur?: number;
  lv_cost_type?: "eur" | "percent";
  lv_effective_costs_percent?: number;
  lv_funds?: FundEntry[];
  monthly_contribution?: number;
  lump_sum?: number;
};

type Props = {
  formData: InsuranceFormData;
  updateFormData: (field: string, value: unknown) => void;
};


export default function InsuranceInputs({ formData, updateFormData }: Props) {
  const contractYears = toNumber(formData.contract_duration_years);
  const contractMonths = Math.max(1, Math.floor(contractYears * 12));

  const acquisitionEur = toNumber(
    formData.life_insurance_acquisition_costs_eur
  );
  const adminMonthlyEur = toNumber(formData.lv_admin_costs_monthly_eur);

  const actualBreakdown = useMemo(() => {
    if (formData.lv_cost_type !== "eur") return null;
    return buildLvCostBreakdownActual({
      contractMonths,
      acquisitionTotal: acquisitionEur,
      adminMonthly: adminMonthlyEur,
    });
  }, [formData.lv_cost_type, contractMonths, acquisitionEur, adminMonthlyEur]);

  return (
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
        {/* Kostentyp */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-medium text-slate-700">
              Kostentyp
            </Label>
            <SegmentedToggle
              ariaLabel="Kostentyp"
              value={formData.lv_cost_type === "percent" ? "percent" : "eur"}
              onChange={(wert) => updateFormData("lv_cost_type", wert)}
              options={[
                { value: "eur", label: "Tatsächliche Kosten (€)" },
                { value: "percent", label: "Effektivkosten (%)" },
              ]}
            />
          </div>

          {/* EUR = tatsächliche Kosten */}
          {formData.lv_cost_type === "eur" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="life_insurance_acquisition_costs_eur"
                  className="text-sm font-medium text-slate-700"
                >
                  Abschluss- und Vertriebskosten gesamt (€)
                </Label>
                <NumericInput
                  id="life_insurance_acquisition_costs_eur"
                  value={formData.life_insurance_acquisition_costs_eur ?? 0}
                  onChange={(val) =>
                    updateFormData("life_insurance_acquisition_costs_eur", val)
                  }
                  className="bg-white border-slate-300 focus:border-blue-500 focus:bg-white transition-all duration-200"
                />
                <p className="text-xs text-slate-500">
                  Wird gezillmert über die ersten 5 Jahre (max. 60 Monate).
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="lv_admin_costs_monthly_eur"
                  className="text-sm font-medium text-slate-700"
                >
                  Verwaltungskosten (€ pro Monat)
                </Label>
                <NumericInput
                  id="lv_admin_costs_monthly_eur"
                  step="0.01"
                  value={formData.lv_admin_costs_monthly_eur ?? 0}
                  onChange={(val) =>
                    updateFormData("lv_admin_costs_monthly_eur", val)
                  }
                  className="bg-white border-slate-300 focus:border-blue-500 focus:bg-white transition-all duration-200 md:w-1/2"
                />
                <p className="text-xs text-slate-500">
                  Läuft monatlich über die komplette Vertragslaufzeit.
                </p>
              </div>

              {/* Kosten-Aufschlüsselung Preview */}
              {actualBreakdown && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-800">
                      Kosten-Aufschlüsselung (Vorschau)
                    </div>
                    <div className="text-xs text-slate-500">
                      Laufzeit: {contractYears || 0} Jahre
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="text-blue-700 font-medium">
                        Abschluss/Vertrieb
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-600">Gesamt:</span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(actualBreakdown.upfront.total)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">
                          Monat 1–{actualBreakdown.upfront.months}:
                        </span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(actualBreakdown.upfront.perMonth)}
                          /Monat
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="text-slate-700 font-medium">
                        Verwaltung
                      </div>
                      <div className="mt-1">
                        <span className="text-slate-600">Monatlich:</span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(actualBreakdown.ongoing.perMonth)}
                          /Monat
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Gesamt:</span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(actualBreakdown.ongoing.total)}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                      <div className="text-emerald-700 font-medium">Summe</div>
                      <div className="mt-1">
                        <span className="text-slate-600">Monat 1–60:</span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(
                            actualBreakdown.totals.perMonthYears1to5
                          )}
                          /Monat
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">danach:</span>{" "}
                        <span className="font-semibold">
                          {formatCurrency(
                            actualBreakdown.totals.perMonthAfter5y
                          )}
                          /Monat
                        </span>
                      </div>
                      <div className="border-t border-emerald-200 mt-2 pt-2">
                        <span className="text-slate-600">Gesamt:</span>{" "}
                        <span className="font-bold">
                          {formatCurrency(actualBreakdown.totals.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    Hinweis: Fondskosten (TER) werden separat über den LV-Fonds
                    berücksichtigt.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* PERCENT = Effektivkosten */
            <div className="space-y-3">
              <div className="space-y-2">
                <Label
                  htmlFor="lv_effective_costs_percent"
                  className="text-sm font-medium text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Effektivkosten p.a. (%)
                  </div>
                </Label>
                <NumericInput
                  id="lv_effective_costs_percent"
                  step="0.01"
                  value={formData.lv_effective_costs_percent ?? 0}
                  onChange={(val) =>
                    updateFormData("lv_effective_costs_percent", val)
                  }
                  className="bg-white border-slate-300 focus:border-blue-500 focus:bg-white transition-all duration-200"
                />
                <p className="text-xs text-slate-500">
                  Jährliche Renditeminderung durch Vertragskosten (ohne
                  Fondskosten).
                </p>
              </div>

              {/* Früher stand hier eine Aufteilung in „anfangsnah“ und
                  „laufend“ (70/30 bzw. 60/40) samt modellierter Zeiträume.
                  Die Rechnung kennt diese Aufteilung nicht: Im Prozentmodus
                  zieht sie den Wert als Renditeminderung über die ganze
                  Laufzeit ab (PRIIPs). Eine Oberfläche, die mehr behauptet,
                  als gerechnet wird, führt die Beratung in die Irre. */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 space-y-1">
                <p>
                  Der Wert wirkt über die ganze Laufzeit als Abschlag auf die
                  Rendite, nicht als fester Euro-Abzug.
                </p>
                <p>
                  Wie er sich auf Abschluss- und Verwaltungskosten verteilt,
                  bleibt offen – diese Angabe enthält es nicht. Soll die
                  Aufteilung in Ergebnis und Grafik erscheinen, geben Sie die
                  tatsächlichen Kosten in Euro ein.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fonds innerhalb der LV */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Fonds innerhalb der LV-Police
            </div>
          </Label>
          <MultiFundEditor
            funds={formData.lv_funds || []}
            totalAmount={toNumber(
              formData.monthly_contribution ?? formData.lump_sum ?? 0
            )}
            allocationLabel={
              formData.monthly_contribution !== undefined
                ? "Monatl. Einzelbeitrag (€)"
                : "Einzelbetrag (€)"
            }
            mode="lv"
            onChange={(funds) => updateFormData("lv_funds", funds)}
          />
        </div>

        {/* Steuerblock */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="font-medium text-amber-800 mb-2">
            Steuerliche Behandlung
          </h4>
          <p className="text-sm text-amber-700">
            Bei Verträgen ≥12 Jahre und Auszahlung nach dem 62. Lebensjahr gilt
            das <strong>Halbeinkünfteverfahren</strong> (50 % × 85 % = 42,5 %
            der Erträge steuerpflichtig, persönlicher Steuersatz). Andernfalls
            volle Besteuerung.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
