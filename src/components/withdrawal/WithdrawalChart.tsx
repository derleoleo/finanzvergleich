import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, XAxis, YAxis } from "recharts";
import { TrendingDown } from "lucide-react";
import { formatCurrency, formatChartAxis } from "@/components/shared/CurrencyDisplay";

type WithdrawalRow = {
  year: number;
  endCapital: number;
};

type Props = {
  data: WithdrawalRow[];
  /** Überschrift der Karte (Default: "Kapitalverlauf") */
  title?: string;
  /** Linien-/Flächenfarbe, z. B. für Szenario-Vergleich (Default: blau) */
  color?: string;
  /** Lesehinweis unter dem Chart anzeigen (Default: true) */
  showHint?: boolean;
};

export default function WithdrawalChart({ data, title = "Kapitalverlauf", color = "#3b82f6", showHint = true }: Props) {
  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-blue-600" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80" style={{ width: "100%", height: "320px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="year"
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
                label={{ value: "Jahr", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={formatChartAxis}
              />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value)), name === "endCapital" ? "Restkapital" : String(name)]}
                labelFormatter={(year: unknown) => `Jahr ${year}`}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="endCapital"
                stroke={color}
                fill={color}
                fillOpacity={0.1}
                strokeWidth={3}
                name="Restkapital"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {showHint && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl">
          <h4 className="font-medium text-slate-800 mb-2">Lesehinweis</h4>
          <p className="text-sm text-slate-600">
            Die Grafik zeigt, wie sich das verfügbare Kapital über die Jahre bei konstanter jährlicher Entnahme entwickelt.
            Das Kapital wächst durch die angenommene Rendite und wird durch die Entnahmen reduziert.
          </p>
        </div>
        )}
      </CardContent>
    </Card>
  );
}
