import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card } from "@/components/ui/card";
import {
  Calculator, DollarSign, Target, TrendingDown, Wallet, ArrowRight,
} from "lucide-react";

const calculators = [
  {
    icon: Calculator,
    title: "Fonds-Sparvertrag",
    description: "Monatliche Sparrate vergleichen: Lebensversicherung vs. Direktanlage im Depot. Inklusive Kostenanalyse und Steuervergleich.",
    href: createPageUrl("Calculator"),
    color: "bg-blue-100 text-blue-600",
    badge: "Hauptrechner",
  },
  {
    icon: DollarSign,
    title: "Fonds-Einmalanlage",
    description: "Einmalbetrag anlegen: LV vs. Depot. Ideal für Erbschaften, Bonuszahlungen oder vorhandenes Kapital.",
    href: createPageUrl("SinglePaymentCalculator"),
    color: "bg-green-100 text-green-600",
    badge: null,
  },
  {
    icon: Target,
    title: "BestAdvice",
    description: "Bestandsvertrag analysieren: Lohnt sich die Umschichtung von Kapital und Sparrate in eine Fonds-LV?",
    href: createPageUrl("BestAdviceCalculator"),
    color: "bg-purple-100 text-purple-600",
    badge: null,
  },
  {
    icon: TrendingDown,
    title: "Rentenlücke",
    description: "Versorgungslücke im Ruhestand berechnen und den monatlichen Sparbedarf zur Schließung der Lücke ermitteln.",
    href: createPageUrl("PensionGapCalculator"),
    color: "bg-red-100 text-red-600",
    badge: null,
  },
  {
    icon: Wallet,
    title: "Entnahmeplan",
    description: "Kapitalentnahme simulieren: Wie lange reicht das Kapital? Optimale Entnahmebeträge berechnen.",
    href: createPageUrl("WithdrawalPlan"),
    color: "bg-amber-100 text-amber-600",
    badge: null,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Übersicht</h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            Alle Rechner auf einen Blick. Analysieren Sie Finanzprodukte, berechnen Sie Rentenlücken
            und planen Sie Ihre Entnahmen – vollständig lokal und ohne Datenweitergabe.
          </p>
        </div>

        {/* Calculator cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {calculators.map((calc) => (
            <Link key={calc.title} to={calc.href} className="group block">
              <Card className="border-0 shadow-lg bg-white h-full transition-all duration-200 group-hover:shadow-xl group-hover:-translate-y-0.5">
                <div className="p-6 h-full flex flex-col items-center justify-center text-center">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${calc.color} mb-4`}>
                    <calc.icon className="w-6 h-6" />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-lg font-bold text-slate-900">{calc.title}</h2>
                    {calc.badge && (
                      <span className="text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                        {calc.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed">{calc.description}</p>

                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                    Zum Rechner
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Info */}
        <div className="mt-10 p-6 bg-white rounded-2xl shadow-lg border-0">
          <h3 className="font-semibold text-slate-900 mb-2">Hinweis</h3>
          <p className="text-sm text-slate-600">
            Alle Berechnungen erfolgen lokal in Ihrem Browser. Es werden keine Daten an externe Server
            übermittelt. Die Ergebnisse dienen der Orientierung und ersetzen keine individuelle
            Finanzberatung.
          </p>
        </div>
      </div>
    </div>
  );
}
