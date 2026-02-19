import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { Calculation } from "@/entities/Calculation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  formatCurrency,
  formatChartAxis,
} from "@/components/shared/CurrencyDisplay";

import { ArrowLeft, PieChart as PieIcon } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type CostResults = {
  li_total_costs?: number;
  depot_total_costs?: number;

  li_acquisition_costs?: number; // Abschluss
  li_fund_costs?: number; // Fonds
  li_effective_costs?: number; // Verwaltung (bei dir so gespeichert)

  depot_initial_charges?: number;
  depot_fund_costs?: number;
  depot_depot_costs?: number;

  li_tax?: number;
  depot_tax?: number;
};

type Calc = {
  id: string;
  name?: string;
  created_date?: string;
  results?: CostResults;
};

function getIdFromQuery(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id");
}

export default function CalculatorCostsDetail() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [calc, setCalc] = useState<Calc | null>(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      const id = getIdFromQuery();
      if (!id) {
        setCalc(null);
        setIsLoading(false);
        return;
      }

      const all = await Calculation.list();
      const found = (all as any[]).find((x) => String(x.id) === String(id)) as
        | Calc
        | undefined;

      setCalc(found ?? null);
      setIsLoading(false);
    };

    run();
  }, []);

  const r = (calc?.results ?? {}) as CostResults;

  const liTotal = Number(r.li_total_costs ?? 0);
  const depotTotal = Number(r.depot_total_costs ?? 0);

  const liAcq = Number(r.li_acquisition_costs ?? 0);
  const liFund = Number(r.li_fund_costs ?? 0);
  const liAdmin = Number(r.li_effective_costs ?? 0);

  const depotInit = Number(r.depot_initial_charges ?? 0);
  const depotFund = Number(r.depot_fund_costs ?? 0);
  const depotDepot = Number(r.depot_depot_costs ?? 0);

  // ✅ Eindeutige Keys → keine schwarzen Balken durch Überschneidungen
  const chartData = useMemo(
    () => [
      {
        name: "Lebensversicherung",
        "LV Abschluss": liAcq,
        "LV Verwaltung": liAdmin,
        "LV Fondskosten": liFund,
      },
      {
        name: "Depot",
        "Depot Ausgabeaufschlag": depotInit,
        "Depot Depotkosten": depotDepot,
        "Depot Fondskosten": depotFund,
      },
    ],
    [liAcq, liAdmin, liFund, depotInit, depotDepot, depotFund]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!calc || !calc.results) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Results"))}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-8">
              <div className="text-slate-700 font-medium">
                Keine Berechnung gefunden.
              </div>
              <div className="text-slate-500 text-sm mt-1">
                Öffne bitte eine gespeicherte Berechnung und klicke dann auf
                „Kosten im Detail“.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Zurück
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center">
            <PieIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Kosten im Detail
            </h1>
            <p className="text-slate-600 mt-1">{calc.name ?? "Berechnung"}</p>
          </div>
        </div>

        {/* Kacheln */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="text-xs text-slate-500 mb-1">Gesamtkosten LV</div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(liTotal)}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Abschluss {formatCurrency(liAcq)} · Verwaltung{" "}
                {formatCurrency(liAdmin)} · Fonds {formatCurrency(liFund)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="text-xs text-slate-500 mb-1">
                Gesamtkosten Depot
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(depotTotal)}
              </div>
              <div className="text-sm text-slate-600 mt-1">
                Ausgabeaufschlag {formatCurrency(depotInit)} · Depot{" "}
                {formatCurrency(depotDepot)} · Fonds {formatCurrency(depotFund)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-slate-900">
              Kostenvergleich
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-90">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={formatChartAxis}
                    tick={{ fontSize: 12 }}
                  />

                  <Tooltip
                    formatter={(value: any, name: any) => [
                      formatCurrency(Number(value || 0)),
                      String(name),
                    ]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />

                  {/* LV (blau) */}
                  <Bar dataKey="LV Abschluss" stackId="lv" fill="#2563eb" />
                  <Bar dataKey="LV Verwaltung" stackId="lv" fill="#60a5fa" />
                  <Bar dataKey="LV Fondskosten" stackId="lv" fill="#93c5fd" />

                  {/* Depot (grün) */}
                  <Bar
                    dataKey="Depot Ausgabeaufschlag"
                    stackId="depot"
                    fill="#16a34a"
                  />
                  <Bar
                    dataKey="Depot Depotkosten"
                    stackId="depot"
                    fill="#4ade80"
                  />
                  <Bar
                    dataKey="Depot Fondskosten"
                    stackId="depot"
                    fill="#86efac"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-sm text-slate-600 mt-3">
              Hinweis: Die Werte kommen aus der gespeicherten Berechnung.
            </div>
          </CardContent>
        </Card>

        {/* Tabelle */}
        <Card className="border-0 shadow-lg bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-slate-900">
              Aufschlüsselung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-200">
                  <TableHead className="font-semibold text-slate-700">
                    Kategorie
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    LV
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">
                    Depot
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-slate-100">
                  <TableCell className="text-slate-900 font-medium">
                    Abschluss / Ausgabeaufschlag
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(liAcq)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(depotInit)}
                  </TableCell>
                </TableRow>

                <TableRow className="border-slate-100">
                  <TableCell className="text-slate-900 font-medium">
                    Verwaltung / Depotkosten
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(liAdmin)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(depotDepot)}
                  </TableCell>
                </TableRow>

                <TableRow className="border-slate-100">
                  <TableCell className="text-slate-900 font-medium">
                    Fondskosten
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(liFund)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(depotFund)}
                  </TableCell>
                </TableRow>

                <TableRow className="border-slate-200 bg-slate-50">
                  <TableCell className="text-slate-900 font-bold">
                    Gesamt
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(liTotal)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(depotTotal)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("Results"))}
          >
            Zu den Ergebnissen
          </Button>
          <Button
            className="bg-slate-800 hover:bg-slate-700 text-white"
            onClick={() => navigate(createPageUrl("Calculator") + "?resume=1")}
          >
            Zurück zum Rechner (letzte Eingaben)
          </Button>
        </div>
      </div>
    </div>
  );
}
