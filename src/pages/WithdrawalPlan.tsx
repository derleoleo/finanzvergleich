import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet, AlertCircle, FileDown, Calendar, TrendingUp, Copy, Info, Pencil, Save,
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
import { baueEntnahmeplan } from "@/lib/finance/entnahmeplan";
import { WithdrawalPlanEntry } from "@/entities/WithdrawalPlanEntry";
import { modellStempel, type ModellStempel } from "@/lib/finance/modell";
import GespeicherteAuswertung, {
  type GespeicherteKennzahl,
} from "@/components/results/GespeicherteAuswertung";
import { speicherFehlerText } from "@/utils/speicherFehler";
import { FallVersion } from "@/entities/FallVersion";
import Versionsverlauf from "@/components/results/Versionsverlauf";
import { Calculation, type CalculationModel } from "@/entities/Calculation";
import { SinglePaymentCalculation, type SinglePaymentModel } from "@/entities/SinglePaymentCalculation";
import { BestAdviceCalculation, type BestAdviceModel } from "@/entities/BestAdviceCalculation";
import { usePDFExport } from "@/utils/usePDFExport";
import PDFSectionDialog from "@/components/pdf/PDFSectionDialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";
import SummaryCard from "@/components/results/SummaryCard";
import SummaryGrid from "@/components/results/SummaryGrid";
import WithdrawalChart from "@/components/withdrawal/WithdrawalChart";
import WithdrawalTable from "@/components/withdrawal/WithdrawalTable";

// Legacy-Felder (lv_expected_return etc.) stammen aus alten localStorage-Datenformaten
type AnyCalc = (CalculationModel | SinglePaymentModel | BestAdviceModel) & {
  _type?: string;
  lv_expected_return?: number;
  fund_expected_return?: number;
};

/** Alias, damit der Seitencode unverändert von buildPlan sprechen kann. */
const buildPlan = baueEntnahmeplan;

export default function WithdrawalPlan() {
  const _wd = UserDefaults.load();
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
  // Audit N02: Das Endalter war eine reine Voreinstellung und wurde bei jedem
  // Öffnen neu gelesen. Damit hätte eine geänderte Voreinstellung einen
  // gespeicherten Plan rückwirkend verlängert oder verkürzt.
  const [endAge, setEndAge] = useLocalStorage<number>("wp_endAge", _wd.withdrawal_end_age ?? 85);
  const [isDetailMode, setIsDetailMode] = useLocalStorage<boolean>("wp_isDetailMode", false);
  // Audit F15: Entnahmebeginn und Restkapital sind jetzt Entscheidungen,
  // keine stillen Annahmen der Engine.
  const [aufschubJahre, setAufschubJahre] = useLocalStorage<number>("wp_aufschubJahre", 0);
  const [komplettEntnahme, setKomplettEntnahme] = useLocalStorage<boolean>("wp_komplettEntnahme", false);
  const [specialWithdrawals, setSpecialWithdrawals] = useLocalStorage<Record<number, number>>("wp_specialWithdrawals", {});

  // Szenario-Vergleich: zweite Entnahmehöhe nebeneinander darstellen
  const [compareEnabled, setCompareEnabled] = useLocalStorage<boolean>("wp_compareEnabled", false);
  const [compareWithdrawal, setCompareWithdrawal] = useLocalStorage<number>("wp_compareWithdrawal", 0);

  // Speichern (Audit F14): ohne ?id= neu anlegen, mit ?id= aktualisieren
  const [planName, setPlanName] = useState(
    () => `Entnahmeplan ${new Date().toLocaleDateString("de-DE")}`
  );
  const [gespeicherteId, setGespeicherteId] = useState<string | null>(null);
  const [speichertGerade, setSpeichertGerade] = useState(false);
  const [speicherHinweis, setSpeicherHinweis] = useState<string | null>(null);
  // Hochzählen nach dem Speichern, damit der Verlauf die neue Fassung lädt
  const [versionenStand, setVersionenStand] = useState(0);
  // Audit N02: Das Startkapital wurde aus der verknüpften Berechnung neu
  // abgeleitet. Wird jene Berechnung später geändert oder gelöscht, stand im
  // Plan plötzlich eine andere Summe. Beim Speichern wird der Wert daher
  // festgehalten und beim Öffnen wieder eingesetzt.
  const [fixiertesKapital, setFixiertesKapital] = useState<number | null>(null);
  // Audit N03: die beim Speichern gültigen Kennzahlen
  const [gespeicherteErgebnisse, setGespeicherteErgebnisse] =
    useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    WithdrawalPlanEntry.get(id).then((eintrag) => {
      if (!eintrag) return;
      const f = eintrag.form as Record<string, unknown>;
      if (typeof f.manualStartCapital === "string") setManualStartCapital(f.manualStartCapital);
      if (typeof f.selectedCalcId === "string") setSelectedCalcId(f.selectedCalcId);
      if (typeof f.customWithdrawal === "number") setCustomWithdrawal(f.customWithdrawal);
      if (typeof f.customAnnualReturn === "number") setCustomAnnualReturn(f.customAnnualReturn);
      if (typeof f.startAge === "number") setStartAge(f.startAge);
      if (typeof f.endAge === "number") setEndAge(f.endAge);
      if (typeof f.aufschubJahre === "number") setAufschubJahre(f.aufschubJahre);
      if (typeof f.komplettEntnahme === "boolean") setKomplettEntnahme(f.komplettEntnahme);
      if (typeof f.isDetailMode === "boolean") setIsDetailMode(f.isDetailMode);
      if (typeof f.compareEnabled === "boolean") setCompareEnabled(f.compareEnabled);
      if (typeof f.compareWithdrawal === "number") setCompareWithdrawal(f.compareWithdrawal);
      if (f.specialWithdrawals && typeof f.specialWithdrawals === "object") {
        setSpecialWithdrawals(f.specialWithdrawals as Record<number, number>);
      }
      // Ältere Pläne (vor N02) haben kein fixiertes Kapital – dort bleibt es
      // beim abgeleiteten Wert, notfalls aus den gespeicherten Kennzahlen.
      const gespeichert = (eintrag.results ?? null) as Record<string, unknown> | null;
      if (typeof f.startCapital === "number") {
        setFixiertesKapital(f.startCapital);
      } else if (typeof gespeichert?.start_capital === "number") {
        setFixiertesKapital(gespeichert.start_capital as number);
      }
      setGespeicherteErgebnisse(gespeichert);
      setPlanName(eintrag.name);
      setGespeicherteId(eintrag.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDetailMode) setSpecialWithdrawals({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDetailMode]);

  const getNetResultFromCalc = (calc: AnyCalc | null): number => {
    if (!calc?.results) return 0;
    // Legacy-Ergebnisformate haben abweichende Feldnamen – daher lose typisiert lesen
    const r = calc.results as unknown as Partial<Record<string, number>>;
    if (r.life_insurance_net !== undefined)
      return Math.max(r.life_insurance_net, r.depot_net ?? 0);
    if (r.fund_net !== undefined)
      return Math.max(r.lv_net ?? 0, r.fund_net, r.fixed_deposit_net ?? 0, r.current_account_net ?? 0);
    if (r.existing_lv_net !== undefined)
      return Math.max(r.existing_lv_net, r.new_lv_net ?? 0);
    return 0;
  };

  const getAssumedReturnFromCalc = (calc: AnyCalc | null): number =>
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

  // Reihenfolge: manuelle Eingabe → beim Speichern fixierter Wert → verknüpfte Berechnung
  const abgeleitetesKapital = getNetResultFromCalc(selectedCalculation);
  const manuellesKapital = parseFloat(manualStartCapital);
  const startCapital =
    (Number.isFinite(manuellesKapital) ? manuellesKapital : 0) || fixiertesKapital || abgeleitetesKapital || 0;
  // Die verknüpfte Berechnung liefert heute etwas anderes als beim Speichern
  const kapitalAbweichung =
    fixiertesKapital !== null &&
    !Number.isFinite(manuellesKapital) &&
    abgeleitetesKapital > 0 &&
    Math.abs(abgeleitetesKapital - fixiertesKapital) > 1;
  const annualReturnFraction = customAnnualReturn / 100;
  const maxAnnualWithdrawal = startCapital > 0 && annualReturnFraction > 0 ? startCapital * annualReturnFraction : 0;
  const maxMonthlyWithdrawal = maxAnnualWithdrawal / 12;

  const withdrawalData = useMemo(
    () => buildPlan({
      startCapital,
      annualWithdrawal: customWithdrawal,
      annualReturnPercent: customAnnualReturn,
      startAge,
      endAge,
      specialWithdrawals: isDetailMode ? specialWithdrawals : undefined,
      aufschubJahre,
      komplettentnahmeAmEnde: komplettEntnahme,
    }),
    [startCapital, customWithdrawal, customAnnualReturn, startAge, endAge, isDetailMode,
     specialWithdrawals, aufschubJahre, komplettEntnahme]
  );

  const planJahre = Math.max(0, Math.round(endAge - startAge));
  // Ein Aufschub über die gesamte Planlänge hinaus bedeutet: in diesem Plan
  // wird nie etwas entnommen. Das muss dastehen, sonst sucht der Berater den
  // Fehler in der Rendite.
  const ohneEntnahme =
    withdrawalData.length > 0 && withdrawalData.every((z) => z.withdrawal === 0);

  // Szenario B: gleiche Parameter, andere Entnahmehöhe (ohne Sonderentnahmen)
  const compareData = useMemo(
    () => compareEnabled
      ? buildPlan({
          startCapital,
          annualWithdrawal: compareWithdrawal,
          annualReturnPercent: customAnnualReturn,
          startAge,
          endAge,
          aufschubJahre,
          komplettentnahmeAmEnde: komplettEntnahme,
        })
      : [],
    [compareEnabled, startCapital, compareWithdrawal, customAnnualReturn, startAge, endAge,
     aufschubJahre, komplettEntnahme]
  );

  // Audit N03: Beim Öffnen eines gespeicherten Plans die damaligen Kennzahlen
  // zeigen. Felder, die ältere Datensätze nicht haben, bleiben weg statt als
  // Null zu erscheinen.
  const gespeicherteKennzahlen = useMemo<GespeicherteKennzahl[]>(() => {
    if (!gespeicherteErgebnisse) return [];
    const g = gespeicherteErgebnisse;
    const letzte = withdrawalData[withdrawalData.length - 1];
    const zahl = (v: unknown) => (typeof v === "number" ? v : undefined);
    const eintraege: GespeicherteKennzahl[] = [];
    const kapital = zahl(g.start_capital);
    if (kapital !== undefined)
      eintraege.push({ label: "Startkapital", gespeichert: kapital, aktuell: Math.round(startCapital) });
    const summe = zahl(g.total_withdrawn);
    if (summe !== undefined)
      eintraege.push({ label: "Gesamtentnahme", gespeichert: summe, aktuell: letzte?.totalWithdrawn });
    const rest = zahl(g.end_capital);
    if (rest !== undefined)
      eintraege.push({ label: "Restkapital am Ende", gespeichert: rest, aktuell: letzte?.endCapital });
    return eintraege;
  }, [gespeicherteErgebnisse, withdrawalData, startCapital]);

  const handleSpecialWithdrawalChange = (year: number, amount: string) => {
    if (!isDetailMode) return;
    setSpecialWithdrawals((prev) => ({ ...prev, [year]: parseFloat(amount) || 0 }));
  };

  const planSpeichern = async () => {
    setSpeichertGerade(true);
    setSpeicherHinweis(null);
    try {
      const letzte = withdrawalData[withdrawalData.length - 1];
      const aufgebraucht = letzte && letzte.endCapital <= 0 && !letzte.isLastYear;
      const nutzlast = {
        name: planName.trim() || "Entnahmeplan",
        form: {
          manualStartCapital, selectedCalcId, customWithdrawal, customAnnualReturn,
          startAge, aufschubJahre, komplettEntnahme, isDetailMode, specialWithdrawals,
          // Audit N02: Horizont, Szenario B und das tatsächlich gerechnete
          // Startkapital gehören zum Fall und dürfen beim Öffnen nicht neu
          // aus Voreinstellungen oder fremden Berechnungen entstehen.
          endAge, compareEnabled, compareWithdrawal,
          startCapital: Math.round(startCapital),
        } as Record<string, unknown>,
        results: {
          start_capital: Math.round(startCapital),
          annual_withdrawal: Math.round(customWithdrawal),
          depleted_at_age: aufgebraucht ? letzte.age : null,
          end_capital: letzte ? letzte.endCapital : 0,
          end_age: letzte ? letzte.age : endAge,
          total_withdrawn: letzte ? letzte.totalWithdrawn : 0,
          ...modellStempel(),
        },
      };
      let fallId = gespeicherteId;
      if (gespeicherteId) {
        await WithdrawalPlanEntry.update(gespeicherteId, nutzlast);
        setSpeicherHinweis("Gespeichert.");
      } else {
        const neu = await WithdrawalPlanEntry.create(nutzlast);
        fallId = neu.id;
        setGespeicherteId(neu.id);
        window.history.replaceState(null, "", `?id=${neu.id}`);
        setSpeicherHinweis("Gespeichert – jetzt unter „Alle Ergebnisse“ zu finden.");
      }
      // Fassung festschreiben (Audit O08)
      if (fallId) {
        await FallVersion.anlegen({
          fallTabelle: "withdrawal_plans",
          fallId,
          name: nutzlast.name,
          form: nutzlast.form,
          results: nutzlast.results as unknown as Record<string, unknown>,
          reihen: withdrawalData,
        });
        setVersionenStand((n) => n + 1);
      }
      // Ab jetzt ist das der gespeicherte Stand: Kapital fixiert, Kennzahlen bekannt
      setFixiertesKapital(Math.round(startCapital));
      setGespeicherteErgebnisse(nutzlast.results as Record<string, unknown>);
    } catch (e) {
      console.error(e);
      setSpeicherHinweis(speicherFehlerText(e));
    }
    setSpeichertGerade(false);
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
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto" data-pdf-hide>
                <Input
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="Name der Berechnung"
                  className="bg-white border-slate-200 sm:w-64"
                />
                <Button onClick={planSpeichern} disabled={speichertGerade} variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  {speichertGerade ? "Speichere…" : gespeicherteId ? "Aktualisieren" : "Speichern"}
                </Button>
                <Button onClick={handlePDFClick} className="bg-slate-800 hover:bg-slate-700">
                  <FileDown className="w-4 h-4 mr-2" />
                  Als PDF exportieren
                </Button>
              </div>
            )}
          </div>
          {speicherHinweis && (
            <div className="mb-4 text-sm text-slate-600" data-pdf-hide>{speicherHinweis}</div>
          )}

          {/* Body: Einstellungen oben, Ergebnisse darunter (volle Breite) */}
          <div className="grid grid-cols-1 gap-8 items-start">

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
                          setFixiertesKapital(null);
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
                        setFixiertesKapital(null);
                      }}
                      className="bg-slate-50 border-slate-200"
                    />
                    {kapitalAbweichung && (
                      <p className="text-xs text-amber-700">
                        Der Plan rechnet mit {fmt(fixiertesKapital!)} – so war es gespeichert. Die
                        verknüpfte Berechnung ergibt heute {fmt(abgeleitetesKapital)}.{" "}
                        <button
                          type="button"
                          className="underline font-medium"
                          onClick={() => setFixiertesKapital(null)}
                        >
                          Aktuellen Wert übernehmen
                        </button>
                      </p>
                    )}
                  </div>

                  {/* Rendite, Beginn- und End-Alter */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                        onChange={(v) => {
                          // Ein Beginn hinter dem Ende hat den Plan auf eine
                          // einzige Periode zusammenfallen lassen, ohne das zu
                          // sagen. Das Ende zieht deshalb mit.
                          const neuerBeginn = Math.round(v);
                          setStartAge(neuerBeginn);
                          if (neuerBeginn > endAge) setEndAge(neuerBeginn);
                        }}
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endAge">End-Alter</Label>
                      <NumericInput
                        id="endAge"
                        value={endAge}
                        onChange={(v) => setEndAge(Math.max(startAge, Math.round(v)))}
                        className="bg-slate-50 border-slate-200"
                      />
                      <p className="text-xs text-slate-500">
                        einschließlich – Vorgabe {_wd.withdrawal_end_age ?? 85}
                      </p>
                    </div>
                  </div>

                  {/* Entnahmebeginn und Restkapital */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="aufschub">Entnahme beginnt in (Jahren)</Label>
                      <NumericInput
                        id="aufschub"
                        value={aufschubJahre}
                        onChange={(v) => setAufschubJahre(Math.max(0, Math.round(v)))}
                        className="bg-slate-50 border-slate-200"
                      />
                      <p className="text-xs text-slate-500">
                        0 = sofort ab Alter {startAge}
                      </p>
                    </div>
                    <div className="space-y-2 flex flex-col justify-end">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                        <Label htmlFor="komplett" className="text-sm">
                          Restkapital am Ende entnehmen
                        </Label>
                        <Switch
                          id="komplett"
                          checked={komplettEntnahme}
                          onCheckedChange={setKomplettEntnahme}
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Aus = Restkapital bleibt stehen (z. B. als Erbe)
                      </p>
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

                  {/* Szenario-Vergleich */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="compare-mode"
                      checked={compareEnabled}
                      onCheckedChange={(on) => {
                        setCompareEnabled(on);
                        // Beim ersten Aktivieren mit der aktuellen Entnahme vorbelegen
                        if (on && !compareWithdrawal) setCompareWithdrawal(customWithdrawal);
                      }}
                    />
                    <Label htmlFor="compare-mode">Szenario-Vergleich (zweite Entnahmehöhe)</Label>
                  </div>

                  {compareEnabled && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-blue-700 font-semibold">Szenario A (€/Jahr)</Label>
                        <NumericInput
                          step="1000"
                          value={customWithdrawal}
                          onChange={(v) => setCustomWithdrawal(v)}
                          className="bg-white border-slate-200"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="withdrawalB" className="text-amber-700 font-semibold">Szenario B (€/Jahr)</Label>
                        <NumericInput
                          id="withdrawalB"
                          step="1000"
                          value={compareWithdrawal}
                          onChange={(v) => setCompareWithdrawal(v)}
                          className="bg-white border-slate-200"
                        />
                      </div>
                    </div>
                  )}

                  {/* Berechnungslogik */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <h4 className="font-medium text-slate-800 mb-1.5 text-sm flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Berechnungslogik
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-0.5">
                      <li>
                        • <strong>Start:</strong>{" "}
                        {aufschubJahre > planJahre
                          ? `der Aufschub von ${aufschubJahre} Jahren reicht über das Planende hinaus – in diesem Plan wird nichts entnommen`
                          : aufschubJahre > 0
                            ? `erste Entnahme nach ${aufschubJahre} Jahr${aufschubJahre === 1 ? "" : "en"}, bis dahin wächst das Kapital`
                            : `Entnahme ab Alter ${startAge}`}
                      </li>
                      <li>• <strong>Je Jahr:</strong> Entnahme zu Jahresbeginn, danach Rendite auf den Rest (Verluste werden negativ ausgewiesen)</li>
                      <li>
                        • <strong>Ende:</strong> letzte Entnahme im Jahr, in dem Alter {endAge}{" "}
                        erreicht wird –{" "}
                        {komplettEntnahme
                          ? "Restkapital wird vollständig entnommen"
                          : "Restkapital bleibt stehen"}
                        {planJahre === 0 && (
                          <> (Beginn und Ende liegen gleich – der Plan hat eine Periode)</>
                        )}
                      </li>
                      <li>• Steuern auf Entnahmen sind nicht enthalten.</li>
                    </ul>
                  </div>

                </CardContent>
              </Card>
            </div>

    <Versionsverlauf
          fallTabelle="withdrawal_plans"
          fallId={gespeicherteId}
          neuLadenAb={versionenStand}
        />

        {/* Gespeicherter Stand (Audit N03) */}
            {gespeicherteKennzahlen.length > 0 && (
              <GespeicherteAuswertung
                stempel={gespeicherteErgebnisse as Partial<ModellStempel>}
                kennzahlen={gespeicherteKennzahlen}
              />
            )}

            {/* Results */}
            <div>
              {ohneEntnahme && startCapital !== 0 && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900">
                    <strong>In diesem Plan wird nichts entnommen.</strong>{" "}
                    {aufschubJahre > planJahre
                      ? `Der Aufschub von ${aufschubJahre} Jahren reicht über das Planende hinaus.`
                      : "Die eingestellte Entnahme beträgt null."}{" "}
                    Das Kapital wächst nur weiter.
                  </div>
                </div>
              )}
              {startCapital === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
                  <h2 className="text-xl font-bold text-slate-700 mb-2">Kein Startkapital</h2>
                  <p className="text-slate-500 text-sm">
                    Bitte ein Startkapital eingeben oder eine Berechnung auswählen.
                  </p>
                </div>
              ) : compareEnabled ? (
                <div data-pdf-section="vergleich" data-pdf-single-col className="grid lg:grid-cols-2 gap-8 items-start">
                  {[
                    { key: "A", label: "Szenario A", amount: customWithdrawal, data: withdrawalData, color: "#3b82f6", tone: "text-blue-700 bg-blue-50 border-blue-200" },
                    { key: "B", label: "Szenario B", amount: compareWithdrawal, data: compareData, color: "#d97706", tone: "text-amber-700 bg-amber-50 border-amber-200" },
                  ].map((s) => {
                    const last = s.data[s.data.length - 1];
                    const depletedEarly = !!last && last.endCapital <= 0 && !last.isLastYear;
                    return (
                      <div key={s.key} className="space-y-6">
                        <Card className={`border shadow-lg ${s.tone}`}>
                          <CardContent className="p-5">
                            <div className="flex items-baseline justify-between gap-3 flex-wrap">
                              <div>
                                <div className="text-sm font-semibold">{s.label}</div>
                                <div className="text-2xl font-bold">{fmt(s.amount)} / Jahr</div>
                              </div>
                              <div className="text-right text-sm space-y-0.5">
                                <div>
                                  {depletedEarly
                                    ? <>Kapital aufgebraucht mit <strong>Alter {last?.age}</strong></>
                                    : <>Reicht bis Planende (<strong>Alter {last?.age ?? endAge}</strong>)</>}
                                </div>
                                <div>Gesamtentnahme: <strong>{fmt(last?.totalWithdrawn ?? 0)}</strong></div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        <WithdrawalChart
                          data={s.data}
                          title={`Kapitalverlauf ${s.label}`}
                          color={s.color}
                          showHint={false}
                        />
                        <WithdrawalTable komplettEntnahmeAmEnde={komplettEntnahme}
                          data={s.data}
                          isDetailMode={false}
                          onSpecialWithdrawalChange={() => {}}
                        />
                      </div>
                    );
                  })}
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
                    <WithdrawalTable komplettEntnahmeAmEnde={komplettEntnahme}
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
            ...(gespeicherteKennzahlen.length > 0
              ? [{ id: "gespeichert", label: "Gespeicherte Auswertung" }]
              : []),
            ...(compareEnabled
              ? [{ id: "vergleich", label: "Szenario-Vergleich" }]
              : [
                  { id: "zusammenfassung", label: "Zusammenfassung" },
                  { id: "verlauf", label: "Verlauf & Tabelle" },
                ]),
          ]}
          isExporting={isExporting}
          onExport={(ids) => doExport(ids, "entnahmeplan", "Entnahmeplan")}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
