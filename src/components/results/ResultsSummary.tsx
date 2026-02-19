import { TrendingUp, Euro } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SummaryGrid from "@/components/results/SummaryGrid";
import SummaryCard from "@/components/results/SummaryCard";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";

export type Mode = "gross" | "net";

type Props = {
  results: {
    total_contributions: number;
    life_insurance_gross?: number;
    life_insurance_net?: number;
    depot_gross?: number;
    depot_net?: number;
  };
  mode: Mode;
};

export default function ResultsSummary({ results, mode }: Props) {
  const li =
    Number(
      mode === "gross"
        ? results.life_insurance_gross
        : results.life_insurance_net
    ) || 0;
  const depot =
    Number(mode === "gross" ? results.depot_gross : results.depot_net) || 0;

  // ✅ Wichtig: LV besser => Differenz positiv
  const difference = li - depot;

  const base = Math.max(1, Math.min(li, depot) || 1);
  const percentageDifference = (difference / base) * 100;

  const lvBetter = difference >= 0;
  const headline = lvBetter
    ? "Lebensversicherung ist besser"
    : "Direktanlage ist besser";

  const deltaText = lvBetter
    ? `Das LV-Ergebnis liegt um ${Math.abs(percentageDifference).toFixed(
        1
      )}% über dem Depot.`
    : `Das Depot-Ergebnis liegt um ${Math.abs(percentageDifference).toFixed(
        1
      )}% über der LV.`;

  return (
    <Card className="bg-linear-to-r from-white to-slate-50 border-0 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          Zusammenfassung ({mode === "gross" ? "Brutto" : "Netto"})
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <SummaryGrid>
          <SummaryCard
            title="Eingezahlt gesamt"
            value={formatCurrency(results.total_contributions ?? 0)}
            icon={<Euro className="w-5 h-5" />}
            tone="neutral"
          />

          <SummaryCard
            title={`LV (${mode === "gross" ? "brutto" : "netto"})`}
            value={formatCurrency(li)}
            subtext={mode === "gross" ? "vor Steuern" : "nach Steuern"}
            icon={<span className="font-bold">LV</span>}
            tone="info"
          />

          <SummaryCard
            title={`Depot (${mode === "gross" ? "brutto" : "netto"})`}
            value={formatCurrency(depot)}
            subtext={mode === "gross" ? "vor Steuern" : "nach Steuern"}
            icon={<span className="font-bold">D</span>}
            tone="success"
          />

          <SummaryCard
            title="Differenz (LV − Depot)"
            value={`${lvBetter ? "+" : "-"}${formatCurrency(
              Math.abs(difference)
            )}`}
            subtext={deltaText}
            icon={<TrendingUp className="w-5 h-5" />}
            // ✅ kein "danger" nutzen – nur Töne, die du schon hast
            tone={lvBetter ? "success" : "info"}
          />
        </SummaryGrid>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <TrendingUp
              className={`w-6 h-6 ${
                lvBetter ? "text-green-600" : "text-red-600"
              }`}
            />
            <div className="text-lg font-bold text-slate-900">{headline}</div>
          </div>

          {/* ✅ LV besser => positiv + grün, Depot besser => negativ + rot */}
          <div
            className={`text-3xl font-bold mb-1 ${
              lvBetter ? "text-green-600" : "text-red-600"
            }`}
          >
            {lvBetter ? "+" : "-"}
            {formatCurrency(Math.abs(difference))}
          </div>

          <div className="text-slate-600">{deltaText}</div>
        </div>
      </CardContent>
    </Card>
  );
}
