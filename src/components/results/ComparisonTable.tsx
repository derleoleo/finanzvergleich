import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Building2 } from "lucide-react";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";

type Props = {
  calculation: any;
};

export default function ComparisonTable({ calculation }: Props) {
  const results = calculation?.results;

  if (!results) return null;

  const rows = [
    {
      metric: "Eingezahlt gesamt",
      lifeInsurance: formatCurrency(results.total_contributions ?? 0),
      depot: formatCurrency(results.total_contributions ?? 0),
      highlight: false,
    },
    {
      metric: "Kapital brutto",
      lifeInsurance: formatCurrency(results.life_insurance_gross ?? 0),
      depot: formatCurrency(results.depot_gross ?? 0),
      highlight: false,
    },
    {
      metric: "Steuern",
      lifeInsurance: formatCurrency(
        (results.life_insurance_gross ?? 0) - (results.life_insurance_net ?? 0)
      ),
      depot: formatCurrency(
        (results.depot_gross ?? 0) - (results.depot_net ?? 0)
      ),
      highlight: false,
    },
    {
      metric: "Kapital netto",
      lifeInsurance: formatCurrency(results.life_insurance_net ?? 0),
      depot: formatCurrency(results.depot_net ?? 0),
      highlight: true,
    },
  ];

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">≙</span>
          </div>
          Detailvergleich
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="font-semibold text-slate-700">
                Kennzahl
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  Lebensversicherung
                </div>
              </TableHead>
              <TableHead className="font-semibold text-slate-700 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Direktanlage
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.map((row, idx) => (
              <TableRow
                key={idx}
                className={`border-slate-100 ${
                  row.highlight ? "bg-slate-50" : ""
                }`}
              >
                <TableCell className="font-medium text-slate-900">
                  {row.metric}
                  {row.highlight && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Endergebnis
                    </Badge>
                  )}
                </TableCell>

                <TableCell
                  className={`text-center font-medium ${
                    row.highlight ? "text-blue-600 text-lg" : "text-slate-700"
                  }`}
                >
                  {row.lifeInsurance}
                </TableCell>

                <TableCell
                  className={`text-center font-medium ${
                    row.highlight ? "text-green-600 text-lg" : "text-slate-700"
                  }`}
                >
                  {row.depot}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
