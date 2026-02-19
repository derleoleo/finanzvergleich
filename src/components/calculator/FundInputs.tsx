// src/components/calculator/FundInputs.tsx

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, Building, Percent, Search } from "lucide-react";

type Props = {
  formData: any;
  updateFormData: (field: string, value: any) => void;
  fetchDepotFundCosts: () => void | Promise<void>; // bleibt kompatibel, wird nur nicht mehr genutzt
  isFetchingDepot: boolean; // bleibt kompatibel, wird nur nicht mehr genutzt
};

function toNumber(value: any): number {
  const n = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export default function FundInputs({ formData, updateFormData }: Props) {
  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          Direktanlage (Depot)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="depot_fund_identifier"
            className="text-sm font-medium text-slate-700"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Fonds für Direktanlage (ISIN/WKN)
            </div>
          </Label>

          <Input
            id="depot_fund_identifier"
            type="text"
            value={formData.depot_fund_identifier}
            onChange={(e) =>
              updateFormData("depot_fund_identifier", e.target.value)
            }
            className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
            placeholder="z.B. LU0553164731"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label
              htmlFor="depot_fund_initial_charge_percent"
              className="text-sm font-medium text-slate-700"
            >
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Ausgabeaufschlag (%)
              </div>
            </Label>
            <Input
              id="depot_fund_initial_charge_percent"
              type="number"
              step="0.01"
              value={formData.depot_fund_initial_charge_percent ?? ""}
              onChange={(e) =>
                updateFormData(
                  "depot_fund_initial_charge_percent",
                  toNumber(e.target.value)
                )
              }
              className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="depot_fund_ongoing_costs_percent"
              className="text-sm font-medium text-slate-700"
            >
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Laufende Kosten p.a. (TER, %)
              </div>
            </Label>
            <Input
              id="depot_fund_ongoing_costs_percent"
              type="number"
              step="0.01"
              value={formData.depot_fund_ongoing_costs_percent ?? ""}
              onChange={(e) =>
                updateFormData(
                  "depot_fund_ongoing_costs_percent",
                  toNumber(e.target.value)
                )
              }
              className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label
              htmlFor="depot_provider"
              className="text-sm font-medium text-slate-700"
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Depot-Anbieter
              </div>
            </Label>
            <Input
              id="depot_provider"
              type="text"
              value={formData.depot_provider}
              onChange={(e) => updateFormData("depot_provider", e.target.value)}
              className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
              placeholder="z.B. ING DiBa"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="depot_costs_annual"
              className="text-sm font-medium text-slate-700"
            >
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Depotkosten p.a. (%)
              </div>
            </Label>
            <Input
              id="depot_costs_annual"
              type="number"
              step="0.01"
              value={formData.depot_costs_annual ?? ""}
              onChange={(e) =>
                updateFormData("depot_costs_annual", toNumber(e.target.value))
              }
              className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-medium text-green-800 mb-2">
            Kostenvorteil Direktanlage
          </h4>
          <p className="text-sm text-green-700">
            Bei der Direktanlage können Sie oft{" "}
            <strong>günstigere ETFs oder Indexfonds</strong> wählen, während Sie
            bei Lebensversicherungen auf die teureren Fonds des Versicherers
            beschränkt sind.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-medium text-blue-800 mb-2">
            Steuerliche Behandlung
          </h4>
          <p className="text-sm text-blue-700">
            Gewinne werden mit der <strong>Abgeltungsteuer</strong> besteuert:
            25% Kapitalertragsteuer + 5,5% Solidaritätszuschlag auf die KapErSt.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
