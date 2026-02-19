import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, Euro } from "lucide-react";

type Props = {
  formData: any;
  updateFormData: (field: string, value: any) => void;
};

export default function WithdrawalInputs({ formData, updateFormData }: Props) {
  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-purple-600" />
          </div>
          Entnahmeplan
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="annual_withdrawal" className="text-sm font-medium text-slate-700">
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4" />
              Jährliche Entnahme (€)
            </div>
          </Label>
          <Input
            id="annual_withdrawal"
            type="number"
            value={formData.annual_withdrawal}
            onChange={(e) => updateFormData("annual_withdrawal", parseFloat(e.target.value))}
            className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200 md:w-1/2"
          />
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-medium text-purple-800 mb-2">Entnahmeplan-Berechnung</h4>
          <p className="text-sm text-purple-700">
            Berechnet, wie lange das Kapital bei der gewählten jährlichen Entnahme reicht.
            Grundlage ist das höhere Netto-Kapital aus beiden Varianten.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
