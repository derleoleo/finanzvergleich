import { useState } from "react";
import { UserDefaults, type UserDefaultsData, SYSTEM_DEFAULTS } from "@/entities/UserDefaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  SlidersHorizontal, Save, CheckCircle, User, Calendar, TrendingUp,
  Shield, BarChart3, Calculator, DollarSign, TrendingDown, Wallet, RotateCcw,
} from "lucide-react";

export default function Defaults() {
  const [data, setData] = useState<UserDefaultsData>(() => UserDefaults.load());
  const [saved, setSaved] = useState(false);

  const set = (field: keyof UserDefaultsData, value: string | number) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const n = (val: number | string, step = 1) => (
    (field: keyof UserDefaultsData) => (
      <Input
        type="number"
        step={step}
        value={val as number}
        onChange={(e) => set(field, parseFloat(e.target.value) || 0)}
        className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white"
      />
    )
  );

  const inputClass = "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white";

  const handleSave = () => {
    UserDefaults.save(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => setData({ ...SYSTEM_DEFAULTS });

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
            <SlidersHorizontal className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Voreinstellungen</h1>
            <p className="text-slate-600 mt-1">Standardwerte für neue Berechnungen</p>
          </div>
        </div>

        <div className="grid gap-6">

          {/* Allgemein */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                Allgemein
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Geburtsjahr
                </Label>
                <Input type="number" value={data.birth_year}
                  onChange={(e) => set("birth_year", parseInt(e.target.value) || 0)}
                  className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Laufzeit (Jahre)
                </Label>
                <Input type="number" value={data.contract_duration_years}
                  onChange={(e) => set("contract_duration_years", parseFloat(e.target.value) || 0)}
                  className={inputClass} />
                <p className="text-xs text-slate-400">Sparvertrag, Einmalanlage, BestAdvice</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Rendite p.a. (%)
                </Label>
                <Input type="number" step={0.1} value={data.assumed_annual_return}
                  onChange={(e) => set("assumed_annual_return", parseFloat(e.target.value) || 0)}
                  className={inputClass} />
              </div>
            </CardContent>
          </Card>

          {/* LV-Fonds & Kosten */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-4 h-4 text-green-600" />
                </div>
                LV-Fonds & Kosten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">LV-Fonds Name</Label>
                  <Input value={data.lv_fund_identifier}
                    onChange={(e) => set("lv_fund_identifier", e.target.value)}
                    placeholder="z.B. Debeka Global Shares" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">LV-Fondskosten p.a. (%)</Label>
                  <Input type="number" step={0.01} value={data.lv_fund_ongoing_costs_percent}
                    onChange={(e) => set("lv_fund_ongoing_costs_percent", parseFloat(e.target.value) || 0)}
                    className={inputClass} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Kostentyp</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {data.lv_cost_type === "eur"
                      ? "Abschluss- & Verwaltungskosten in Euro"
                      : "Effektivkosten in Prozent"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className={data.lv_cost_type === "eur" ? "font-semibold text-slate-800" : "text-slate-400"}>EUR</span>
                  <Switch
                    checked={data.lv_cost_type === "percent"}
                    onCheckedChange={(v) => set("lv_cost_type", v ? "percent" : "eur")}
                  />
                  <span className={data.lv_cost_type === "percent" ? "font-semibold text-slate-800" : "text-slate-400"}>%</span>
                </div>
              </div>

              {data.lv_cost_type === "eur" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Abschlusskosten (€)</Label>
                    <Input type="number" value={data.life_insurance_acquisition_costs_eur}
                      onChange={(e) => set("life_insurance_acquisition_costs_eur", parseFloat(e.target.value) || 0)}
                      className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Verwaltung (€/Monat)</Label>
                    <Input type="number" step={0.5} value={data.lv_admin_costs_monthly_eur}
                      onChange={(e) => set("lv_admin_costs_monthly_eur", parseFloat(e.target.value) || 0)}
                      className={inputClass} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Effektivkosten p.a. (%)</Label>
                  <Input type="number" step={0.01} value={data.lv_effective_costs_percent}
                    onChange={(e) => set("lv_effective_costs_percent", parseFloat(e.target.value) || 0)}
                    className={inputClass} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Depot */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </div>
                Depot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Depot-Anbieter</Label>
                  <Input value={data.depot_provider}
                    onChange={(e) => set("depot_provider", e.target.value)}
                    placeholder="z.B. Flatex" className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Depot-Fonds Name</Label>
                  <Input value={data.depot_fund_identifier}
                    onChange={(e) => set("depot_fund_identifier", e.target.value)}
                    placeholder="z.B. MSCI World ETF" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Ausgabeaufschlag (%)</Label>
                  <Input type="number" step={0.1} value={data.depot_fund_initial_charge_percent}
                    onChange={(e) => set("depot_fund_initial_charge_percent", parseFloat(e.target.value) || 0)}
                    className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Fondskosten TER (%)</Label>
                  <Input type="number" step={0.01} value={data.depot_fund_ongoing_costs_percent}
                    onChange={(e) => set("depot_fund_ongoing_costs_percent", parseFloat(e.target.value) || 0)}
                    className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Depotgebühren p.a. (%)</Label>
                  <Input type="number" step={0.01} value={data.depot_costs_annual}
                    onChange={(e) => set("depot_costs_annual", parseFloat(e.target.value) || 0)}
                    className={inputClass} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sparvertrag & Einmalanlage */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-slate-600" />
                </div>
                Sparvertrag & Einmalanlage
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Monatliche Sparrate (€)</Label>
                <Input type="number" value={data.monthly_contribution}
                  onChange={(e) => set("monthly_contribution", parseFloat(e.target.value) || 0)}
                  className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Einmalbetrag (€)</Label>
                <Input type="number" value={data.lump_sum}
                  onChange={(e) => set("lump_sum", parseFloat(e.target.value) || 0)}
                  className={inputClass} />
              </div>
            </CardContent>
          </Card>

          {/* Rentenlücke */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
                Rentenlücke
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Renteneintrittsalter</Label>
                <Input type="number" value={data.retirement_age}
                  onChange={(e) => set("retirement_age", parseInt(e.target.value) || 0)}
                  className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Wunscheinkommen (€/Monat)</Label>
                <Input type="number" value={data.desired_monthly_income}
                  onChange={(e) => set("desired_monthly_income", parseFloat(e.target.value) || 0)}
                  className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Gesetzliche Rente (€/Monat)</Label>
                <Input type="number" value={data.expected_statutory_pension}
                  onChange={(e) => set("expected_statutory_pension", parseFloat(e.target.value) || 0)}
                  className={inputClass} />
              </div>
            </CardContent>
          </Card>

          {/* Entnahmeplan */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                Entnahmeplan
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Jährliche Entnahme (€)</Label>
                <Input type="number" value={data.withdrawal_amount}
                  onChange={(e) => set("withdrawal_amount", parseFloat(e.target.value) || 0)}
                  className={inputClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">Beginn-Alter</Label>
                <Input type="number" value={data.withdrawal_start_age}
                  onChange={(e) => set("withdrawal_start_age", parseInt(e.target.value) || 0)}
                  className={inputClass} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handleReset}
              className="flex items-center gap-2 text-slate-500">
              <RotateCcw className="w-4 h-4" />
              Zurücksetzen
            </Button>
            <Button onClick={handleSave}
              className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl flex items-center gap-2">
              {saved ? (
                <><CheckCircle className="w-4 h-4" />Gespeichert!</>
              ) : (
                <><Save className="w-4 h-4" />Voreinstellungen speichern</>
              )}
            </Button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Voreinstellungen gelten für neue Berechnungen. Bestehende Entwürfe bleiben unverändert.
          </p>

        </div>
      </div>
    </div>
  );
}
