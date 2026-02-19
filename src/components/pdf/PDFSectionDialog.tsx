import { useState } from "react";
import { FileDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PDFSection = {
  id: string;
  label: string;
  defaultChecked?: boolean;
};

type Props = {
  sections: PDFSection[];
  isExporting: boolean;
  onExport: (selectedIds: string[]) => void;
  onClose: () => void;
};

export default function PDFSectionDialog({ sections, isExporting, onExport, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(sections.filter((s) => s.defaultChecked !== false).map((s) => s.id))
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked = selected.size === sections.length;
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(sections.map((s) => s.id)));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">PDF erstellen</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Welche Bereiche soll die PDF enthalten?
        </p>

        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <label className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer border-b border-slate-100">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              className="w-4 h-4 accent-slate-800"
            />
            <span className="text-sm font-medium text-slate-700">Alle auswählen</span>
          </label>
          {sections.map((section) => (
            <label
              key={section.id}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
            >
              <input
                type="checkbox"
                checked={selected.has(section.id)}
                onChange={() => toggle(section.id)}
                className="w-4 h-4 accent-slate-800"
              />
              <span className="text-sm text-slate-700">{section.label}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Abbrechen
          </Button>
          <Button
            className="flex-1 bg-slate-800 hover:bg-slate-700"
            disabled={selected.size === 0 || isExporting}
            onClick={() => onExport([...selected])}
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            {isExporting ? "Erstelle PDF..." : "PDF erstellen"}
          </Button>
        </div>
      </div>
    </div>
  );
}
