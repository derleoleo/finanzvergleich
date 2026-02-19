import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { formatCurrency, formatChartAxis } from "@/components/shared/CurrencyDisplay";

type Mode = "gross" | "net";

type Props = {
  data: Array<{
    year: number;
    age: number;
    lv_gross: number;
    depot_gross: number;
    lv_net?: number;
    depot_net?: number;
  }>;
  mode: Mode;
};

export default function ComparisonChart({ data, mode }: Props) {
  const lvKey = mode === "gross" ? "lv_gross" : "lv_net";
  const depotKey = mode === "gross" ? "depot_gross" : "depot_net";

  const title =
    mode === "gross"
      ? "Kapitalverlauf (nach Kosten, vor Steuer)"
      : "Kapitalverlauf (Netto je Jahr – hypothetisch)";

  return (
    <Card className="bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-slate-700" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="h-80" style={{ width: "100%", height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 24, left: 12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12 }}
                label={{ value: "Jahr", position: "insideBottom", offset: -5 }}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatChartAxis} />
              <Tooltip
                formatter={(value: any, name: any) => {
                  const label =
                    name === lvKey ? "LV" : name === depotKey ? "Depot" : String(name);
                  return [formatCurrency(Number(value) || 0), label];
                }}
                labelFormatter={(year: any) => {
                  const row = data.find((d) => d.year === Number(year));
                  const age = row?.age ?? "";
                  return `Jahr ${year}${age !== "" ? ` • Alter ${age}` : ""}`;
                }}
              />
              <Legend />

              {/* LV */}
              <Area
                type="monotone"
                dataKey={lvKey}
                name="LV"
                strokeWidth={3}
                fillOpacity={0.12}
                isAnimationActive={false}
              />

              {/* Depot */}
              <Area
                type="monotone"
                dataKey={depotKey}
                name="Depot"
                strokeWidth={3}
                fillOpacity={0.12}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {mode === "net" && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Netto-Verlauf ist eine <strong>hypothetische</strong> Darstellung (als ob jedes Jahr ausgezahlt würde).
            Real fallen Steuern je nach Produkt/Depot-Art anders an. Für Beratung als Visualisierung gedacht.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
