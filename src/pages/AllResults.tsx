import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calculation, type CalculationModel } from "@/entities/Calculation";
import { SinglePaymentCalculation, type SinglePaymentModel } from "@/entities/SinglePaymentCalculation";
import { BestAdviceCalculation, type BestAdviceModel } from "@/entities/BestAdviceCalculation";
import { PensionGapCalculation, type PensionGapModel } from "@/entities/PensionGapCalculation";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Calculator, DollarSign, Target, TrendingDown, ArrowRight, Trash2 } from "lucide-react";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";

type AnyCalc =
  | { type: "sparvertrag"; data: CalculationModel }
  | { type: "einmalanlage"; data: SinglePaymentModel }
  | { type: "bestadvice"; data: BestAdviceModel }
  | { type: "pensiongap"; data: PensionGapModel };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AllResults() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AnyCalc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    const [sparvertraege, einmalanlagen, bestAdvice, pensionGaps] = await Promise.all([
      Calculation.list("-created_date"),
      SinglePaymentCalculation.list("-created_date"),
      BestAdviceCalculation.list("-created_date"),
      PensionGapCalculation.list("-created_date"),
    ]);

    const all: AnyCalc[] = [
      ...sparvertraege.map((d): AnyCalc => ({ type: "sparvertrag", data: d })),
      ...einmalanlagen.map((d): AnyCalc => ({ type: "einmalanlage", data: d })),
      ...bestAdvice.map((d): AnyCalc => ({ type: "bestadvice", data: d })),
      ...pensionGaps.map((d): AnyCalc => ({ type: "pensiongap", data: d })),
    ];

    all.sort((a, b) => new Date(b.data.created_date).getTime() - new Date(a.data.created_date).getTime());
    setItems(all);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCalc = (item: AnyCalc) => {
    switch (item.type) {
      case "sparvertrag": navigate(createPageUrl("CalculatorDetail") + `?id=${item.data.id}`); break;
      case "einmalanlage": navigate(createPageUrl("SinglePaymentDetail") + `?id=${item.data.id}`); break;
      case "bestadvice": navigate(createPageUrl("BestAdviceDetail") + `?id=${item.data.id}`); break;
      case "pensiongap": navigate(createPageUrl("PensionGapDetail") + `?id=${item.data.id}`); break;
    }
  };

  const typeLabel = (type: AnyCalc["type"]) => {
    switch (type) {
      case "sparvertrag": return "Fonds-Sparvertrag";
      case "einmalanlage": return "Einmalanlage";
      case "bestadvice": return "BestAdvice";
      case "pensiongap": return "Rentenlücke";
    }
  };

  const typeIcon = (type: AnyCalc["type"]) => {
    switch (type) {
      case "sparvertrag": return { Icon: Calculator, color: "bg-blue-100 text-blue-600" };
      case "einmalanlage": return { Icon: DollarSign, color: "bg-green-100 text-green-600" };
      case "bestadvice": return { Icon: Target, color: "bg-purple-100 text-purple-600" };
      case "pensiongap": return { Icon: TrendingDown, color: "bg-red-100 text-red-600" };
    }
  };

  const resultSummary = (item: AnyCalc): string | null => {
    if (item.type === "sparvertrag" && item.data.results) {
      const r = item.data.results;
      return `LV: ${formatCurrency(r.life_insurance_net)} · Depot: ${formatCurrency(r.depot_net)} (netto)`;
    }
    if (item.type === "einmalanlage" && item.data.results) {
      const r = item.data.results;
      return `LV: ${formatCurrency(r.life_insurance_net)} · Depot: ${formatCurrency(r.depot_net)} (netto)`;
    }
    if (item.type === "bestadvice" && item.data.results) {
      const r = item.data.results;
      return `Fonds-LV: ${formatCurrency(r.life_insurance_net)} · Bestand: ${formatCurrency(r.depot_net)} (netto)`;
    }
    if (item.type === "pensiongap" && item.data.results) {
      const r = item.data.results;
      if (r.gap_already_covered) return "Keine Rentenlücke";
      return `Lücke: ${formatCurrency(r.monthly_gap)}/Monat · Sparrate benötigt: ${formatCurrency(r.monthly_savings_needed)}/Monat`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Alle Ergebnisse</h1>
              <p className="text-slate-600 mt-1">{items.length} gespeicherte Berechnung{items.length !== 1 ? "en" : ""}</p>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-12 text-center">
              <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <div className="text-lg font-medium text-slate-600 mb-2">Noch keine Berechnungen</div>
              <div className="text-slate-500 text-sm mb-6">Führen Sie eine Berechnung durch, um die Ergebnisse hier zu sehen.</div>
              <Button onClick={() => navigate(createPageUrl("Calculator"))}
                className="bg-slate-800 hover:bg-slate-700 text-white">
                Zum Rechner
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const { Icon, color } = typeIcon(item.type);
              const summary = resultSummary(item);
              return (
                <Card key={`${item.type}-${item.data.id}`}
                  className="border-0 shadow-lg bg-white cursor-pointer hover:shadow-xl transition-all duration-200 group"
                  onClick={() => openCalc(item)}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">{item.data.name}</span>
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">
                            {typeLabel(item.type)}
                          </span>
                        </div>
                        {summary && (
                          <div className="text-sm text-slate-500 mt-0.5 truncate">{summary}</div>
                        )}
                        <div className="text-xs text-slate-400 mt-0.5">{formatDate(item.data.created_date)}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
