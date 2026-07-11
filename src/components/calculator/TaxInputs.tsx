// src/components/calculator/TaxInputs.tsx
// Steuer-Einstellungen für den Vergleich (Teilfreistellung, SolZ,
// Kirchensteuer). SolZ/KiSt gelten für Depot- und LV-Steuer. Die Werte
// leben in den UserDefaults (lokal) und gelten für alle Rechner; sie
// werden nicht pro Berechnung gespeichert.

import { useState } from "react";
import { UserDefaults, type UserDefaultsData } from "@/entities/UserDefaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Percent } from "lucide-react";

const inputClass =
  "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white";

export default function TaxInputs({
  onChange,
}: {
  // Optionaler Callback, damit Seiten auf Änderungen reagieren können
  onChange?: (defaults: UserDefaultsData) => void;
}) {
  const [data, setData] = useState<UserDefaultsData>(() => UserDefaults.load());

  const set = (field: keyof UserDefaultsData, value: number | boolean) => {
    setData((prev) => {
      const next = { ...prev, [field]: value };
      UserDefaults.save(next);
      onChange?.(next);
      return next;
    });
  };

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Percent className="w-5 h-5 text-amber-600" />
          </div>
          Steuern
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Teilfreistellung Depot (%)
            </Label>
            <select
              value={String(data.depot_teilfreistellung_percent)}
              onChange={(e) =>
                set("depot_teilfreistellung_percent", Number(e.target.value))
              }
              className={`${inputClass} w-full rounded-md border px-3 py-2 text-sm`}
            >
              <option value="30">30 % – Aktienfonds (≥ 51 % Aktien)</option>
              <option value="15">15 % – Mischfonds (≥ 25 % Aktien)</option>
              <option value="0">0 % – Sonstige Fonds</option>
            </select>
            <p className="text-xs text-slate-500">
              Anteil der Depot-Gewinne, der steuerfrei bleibt (InvStG).
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Solidaritätszuschlag
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                +5,5 % auf die Steuer (fällt bei Kapitalerträgen immer an)
              </p>
            </div>
            <Switch
              checked={data.apply_solidaritaetszuschlag}
              onCheckedChange={(v) => set("apply_solidaritaetszuschlag", v)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Kirchensteuer (%)
            </Label>
            <select
              value={String(data.kirchensteuer_percent)}
              onChange={(e) => set("kirchensteuer_percent", Number(e.target.value))}
              className={`${inputClass} w-full rounded-md border px-3 py-2 text-sm`}
            >
              <option value="0">Keine</option>
              <option value="8">8 % (Bayern, Baden-Württemberg)</option>
              <option value="9">9 % (übrige Bundesländer)</option>
            </select>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Diese Einstellungen werden in den Voreinstellungen gespeichert und
          gelten für alle Rechner (SolZ/Kirchensteuer auch für die LV-Steuer).
          Vereinfachtes Modell: keine Vorabpauschale, kein Sparerpauschbetrag
          (konservativ – ggf. anderweitig verbraucht).
        </p>
      </CardContent>
    </Card>
  );
}
