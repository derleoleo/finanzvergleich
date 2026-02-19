import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, TrendingUp, Star, Zap, Mail } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "0 €",
    period: "für immer",
    description: "Grundlegende Vergleichsrechner für den Einstieg.",
    icon: TrendingUp,
    iconColor: "bg-slate-100 text-slate-600",
    highlight: false,
    features: [
      "Fonds-Sparvertrag (LV vs. Depot)",
      "Fonds-Einmalanlage",
      "Kostenaufschlüsselung",
      "Lokale Speicherung (Browser)",
    ],
    locked: [
      "BestAdvice Analyse",
      "Rentenlücken-Rechner",
      "Entnahmeplan",
      "PDF-Export",
    ],
    cta: "Kostenlos starten",
    ctaHref: createPageUrl("Calculator"),
    ctaVariant: "outline" as const,
  },
  {
    name: "Professional",
    price: "9,99 €",
    period: "pro Monat",
    description: "Alle Rechner und erweiterte Analysen für Berater und Selbstentscheider.",
    icon: Star,
    iconColor: "bg-blue-100 text-blue-600",
    highlight: true,
    features: [
      "Alles aus Free",
      "BestAdvice Analyse",
      "Rentenlücken-Rechner",
      "Entnahmeplan",
      "Unbegrenzte Berechnungen",
      "PDF-Export (mit Profil)",
    ],
    locked: [],
    cta: "Jetzt anfragen",
    ctaHref: "mailto:info@rentencheck.app?subject=Professional+Abo",
    ctaVariant: "default" as const,
  },
  {
    name: "Business",
    price: "24,99 €",
    period: "pro Monat",
    description: "Für Finanzberater und Agenturen mit eigenem Branding.",
    icon: Zap,
    iconColor: "bg-purple-100 text-purple-600",
    highlight: false,
    features: [
      "Alles aus Professional",
      "Eigenes Logo auf PDF-Exporten",
      "Berater-Profil auf Auswertungen",
      "Mehrere Berater-Profile",
      "Prioritäts-Support",
    ],
    locked: [],
    cta: "Jetzt anfragen",
    ctaHref: "mailto:info@rentencheck.app?subject=Business+Abo",
    ctaVariant: "outline" as const,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Premium</h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Wählen Sie den Plan, der zu Ihnen passt. Alle Pläne beinhalten vollständige
            Datenhaltung im Browser – keine Datenweitergabe.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`border-0 shadow-lg flex flex-col ${
                plan.highlight
                  ? "bg-slate-800 text-white ring-2 ring-blue-500 scale-105"
                  : "bg-white"
              }`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    plan.highlight ? "bg-white/10 text-white" : plan.iconColor
                  }`}>
                    <plan.icon className="w-5 h-5" />
                  </div>
                  {plan.highlight && (
                    <span className="text-xs bg-blue-500 text-white font-semibold px-2 py-0.5 rounded-full">
                      Empfohlen
                    </span>
                  )}
                </div>
                <CardTitle className={`text-2xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                  {plan.name}
                </CardTitle>
                <div className="flex items-end gap-1 mt-2">
                  <span className={`text-3xl font-bold ${plan.highlight ? "text-white" : "text-slate-900"}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm mb-1 ${plan.highlight ? "text-slate-300" : "text-slate-500"}`}>
                    / {plan.period}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${plan.highlight ? "text-slate-300" : "text-slate-600"}`}>
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 space-y-4">
                <div className="space-y-2 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? "text-blue-400" : "text-green-500"}`} />
                      <span className={`text-sm ${plan.highlight ? "text-slate-200" : "text-slate-700"}`}>{feature}</span>
                    </div>
                  ))}
                  {plan.locked.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 opacity-40">
                      <div className={`w-4 h-4 mt-0.5 shrink-0 rounded-full border-2 ${plan.highlight ? "border-slate-500" : "border-slate-300"}`} />
                      <span className={`text-sm line-through ${plan.highlight ? "text-slate-400" : "text-slate-400"}`}>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  {plan.ctaHref.startsWith("mailto:") ? (
                    <a href={plan.ctaHref} className="block">
                      <Button
                        variant={plan.ctaVariant}
                        className={`w-full ${
                          plan.highlight
                            ? "bg-blue-500 hover:bg-blue-400 text-white border-0"
                            : plan.ctaVariant === "default"
                            ? "bg-slate-800 hover:bg-slate-700 text-white"
                            : ""
                        }`}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {plan.cta}
                      </Button>
                    </a>
                  ) : (
                    <Link to={plan.ctaHref}>
                      <Button
                        variant={plan.ctaVariant}
                        className={`w-full ${
                          plan.highlight ? "bg-blue-500 hover:bg-blue-400 text-white border-0" : ""
                        }`}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ / Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Fragen zum Abo? Schreiben Sie uns an{" "}
            <a href="mailto:info@rentencheck.app" className="underline hover:text-slate-700">
              info@rentencheck.app
            </a>
            . Kündigung jederzeit möglich.
          </p>
        </div>
      </div>
    </div>
  );
}
