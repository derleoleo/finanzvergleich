import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

export type FundEntry = {
  id: string;
  name: string;
  allocation_eur: number;
  ongoing_costs_percent: number;
  initial_charge_percent?: number; // nur Depot
  identifier?: string;             // ISIN/WKN
};

type Props = {
  funds: FundEntry[];
  totalAmount: number;
  allocationLabel: string; // "Monatl. Einzelbeitrag (€)" oder "Einzelbetrag (€)"
  mode: "lv" | "depot";
  onChange: (funds: FundEntry[]) => void;
};

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

function toNum(v: any): number {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export default function MultiFundEditor({
  funds,
  totalAmount,
  allocationLabel,
  mode,
  onChange,
}: Props) {
  const isMulti = funds.length > 1;
  const allocSum = funds.reduce((s, f) => s + toNum(f.allocation_eur), 0);
  const diff = Math.abs(allocSum - totalAmount);
  const showWarning = isMulti && diff > 0.01;

  const add = () => {
    const entry: FundEntry = {
      id: genId(),
      name: `Fonds ${funds.length + 1}`,
      allocation_eur: 0,
      ongoing_costs_percent: 0,
      ...(mode === "depot" ? { initial_charge_percent: 0, identifier: "" } : {}),
    };
    onChange([...funds, entry]);
  };

  const remove = (id: string) => {
    if (funds.length <= 1) return;
    onChange(funds.filter((f) => f.id !== id));
  };

  const update = (id: string, field: keyof FundEntry, value: any) => {
    onChange(funds.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  return (
    <div className="space-y-3">
      {showWarning && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Summe der Einzelbeträge:{" "}
            <strong>{allocSum.toFixed(2)} €</strong> – Gesamtbetrag:{" "}
            <strong>{totalAmount.toFixed(2)} €</strong> (Differenz:{" "}
            {diff.toFixed(2)} €)
          </span>
        </div>
      )}

      {funds.map((fund, idx) => (
        <div
          key={fund.id}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
        >
          {isMulti && (
            <div className="flex items-center justify-between">
              <Input
                value={fund.name}
                onChange={(e) => update(fund.id, "name", e.target.value)}
                className="bg-white border-slate-300 font-medium w-44 h-8 text-sm"
                placeholder={`Fonds ${idx + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(fund.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                title="Fonds entfernen"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div
            className={`grid gap-3 ${
              mode === "depot"
                ? isMulti
                  ? "grid-cols-2 md:grid-cols-4"
                  : "grid-cols-1 md:grid-cols-3"
                : isMulti
                ? "grid-cols-1 md:grid-cols-2"
                : ""
            }`}
          >
            {isMulti && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-600">{allocationLabel}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={fund.allocation_eur || ""}
                  onChange={(e) =>
                    update(fund.id, "allocation_eur", toNum(e.target.value))
                  }
                  className="bg-white border-slate-300"
                />
              </div>
            )}

            {mode === "depot" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">ISIN/WKN</Label>
                  <Input
                    type="text"
                    value={fund.identifier || ""}
                    onChange={(e) =>
                      update(fund.id, "identifier", e.target.value)
                    }
                    className="bg-white border-slate-300"
                    placeholder="z.B. LU0553164731"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">
                    Ausgabeaufschlag (%)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={fund.initial_charge_percent ?? ""}
                    onChange={(e) =>
                      update(
                        fund.id,
                        "initial_charge_percent",
                        toNum(e.target.value)
                      )
                    }
                    className="bg-white border-slate-300"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <Label className="text-xs text-slate-600">
                Laufende Kosten p.a. (TER, %)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={fund.ongoing_costs_percent ?? ""}
                onChange={(e) =>
                  update(
                    fund.id,
                    "ongoing_costs_percent",
                    toNum(e.target.value)
                  )
                }
                className="bg-white border-slate-300"
              />
            </div>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={add}
        className="w-full border-dashed border-slate-300 text-slate-600 hover:border-slate-400"
      >
        <Plus className="w-4 h-4 mr-2" />
        Weiteren Fonds hinzufügen
      </Button>
    </div>
  );
}
