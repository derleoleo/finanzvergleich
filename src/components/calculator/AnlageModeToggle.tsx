import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Umschalter zwischen monatlicher Anlage (Sparvertrag) und einmaliger
 * Anlage (Einmalbetrag). Beide Rechner teilen sich so eine "Depot vs. LV"-Seite.
 */
export default function AnlageModeToggle({ mode }: { mode: "monthly" | "single" }) {
  const navigate = useNavigate();

  const base = "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200";
  const active = "bg-slate-800 text-white shadow";
  const inactive = "text-slate-600 hover:text-slate-900 hover:bg-slate-100";

  return (
    <div className="inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm" data-pdf-hide>
      <button
        type="button"
        className={`${base} ${mode === "monthly" ? active : inactive}`}
        onClick={() => { if (mode !== "monthly") navigate(createPageUrl("Calculator")); }}
      >
        Monatliche Anlage
      </button>
      <button
        type="button"
        className={`${base} ${mode === "single" ? active : inactive}`}
        onClick={() => { if (mode !== "single") navigate(createPageUrl("SinglePaymentCalculator")); }}
      >
        Einmalige Anlage
      </button>
    </div>
  );
}
