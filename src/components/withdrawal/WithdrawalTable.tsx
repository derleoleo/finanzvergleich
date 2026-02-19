import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";

type WithdrawalRow = {
  year: number;
  age: number;
  startCapital: number;
  withdrawal: number;
  growth: number;
  endCapital: number;
  isLastYear?: boolean;
};

type Props = {
  data: WithdrawalRow[];
  isDetailMode: boolean;
  onSpecialWithdrawalChange: (year: number, amount: string) => void;
  forPrint?: boolean;
};

export default function WithdrawalTable({ data, isDetailMode, onSpecialWithdrawalChange, forPrint = false }: Props) {


  // For print, show all data. For screen, show first 10 years and last few years
  const displayData = forPrint || data.length <= 15 
    ? data
    : [...data.slice(0, 11), ...data.slice(-4)];

  const showEllipsis = !forPrint && data.length > 15;

  return (
    <Card className="border-0 shadow-lg bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
            <FileText className="w-4 h-4 text-green-600" />
          </div>
          Jahresübersicht
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={forPrint ? "" : "max-h-96 overflow-y-auto"}>
          <Table>
            <TableHeader className={forPrint ? "" : "sticky top-0 bg-white"}>
              <TableRow className="border-slate-200">
                <TableHead className="font-semibold text-slate-700">Jahr</TableHead>
                <TableHead className="font-semibold text-slate-700">Alter</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Startkapital</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Entnahme</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Wachstum</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Restkapital</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayData.map((row, index) => {
                const isEllipsisRow = showEllipsis && index === 11;
                const isLastYears = showEllipsis && index > 11;
                const actualIndex = isLastYears ? data.length - (displayData.length - index) : index;
                const rowData = isLastYears ? data[actualIndex] : row;
                
                if (isEllipsisRow) {
                  return (
                    <TableRow key="ellipsis" className="border-slate-100">
                      <TableCell colSpan={6} className="text-center text-slate-400 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                          <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                          <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
                
                return (
                  <TableRow 
                    key={rowData.year} 
                    className={`border-slate-100 ${
                      rowData.isLastYear ? 'bg-purple-50' :
                      rowData.endCapital === 0 ? 'bg-red-50' : 
                      rowData.year === 0 ? 'bg-blue-50' : ''
                    }`}
                  >
                    <TableCell className="font-medium text-slate-900">
                      {rowData.year}
                      {rowData.year === 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">Start</Badge>
                      )}
                      {rowData.isLastYear && (
                        <Badge className="ml-2 text-xs bg-purple-600">Komplett</Badge>
                      )}
                      {rowData.endCapital === 0 && rowData.year > 0 && !rowData.isLastYear && (
                        <Badge variant="destructive" className="ml-2 text-xs">Ende</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">
                      {rowData.age}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-700">
                      {formatCurrency(rowData.startCapital)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {isDetailMode && rowData.year > 0 && !rowData.isLastYear && !forPrint ? (
                        <Input
                          type="number"
                          defaultValue={rowData.withdrawal}
                          onBlur={(e) => onSpecialWithdrawalChange(rowData.year, e.target.value)}
                          className="w-28 h-8 text-right bg-white"
                        />
                      ) : (
                        rowData.withdrawal > 0 ? `−${formatCurrency(rowData.withdrawal)}` : '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {rowData.growth > 0 ? `+${formatCurrency(rowData.growth)}` : '—'}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${
                      rowData.endCapital === 0 ? 'text-red-600' : 'text-slate-900'
                    }`}>
                      {formatCurrency(rowData.endCapital)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        
        {!forPrint && (
          <div className="mt-4 text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-50 border border-purple-200 rounded"></div>
              <span>Letztes Jahr (Komplettentnahme bis Alter 85)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
              <span>Jahr mit Kapitalende (vor Alter 85)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
              <span>Startjahr (Wachstum ohne Entnahme)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}