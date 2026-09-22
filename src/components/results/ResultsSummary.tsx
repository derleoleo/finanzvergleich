import { TrendingUp, Euro } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SummaryGrid from "@/components/results/SummaryGrid";
import SummaryCard from "@/components/results/SummaryCard";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";
import Vorsorgewaage from "@/components/results/Vorsorgewaage";

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
  onModeChange?: (m: Mode) => void;
};

export default function ResultsSummary({ results, mode, onModeChange }: Props) {
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 bg-linear-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            Zusammenfassung
          </CardTitle>

          {onModeChange && (
            <div className="flex gap-2">
              <Button
                variant={mode === "gross" ? "default" : "outline"}
                className={mode === "gross" ? "bg-slate-800 hover:bg-slate-700" : ""}
                onClick={() => onModeChange("gross")}
              >
                Brutto
              </Button>
              <Button
                variant={mode === "net" ? "default" : "outline"}
                className={mode === "net" ? "bg-slate-800 hover:bg-slate-700" : ""}
                onClick={() => onModeChange("net")}
              >
                Netto
              </Button>
            </div>
          )}
        </div>
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
            tone="neutral"
          />
        </SummaryGrid>

        <Vorsorgewaage
          basis={`LV vs. Depot · ${mode === "gross" ? "brutto vor Steuern" : "netto nach Steuern"}`}
          links={{
            name: "Lebensversicherung",
            imSatz: "der Lebensversicherung",
            wert: li,
            eingezahlt: results.total_contributions ?? 0,
            farbe: "#2563eb",
          }}
          rechts={{
            name: "Depot",
            imSatz: "dem Depot",
            wert: depot,
            eingezahlt: results.total_contributions ?? 0,
            farbe: "#16a34a",
          }}
        />
      </CardContent>
    </Card>
  );
}
