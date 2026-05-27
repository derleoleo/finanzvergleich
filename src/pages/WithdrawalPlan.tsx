import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet, AlertCircle, FileDown, Calendar, TrendingUp, Copy, Info, Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocalStorage } from "@/utils/useLocalStorage";
import { UserDefaults } from "@/entities/UserDefaults";
import { Calculation } from "@/entities/Calculation";
import { SinglePaymentCalculation } from "@/entities/SinglePaymentCalculation";
import { BestAdviceCalculation } from "@/entities/BestAdviceCalculation";
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";
import SummaryCard from "@/components/results/SummaryCard";
import SummaryGrid from "@/components/results/SummaryGrid";
import WithdrawalChart from "@/components/withdrawal/WithdrawalChart";
import WithdrawalTable from "@/components/withdrawal/WithdrawalTable";

type AnyCalc = any;

export default function WithdrawalPlan() {
  const _wd = UserDefaults.load();
  const endAge = _wd.withdrawal_end_age ?? 85;
  const { isPaid } = useSubscription();
  const [showPDFUpgrade, setShowPDFUpgrade] = useState(false);
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  const [allCalculations, setAllCalculations] = useState<AnyCalc[]>([]);
  const [selectedCalculation, setSelectedCalculation] = useState<AnyCalc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Persistent state (localStorage keys kept identical for backward compat)
  const [manualStartCapital, setManualStartCapital] = useLocalStorage<string>("wp_manualStartCapital", "");
  const [selectedCalcId, setSelectedCalcId] = useLocalStorage<string>("wp_selectedCalcId", "");
  const [customWithdrawal, setCustomWithdrawal] = useLocalStorage<number>("wp_customWithdrawal", _wd.withdrawal_amount);
  const [customAnnualReturn, setCustomAnnualReturn] = useLocalStorage<number>("wp_customAnnualReturn", 6.0);
  const [startAge, setStartAge] = useLocalStorage<number>("wp_startAge", _wd.withdrawal_start_age);
  const [isDetailMode, setIsDetailMode] = useLocalStorage<boolean>("wp_isDetailMode", false);
  const [specialWithdrawals, setSpecialWithdrawals] = useLocalStorage<Record<number, number>>("wp_specialWithdrawals", {});

  const [withdrawalData, setWithdrawalData] = useState<any[]>([]);

  useEffect(() => {
    if (!isDetailMode) setSpecialWithdrawals({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailMode]);

  const getNetResultFromCalc = (calc: AnyCalc): number => {
    if (!calc?.results) return 0;
    if (calc.results.life_insurance_net !== undefined)
      return Math.max(calc.results.life_insurance_net, calc.results.depot_net);
    if (calc.results.fund_net !== undefined)
      return Math.max(calc.results.lv_net, calc.results.fund_net, calc.results.fixed_deposit_net, calc.results.current_account_net);
    if (calc.results.existing_lv_net !== undefined)
      return Math.max(calc.results.existing_lv_net, calc.results.new_lv_net);
    return 0;
  };

  const getAssumedReturnFromCalc = (calc: AnyCalc): number =>
    calc?.assumed_annual_return ?? calc?.lv_expected_return ?? calc?.fund_expected_return ?? 6.0;

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
      if (selectedCalcId) {
        const found = all.find((c) => c.id === selectedCalcId);
        if (found) setSelectedCalculation(found);
      }
      setIsLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCapital = parseFloat(manualStartCapital) || getNetResultFromCalc(selectedCalculation) || 0;
  const annualReturnFraction = customAnnualReturn / 100;
  const maxAnnualWithdrawal = startCapital > 0 && annualReturnFraction > 0 ? startCapital * annualReturnFraction : 0;
  const maxMonthlyWithdrawal = maxAnnualWithdrawal / 12;

  const calculateWithdrawalPlan = useCallback(() => {
    if (startAge >= endAge) {
      setWithdrawalData(startCapital > 0 ? [{
        year: 0, age: startAge,
        startCapital: Math.round(startCapital), withdrawal: Math.round(startCapital),
        growth: 0, endCapital: 0, totalWithdrawn: Math.round(startCapital), isLastYear: true,
      }] : []);
      return;
    }
    if (startCapital === 0) { setWithdrawalData([]); return; }

    const ar = customAnnualReturn / 100;
    let capital = startCapital;
    const data: any[] = [];
    let yearIndex = 0;
    let totalWithdrawn = 0;

    const initialGrowth = capital * ar;
    capital += initialGrowth;
    data.push({
      year: 0, age: startAge,
      startCapital: Math.round(startCapital), withdrawal: 0,
      growth: Math.round(initialGrowth), endCapital: Math.round(capital), totalWithdrawn: 0,
    });

    while (yearIndex < endAge - startAge && capital > 0) {
      yearIndex++;
      const currentAge = startAge + yearIndex;
      const startYearCapital = capital;
      const isLastYearOfPlan = currentAge === endAge;
      const special = isDetailMode ? specialWithdrawals[yearIndex] : undefined;
      const withdrawalAmount = isLastYearOfPlan ? startYearCapital : (special ?? customWithdrawal);
      const actualWithdrawal = Math.min(withdrawalAmount, startYearCapital);
      const capitalAfterWithdrawal = startYearCapital - actualWithdrawal;
      const growth = capitalAfterWithdrawal * ar;
      capital = capitalAfterWithdrawal + growth;
      totalWithdrawn += actualWithdrawal;

      data.push({
        year: yearIndex, age: currentAge,
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
  }, [startCapital, customWithdrawal, customAnnualReturn, specialWithdrawals, startAge, isDetailMode, endAge]);

  useEffect(() => { calculateWithdrawalPlan(); }, [calculateWithdrawalPlan]);

  const handleSpecialWithdrawalChange = (year: number, amount: string) => {
    if (!isDetailMode) return;
    setSpecialWithdrawals((prev) => ({ ...prev, [year]: parseFloat(amount) || 0 }));
  };

  const handlePDFClick = () => {
    if (!isPaid) { setShowPDFUpgrade(true); return; }
    openDialog();
  };

  const fmt = (amount: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount ?? 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Lädt Entnahmeplan…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div id="pdf-content" className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Entnahmeplan</h1>
                <p className="text-slate-600 mt-1">Simulation der Kapitalentnahme über die Jahre</p>
              </div>
            </div>
            {withdrawalData.length > 0 && (
              <Button
                onClick={handlePDFClick}
                className="w-full md:w-auto bg-slate-800 hover:bg-slate-700"
                data-pdf-hide
              >
                <FileDown className="w-4 h-4 mr-2" />
                Als PDF exportieren
              </Button>
            )}
          </div>

          {/* Body: settings | results */}
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">

            {/* Settings */}
            <div data-pdf-hide>
              <Card className="border-0 shadow-lg bg-white">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-slate-900">Einstellungen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">

                  {/* Berechnung auswählen */}
                  <div className="space-y-2">
                    <Label>Berechnung als Basis</Label>
                    <Select
                      value={selectedCalcId}
                      onValueChange={(id) => {
                        const calc = allCalculations.find((c) => c.id === id);
                        if (calc) {
                          setSelectedCalculation(calc);
                          setSelectedCalcId(id);
                          setManualStartCapital("");
                          setCustomAnnualReturn(getAssumedReturnFromCalc(calc));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={allCalculations.length === 0 ? "Keine gespeicherten Berechnungen" : "Berechnung auswählen…"} />
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

                  {/* Manuelles Startkapital */}
                  <div className="space-y-2">
                    <Label htmlFor="manualCapital">Manuelles Startkapital (€)</Label>
                    <Input
                      id="manualCapital"
                      type="number"
                      placeholder="z.B. 250000"
                      value={manualStartCapital}
                      onChange={(e) => {
                        setManualStartCapital(e.target.value);
                        setSelectedCalculation(null);
                        setSelectedCalcId("");
                      }}
                      className="bg-slate-50 border-slate-200"
                    />
                  </div>

                  {/* Rendite & Beginn-Alter */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customAnnualReturn">Rendite p.a. (%)</Label>
                      <NumericInput
                        id="customAnnualReturn"
                        step="0.1"
                        value={customAnnualReturn}
                        onChange={(v) => setCustomAnnualReturn(v)}
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startAge">Beginn-Alter</Label>
                      <NumericInput
                        id="startAge"
                        value={startAge}
                        onChange={(v) => setStartAge(v)}
                        className="bg-slate-50 border-slate-200"
                      />
                      <p className="text-xs text-slate-500">bis Alter {endAge}</p>
                    </div>
                  </div>

                  {/* Expertenmodus */}
                  <div className="flex items-center space-x-2">
                    <Switch id="detail-mode" checked={isDetailMode} onCheckedChange={setIsDetailMode} />
                    <Label htmlFor="detail-mode">Expertenmodus (Sonderentnahmen)</Label>
                  </div>

                  {!isDetailMode ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="withdrawal">Jährliche Entnahme (€)</Label>
                        <NumericInput
                          id="withdrawal"
                          step="1000"
                          value={customWithdrawal}
                          onChange={(v) => setCustomWithdrawal(v)}
                          className="bg-slate-50 border-slate-200"
                        />
                      </div>
                      {startCapital > 0 && annualReturnFraction > 0 && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-yellow-700 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-yellow-800">Tipp: Kapitalerhalt</p>
                              <p className="text-xs text-yellow-700 mt-0.5">
                                Max. monatlich: <strong>{fmt(maxMonthlyWithdrawal)}</strong>
                              </p>
                              <Button
                                variant="outline" size="sm"
                                className="mt-2 text-xs bg-white hover:bg-yellow-100 border-yellow-300 text-yellow-800"
                                onClick={() => setCustomWithdrawal(Math.round(maxAnnualWithdrawal))}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Jährlichen Wert übernehmen
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800 flex items-center gap-2">
                        <Pencil className="w-4 h-4" />
                        Entnahmen direkt in der Tabelle bearbeiten.
                      </p>
                    </div>
                  )}

                  {/* Berechnungslogik */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <h4 className="font-medium text-slate-800 mb-1.5 text-sm flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Berechnungslogik
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-0.5">
                      <li>• <strong>Jahr 0:</strong> Startkapital wächst ohne Entnahme</li>
                      <li>• <strong>Ab Jahr 1:</strong> Entnahme zu Jahresbeginn, dann Verzinsung</li>
                      <li>• <strong>Alter {endAge}:</strong> Komplettentnahme des Restkapitals</li>
                    </ul>
                  </div>

                </CardContent>
              </Card>
            </div>

            {/* Results */}
            <div>
              {startCapital === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                  <h2 className="text-xl font-bold text-slate-700 mb-2">Kein Startkapital</h2>
                  <p className="text-slate-500 text-sm">
                    Bitte ein Startkapital eingeben oder eine Berechnung auswählen.
                  </p>
                </div>
              ) : (
                <>
                  <div data-pdf-section="zusammenfassung">
                    <SummaryGrid>
                      <SummaryCard
                        title="Startkapital"
                        value={fmt(startCapital)}
                        subtext={`Alter: ${startAge}`}
                        icon={<Wallet className="w-5 h-5" />}
                        tone="neutral"
                      />
                      <SummaryCard
                        title="Entnahmezeitraum"
                        value={`${Math.max(0, withdrawalData.length - 1)} Jahre`}
                        subtext={`Bis Alter: ${withdrawalData[withdrawalData.length - 1]?.age ?? endAge}`}
                        icon={<Calendar className="w-5 h-5" />}
                        tone="info"
                      />
                      <SummaryCard
                        title="Gesamtentnahme"
                        value={fmt(withdrawalData[withdrawalData.length - 1]?.totalWithdrawn ?? 0)}
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

                  <div data-pdf-section="verlauf" data-pdf-single-col className="grid lg:grid-cols-2 gap-8 mt-8">
                    <WithdrawalChart data={withdrawalData} />
                    <WithdrawalTable
                      data={withdrawalData}
                      isDetailMode={isDetailMode}
                      onSpecialWithdrawalChange={handleSpecialWithdrawalChange}
                    />
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {showPDFUpgrade && (
        <UpgradePrompt
          title="PDF-Export"
          description="PDF-Export ist nur im Premium-Plan verfügbar."
          onClose={() => setShowPDFUpgrade(false)}
        />
      )}

      {dialogOpen && (
        <PDFSectionDialog
          sections={[
            { id: "zusammenfassung", label: "Zusammenfassung" },
            { id: "verlauf", label: "Verlauf & Tabelle" },
          ]}
          isExporting={isExporting}
          onExport={(ids) => doExport(ids, "entnahmeplan", "Entnahmeplan")}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
