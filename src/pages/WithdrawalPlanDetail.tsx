import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Wallet,
  AlertCircle,
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
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";

export default function WithdrawalPlanDetail() {
  const navigate = useNavigate();
  const _wd = UserDefaults.load();
  const endAge = _wd.withdrawal_end_age ?? 85;
  const { isPaid } = useSubscription();
  const [showPDFUpgrade, setShowPDFUpgrade] = useState(false);
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  // Read shared state from localStorage (written by WithdrawalPlan.tsx)
  const [manualStartCapital] = useLocalStorage<string>("wp_manualStartCapital", "");
  const [customWithdrawal, setCustomWithdrawal] = useLocalStorage<number>(
    "wp_customWithdrawal",
    _wd.withdrawal_amount
  );
  const [customAnnualReturn] = useLocalStorage<number>("wp_customAnnualReturn", 6.0);
  const [startAge] = useLocalStorage<number>("wp_startAge", _wd.withdrawal_start_age);
  const [isDetailMode] = useLocalStorage<boolean>("wp_isDetailMode", false);
  const [specialWithdrawals, setSpecialWithdrawals] = useLocalStorage<Record<number, number>>(
    "wp_specialWithdrawals",
    {}
  );

  const [withdrawalData, setWithdrawalData] = useState<any[]>([]);

  const startCapital = parseFloat(manualStartCapital) || 0;

  const calculateWithdrawalPlan = useCallback(() => {
    const initialStartCapital = startCapital;

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
    const yearsToCalculate = endAge - startAge;

    let capital = initialStartCapital;
    const data: any[] = [];
    let yearIndex = 0;
    let totalWithdrawn = 0;
    let currentAge = startAge;

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
      const isLastYearOfPlan = currentAge === endAge;

      let withdrawalAmount: number;
      if (isLastYearOfPlan) {
        withdrawalAmount = startYearCapital;
      } else {
        const special = isDetailMode ? specialWithdrawals[yearIndex] : undefined;
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
  }, [startCapital, customWithdrawal, customAnnualReturn, specialWithdrawals, startAge, isDetailMode, endAge]);

  useEffect(() => {
    calculateWithdrawalPlan();
  }, [calculateWithdrawalPlan]);

  const handleSpecialWithdrawalChange = (year: number, amount: string) => {
    if (!isDetailMode) return;
    const newAmount = parseFloat(amount) || 0;
    setSpecialWithdrawals((prev) => ({ ...prev, [year]: newAmount }));
  };

  const handlePDFClick = () => {
    if (!isPaid) { setShowPDFUpgrade(true); return; }
    openDialog();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);

  if (startCapital === 0) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Kein Startkapital</h2>
          <p className="text-slate-600 mb-6">
            Bitte geben Sie zuerst ein Startkapital in den Einstellungen ein.
          </p>
          <Button
            onClick={() => navigate(createPageUrl("WithdrawalPlan"))}
            className="bg-slate-800 hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zu den Einstellungen
          </Button>
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
            <div className="flex gap-3 w-full md:w-auto" data-pdf-hide>
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("WithdrawalPlan"))}
                className="flex-1 md:flex-none"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Einstellungen
              </Button>
              {withdrawalData.length > 0 && (
                <Button
                  onClick={handlePDFClick}
                  className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Als PDF exportieren
                </Button>
              )}
            </div>
          </div>

          {/* Summary */}
          {withdrawalData.length > 0 && (
            <div data-pdf-section="zusammenfassung">
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
                  subtext={`Bis Alter: ${withdrawalData[withdrawalData.length - 1]?.age ?? endAge}`}
                  icon={<Calendar className="w-5 h-5" />}
                  tone="info"
                />
                <SummaryCard
                  title="Gesamtentnahme"
                  value={formatCurrency(withdrawalData[withdrawalData.length - 1]?.totalWithdrawn ?? 0)}
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

          {/* Chart + Table */}
          {withdrawalData.length > 0 && (
            <div data-pdf-section="verlauf" className="grid lg:grid-cols-2 gap-8 mt-8">
              <WithdrawalChart data={withdrawalData} />
              <WithdrawalTable
                data={withdrawalData}
                isDetailMode={isDetailMode}
                onSpecialWithdrawalChange={handleSpecialWithdrawalChange}
              />
            </div>
          )}
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
