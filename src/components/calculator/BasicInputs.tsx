import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Euro, Calendar, User, FileText, AlertTriangle } from "lucide-react";
import { looksLikeName } from "@/utils/nameDetection";

type Props = {
  formData: {
    name: string;
    monthly_contribution: number;
    contract_duration_years: number;
    assumed_annual_return: number;
    birth_year: number;
  };
  updateFormData: (field: string, value: any) => void;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCurrentAge(birthYear: number) {
  const yearNow = new Date().getFullYear();
  if (!birthYear || birthYear < 1900 || birthYear > yearNow) return 0;
  return yearNow - birthYear;
}

export default function BasicInputs({ formData, updateFormData }: Props) {
  const birthYear = Number(formData.birth_year || 0);
  const durationYears = Number(formData.contract_duration_years || 0);

  const currentAge = getCurrentAge(birthYear);
  const endAge = currentAge > 0 ? currentAge + durationYears : 0;

  const applyPresetEndAge = (targetEndAge: number) => {
    const ageNow = getCurrentAge(Number(formData.birth_year || 0));
    // wenn birthYear noch nicht plausibel ist, nichts ändern
    if (!ageNow) return;

    const newDuration = clampNumber(targetEndAge - ageNow, 1, 80);
    updateFormData("contract_duration_years", newDuration);
  };

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          Grunddaten
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Name + Geburtsjahr */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-sm font-medium text-slate-700"
            >
              Name der Berechnung
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              placeholder="Bitte keine Klarnamen"
              className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
            {looksLikeName(formData.name) && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Möglicher Klarname erkannt – bitte Pseudonym verwenden
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="birth_year"
              className="text-sm font-medium text-slate-700"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Geburtsjahr
              </div>
            </Label>
            <Input
              id="birth_year"
              type="number"
              value={formData.birth_year}
              onChange={(e) =>
                updateFormData(
                  "birth_year",
                  parseInt(e.target.value || "0", 10)
                )
              }
              className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
            <div className="text-xs text-slate-500">
              {currentAge > 0
                ? `Aktuelles Alter (ca.): ${currentAge}`
                : "Tipp: Geburtsjahr eingeben → Endalter wird berechnet."}
            </div>
          </div>
        </div>

        {/* Beitrag + Laufzeit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label
              htmlFor="monthly_contribution"
              className="text-sm font-medium text-slate-700"
            >
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Monatlicher Beitrag (€)
              </div>
            </Label>
            <Input
              id="monthly_contribution"
              type="number"
              value={formData.monthly_contribution}
              onChange={(e) =>
                updateFormData(
                  "monthly_contribution",
                  parseFloat(e.target.value || "0")
                )
              }
              className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="contract_duration_years"
              className="text-sm font-medium text-slate-700"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Laufzeit (Jahre)
              </div>
            </Label>

            <div className="flex gap-2">
              <Input
                id="contract_duration_years"
                type="number"
                value={formData.contract_duration_years}
                onChange={(e) =>
                  updateFormData(
                    "contract_duration_years",
                    parseInt(e.target.value || "0", 10)
                  )
                }
                className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => applyPresetEndAge(67)}
                disabled={!currentAge}
                className="whitespace-nowrap"
                title="Setzt die Laufzeit so, dass das Endalter 67 ist"
              >
                Ende mit 67
              </Button>
            </div>

            <div className="text-xs text-slate-500">
              {endAge > 0 ? (
                <>
                  Endalter:{" "}
                  <span className="font-semibold text-slate-700">{endAge}</span>
                </>
              ) : (
                "Endalter wird aus Geburtsjahr + Laufzeit berechnet."
              )}
            </div>
          </div>
        </div>

        {/* Rendite */}
        <div className="space-y-2">
          <Label
            htmlFor="assumed_annual_return"
            className="text-sm font-medium text-slate-700"
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              Angenommene jährliche Rendite (%)
            </div>
          </Label>
          <Input
            id="assumed_annual_return"
            type="number"
            step="0.1"
            value={formData.assumed_annual_return}
            onChange={(e) =>
              updateFormData(
                "assumed_annual_return",
                parseFloat(e.target.value || "0")
              )
            }
            className="bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white transition-all duration-200 md:w-1/2"
          />
        </div>
      </CardContent>
    </Card>
  );
}
