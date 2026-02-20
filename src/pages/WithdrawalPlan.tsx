import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Wallet,
  AlertCircle,
  Pencil,
  Info,
  Copy,
  FileDown,
  Calendar,
  TrendingUp,
} from "lucide-react";
import SummaryCard from "@/components/results/SummaryCard";
import SummaryGrid from "@/components/results/SummaryGrid";

import WithdrawalChart from "@/components/withdrawal/WithdrawalChart";
import WithdrawalTable from "@/components/withdrawal/WithdrawalTable";
import { useLocalStorage } from "@/utils/useLocalStorage";
import { UserDefaults } from "@/entities/UserDefaults";
import { Calculation } from "@/entities/Calculation";
import { SinglePaymentCalculation } from "@/entities/SinglePaymentCalculation";
import { BestAdviceCalculation } from "@/entities/BestAdviceCalculation";
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";

type AnyCalc = any;

export default function WithdrawalPlan() {
  const _wd = UserDefaults.load();
  const endAge = _wd.withdrawal_end_age ?? 85;
  const [allCalculations, setAllCalculations] = useState<AnyCalc[]>([]);
  const [selectedCalculation, setSelectedCalculation] =
    useState<AnyCalc | null>(null);

  // ✅ persistent
  const [manualStartCapital, setManualStartCapital] = useLocalStorage<string>(
    "wp_manualStartCapital",
    ""
  );
  const [customWithdrawal, setCustomWithdrawal] = useLocalStorage<number>(
    "wp_customWithdrawal",
    _wd.withdrawal_amount
  );
  const [customAnnualReturn, setCustomAnnualReturn] = useLocalStorage<number>(
    "wp_customAnnualReturn",
    6.0
  );
  const [startAge, setStartAge] = useLocalStorage<number>("wp_startAge", _wd.withdrawal_start_age);
  const [isDetailMode, setIsDetailMode] = useLocalStorage<boolean>(
    "wp_isDetailMode",
    false
  );
  const [specialWithdrawals, setSpecialWithdrawals] = useLocalStorage<
    Record<number, number>
  >("wp_specialWithdrawals", {});

  const [withdrawalData, setWithdrawalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  const getNetResultFromCalc = (calc: AnyCalc) => {
    if (!calc || !calc.results) return 0;

    if (calc.results.life_insurance_net !== undefined) {
      return Math.max(calc.results.life_insurance_net, calc.results.depot_net);
    }
    if (calc.results.fund_net !== undefined) {
      return Math.max(
        calc.results.lv_net,
        calc.results.fund_net,
        calc.results.fixed_deposit_net,
        calc.results.current_account_net
      );
    }
    if (calc.results.existing_lv_net !== undefined) {
      return Math.max(calc.results.existing_lv_net, calc.results.new_lv_net);
    }
    return 0;
  };

  const getAssumedReturnFromCalc = (calc: AnyCalc) => {
    if (!calc) return 6.0;
    return (
      calc.assumed_annual_return ??
      calc.lv_expected_return ??
      calc.fund_expected_return ??
      6.0
    );
  };

  // ✅ WICHTIG: Wenn Expertenmodus AUS -> Sonderentnahmen löschen (und damit "refresh")
  useEffect(() => {
    if (!isDetailMode) {
      // Reset Sonderentnahmen, damit wieder reine Pauschalentnahme gilt
      setSpecialWithdrawals({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailMode]);

  const calculateWithdrawalPlan = useCallback(() => {
    const initialStartCapital =
      parseFloat(manualStartCapital) ||
      getNetResultFromCalc(selectedCalculation) ||
      0;

    // Startalter >= Ende-Alter -> nur Komplettentnahme sinnvoll
    if (startAge >= endAge) {
      if (initialStartCapital > 0) {
        setWithdrawalData([
          {
            year: 0,
            age: startAge,
            startCapital: Math.round(initialStartCapital),
            withdrawal: Math.round(initialStartCapital),
            growth: 0,
            endCapital: 0,
            totalWithdrawn: Math.round(initialStartCapital),
            isLastYear: true,
          },
        ]);
      } else {
        setWithdrawalData([]);
      }
      return;
    }

    if (initialStartCapital === 0) {
      setWithdrawalData([]);
      return;
    }

    const annualReturn = customAnnualReturn / 100;
    const maxRetirementAge = endAge;
    const yearsToCalculate = maxRetirementAge - startAge;

    let capital = initialStartCapital;
    const data: any[] = [];
    let yearIndex = 0;
    let totalWithdrawn = 0;
    let currentAge = startAge;

    // Jahr 0: Wachstum ohne Entnahme
    const initialGrowth = capital * annualReturn;
    capital = capital + initialGrowth;

    data.push({
      year: yearIndex,
      age: currentAge,
      startCapital: Math.round(initialStartCapital),
      withdrawal: 0,
      growth: Math.round(initialGrowth),
      endCapital: Math.round(capital),
      totalWithdrawn: 0,
    });

    while (yearIndex < yearsToCalculate && capital > 0) {
      yearIndex++;
      currentAge = startAge + yearIndex;
      const startYearCapital = capital;

      const isLastYearOfPlan = currentAge === maxRetirementAge;

      let withdrawalAmount: number;

      if (isLastYearOfPlan) {
        withdrawalAmount = startYearCapital; // Komplettentnahme zu Jahresbeginn
      } else {
        // ✅ Korrektur: Sonderentnahmen NUR im Expertenmodus verwenden,
        // ansonsten ausschließlich Pauschalentnahme
        const special = isDetailMode
          ? specialWithdrawals[yearIndex]
          : undefined;
        withdrawalAmount = special ?? customWithdrawal;
      }

      const actualWithdrawal = Math.min(withdrawalAmount, startYearCapital);
      const capitalAfterWithdrawal = startYearCapital - actualWithdrawal;

      const growth = capitalAfterWithdrawal * annualReturn;
      capital = capitalAfterWithdrawal + growth;
      totalWithdrawn += actualWithdrawal;

      data.push({
        year: yearIndex,
        age: currentAge,
        startCapital: Math.round(Math.max(0, startYearCapital)),
        withdrawal: Math.round(actualWithdrawal),
        growth: Math.round(Math.max(0, growth)),
        endCapital: Math.round(Math.max(0, capital)),
        totalWithdrawn: Math.round(totalWithdrawn),
        isLastYear: isLastYearOfPlan,
      });

      if (capital <= 0 || isLastYearOfPlan) break;
    }

    setWithdrawalData(data);
  }, [
    selectedCalculation,
    manualStartCapital,
    customWithdrawal,
    customAnnualReturn,
    specialWithdrawals,
    startAge,
    isDetailMode,
  ]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const [calcs, singles, bestAdvices] = await Promise.all([
        Calculation.list("-created_date"),
        SinglePaymentCalculation.list("-created_date"),
        BestAdviceCalculation.list("-created_date"),
      ]);

      const all = [
        ...calcs.filter((c) => c.results).map((c) => ({ ...c, _type: "Sparvertrag" })),
        ...singles.filter((c) => c.results).map((c) => ({ ...c, _type: "Einmalanlage" })),
        ...bestAdvices.filter((c) => c.results).map((c) => ({ ...c, _type: "BestAdvice" })),
      ];

      setAllCalculations(all);
      setIsLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    calculateWithdrawalPlan();
  }, [calculateWithdrawalPlan]);

  const handleSpecialWithdrawalChange = (year: number, amount: string) => {
    // ✅ Nur im Expertenmodus Änderungen übernehmen
    if (!isDetailMode) return;
    const newAmount = parseFloat(amount) || 0;
    setSpecialWithdrawals((prev) => ({ ...prev, [year]: newAmount }));
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);

  const startCapital =
    parseFloat(manualStartCapital) ||
    getNetResultFromCalc(selectedCalculation) ||
    0;
  const annualReturn = customAnnualReturn / 100;

  /**
   * ✅ Korrektur Kapitalerhalt:
   * Bei konstanter Entnahme zu Jahresbeginn und anschließender Verzinsung gilt:
   * Damit das Kapital in den Entnahmejahren NICHT wächst (bleibt konstant),
   * muss die Entnahme pro Jahr ungefähr den "Zinsen" entsprechen.
   *
   * Da unser Plan aber Jahr 0 zuerst verzinst (ohne Entnahme), ist der
   * relevante Kapitalwert ab Jahr 1 bereits "Startkapital nach Jahr-0-Wachstum".
   * Genau daraus resultiert praktisch: annual ≈ startCapital * r
   * (und nicht kleiner – sonst wächst das Kapital).
   */
  const maxAnnualWithdrawalForPreservation =
    startCapital > 0 && annualReturn > 0 ? startCapital * annualReturn : 0;
  const maxMonthlyWithdrawalForPreservation =
    maxAnnualWithdrawalForPreservation / 12;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Lädt Entnahmepläne...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div id="pdf-content" className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Entnahmeplan
                  </h1>
                  <p className="text-slate-600 mt-1">
                    Simulation der Kapitalentnahme über die Jahre
                  </p>
                </div>
              </div>

              {withdrawalData.length > 0 && (
                <Button
                  onClick={openDialog}
                  className="w-full md:w-auto"
                  data-pdf-hide
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Als PDF exportieren
                </Button>
              )}
            </div>
          </div>

          <div data-pdf-section="einstellungen">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-slate-900">
                Einstellungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Berechnung als Basis</Label>
                  <Select
                    value={selectedCalculation?.id || ""}
                    onValueChange={(id) => {
                      const calc = allCalculations.find((c) => c.id === id);
                      if (calc) {
                        setSelectedCalculation(calc);
                        setManualStartCapital("");
                        setCustomAnnualReturn(getAssumedReturnFromCalc(calc));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={allCalculations.length === 0 ? "Keine gespeicherten Berechnungen vorhanden" : "Berechnung auswählen..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {allCalculations.map((calc) => (
                        <SelectItem key={calc.id} value={calc.id}>
                          {calc.name} ({calc._type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manualCapital">
                    Manuelles Startkapital (€)
                  </Label>
                  <Input
                    id="manualCapital"
                    type="number"
                    placeholder="z.B. 250000"
                    value={manualStartCapital}
                    onChange={(e) => {
                      setManualStartCapital(e.target.value);
                      setSelectedCalculation(null);
                    }}
                    className="bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              <div className="mt-6 border-t pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="customAnnualReturn">
                      Angenommene Rendite p.a. (%)
                    </Label>
                    <Input
                      id="customAnnualReturn"
                      type="number"
                      step="0.1"
                      value={customAnnualReturn}
                      onChange={(e) =>
                        setCustomAnnualReturn(parseFloat(e.target.value) || 0)
                      }
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startAge">Beginn-Alter</Label>
                    <Input
                      id="startAge"
                      type="number"
                      value={startAge}
                      onChange={(e) =>
                        setStartAge(parseInt(e.target.value) || 65)
                      }
                      className="bg-slate-50 border-slate-200"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Der Plan läuft bis zum {endAge}. Lebensjahr
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="detail-mode"
                    checked={isDetailMode}
                    onCheckedChange={setIsDetailMode}
                  />
                  <Label htmlFor="detail-mode" className="text-base">
                    Expertenmodus (Sonderentnahmen pro Jahr)
                  </Label>
                </div>

                {!isDetailMode ? (
                  <div className="space-y-4">
                    <div className="space-y-2 md:w-1/2">
                      <Label htmlFor="withdrawal">
                        Jährliche Pauschalentnahme (€)
                      </Label>
                      <Input
                        id="withdrawal"
                        type="number"
                        step="1000"
                        value={customWithdrawal}
                        onChange={(e) =>
                          setCustomWithdrawal(parseFloat(e.target.value) || 0)
                        }
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>

                    {startCapital > 0 && annualReturn > 0 && (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg md:w-1/2">
                        <div className="flex items-start gap-3">
                          <Info className="w-5 h-5 text-yellow-700 mt-1 shrink-0" />
                          <div>
                            <h4 className="font-semibold text-yellow-800">
                              Tipp für Kapitalerhalt
                            </h4>
                            <p className="text-sm text-yellow-700 mt-1">
                              Maximale monatliche Entnahme (damit das Kapital
                              nicht anwächst):{" "}
                              <strong>
                                {formatCurrency(
                                  maxMonthlyWithdrawalForPreservation
                                )}
                              </strong>
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-3 bg-white hover:bg-yellow-100 border-yellow-300 text-yellow-800 hover:text-yellow-900"
                              onClick={() =>
                                setCustomWithdrawal(
                                  Math.round(maxAnnualWithdrawalForPreservation)
                                )
                              }
                            >
                              <Copy className="w-3 h-3 mr-2" />
                              Jährlichen Wert übernehmen
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 flex items-center gap-2">
                      <Pencil className="w-4 h-4" /> Sie können jetzt die
                      Entnahmen direkt in der Tabelle unten bearbeiten.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-800 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Berechnungslogik
                  </h4>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>
                      • <strong>Jahr 0:</strong> Startkapital wächst ohne
                      Entnahme
                    </li>
                    <li>
                      • <strong>Ab Jahr 1:</strong> Entnahme zu Jahresbeginn,
                      dann Verzinsung des Restkapitals
                    </li>
                    <li>
                      • <strong>Letztes Jahr (Alter {endAge}):</strong>{" "}
                      Komplettentnahme des Restkapitals
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
          {/* Summary */}
          {/* Summary */}
          {withdrawalData.length > 0 && (
            <div data-pdf-section="zusammenfassung" className="mt-6">
              <SummaryGrid>
                <SummaryCard
                  title="Startkapital"
                  value={formatCurrency(startCapital)}
                  subtext={`Alter: ${startAge}`}
                  icon={<Wallet className="w-5 h-5" />}
                  tone="neutral"
                />

                <SummaryCard
                  title="Entnahmezeitraum"
                  value={`${Math.max(0, withdrawalData.length - 1)} Jahre`}
                  subtext={`Bis Alter: ${
                    withdrawalData[withdrawalData.length - 1]?.age ?? endAge
                  }`}
                  icon={<Calendar className="w-5 h-5" />}
                  tone="info"
                />

                <SummaryCard
                  title="Gesamtentnahme"
                  value={formatCurrency(
                    withdrawalData[withdrawalData.length - 1]?.totalWithdrawn ??
                      0
                  )}
                  subtext="Über die Laufzeit"
                  icon={<TrendingUp className="w-5 h-5" />}
                  tone="warning"
                />

                <SummaryCard
                  title="Rendite p.a."
                  value={`${customAnnualReturn}%`}
                  subtext="Annahme"
                  icon={<TrendingUp className="w-5 h-5" />}
                  tone="success"
                />
              </SummaryGrid>
            </div>
          )}

          {withdrawalData.length > 0 ? (
            <div data-pdf-section="verlauf" className="grid lg:grid-cols-2 gap-8 mt-8">
              <WithdrawalChart data={withdrawalData} />
              <WithdrawalTable
                data={withdrawalData}
                isDetailMode={isDetailMode}
                onSpecialWithdrawalChange={handleSpecialWithdrawalChange}
              />
            </div>
          ) : (
            <div className="text-center py-16">
              <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                Kein Startkapital
              </h2>
              <p className="text-slate-600">
                Bitte geben Sie ein manuelles Startkapital ein.
              </p>
            </div>
          )}
        </div>
    </div>
    {dialogOpen && (
      <PDFSectionDialog
        sections={[
          { id: "zusammenfassung", label: "Zusammenfassung" },
          { id: "verlauf", label: "Verlauf & Tabelle" },
          { id: "einstellungen", label: "Einstellungen", defaultChecked: false },
        ]}
        isExporting={isExporting}
        onExport={(ids) => doExport(ids, "entnahmeplan", "Entnahmeplan")}
        onClose={closeDialog}
      />
    )}
    </>
  );
}
