import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, TrendingUp, Star, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

const plans = [
  {
    name: "Free",
    price: "0 €",
    period: "für immer",
    description: "Grundlegende Vergleichsrechner für den Einstieg.",
    icon: TrendingUp,
    iconColor: "bg-slate-100 text-slate-600",
    highlight: false,
    planKey: "free" as const,
    priceId: null,
    features: [
      "Fonds-Sparvertrag (LV vs. Depot)",
      "Fonds-Einmalanlage",
      "Kostenaufschlüsselung",
      "Bis zu 3 Berechnungen",
    ],
    locked: [
      "BestAdvice Analyse",
      "Rentenlücken-Rechner",
      "PDF-Export",
    ],
  },
  {
    name: "Professional",
    price: "9,99 €",
    period: "pro Monat",
    description: "Alle Rechner und erweiterte Analysen für Berater und Selbstentscheider.",
    icon: Star,
    iconColor: "bg-blue-100 text-blue-600",
    highlight: true,
    planKey: "professional" as const,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL as string | undefined,
    features: [
      "Alles aus Free",
      "BestAdvice Analyse",
      "Rentenlücken-Rechner",
      "Entnahmeplan",
      "Unbegrenzte Berechnungen",
      "PDF-Export (mit Profil)",
    ],
    locked: [],
  },
  {
    name: "Business",
    price: "24,99 €",
    period: "pro Monat",
    description: "Für Finanzberater und Agenturen mit eigenem Branding.",
    icon: Zap,
    iconColor: "bg-purple-100 text-purple-600",
    highlight: false,
    planKey: "business" as const,
    priceId: import.meta.env.VITE_STRIPE_PRICE_BUSINESS as string | undefined,
    features: [
      "Alles aus Professional",
      "Eigenes Logo auf PDF-Exporten",
      "Berater-Profil auf Auswertungen",
      "Mehrere Berater-Profile",
      "Prioritäts-Support",
    ],
    locked: [],
  },
];

export default function Pricing() {
  const { session } = useAuth();
  const { plan: currentPlan, isPaid, refreshSubscription } = useSubscription();
  const [searchParams] = useSearchParams();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  // Nach erfolgreichem Checkout Subscription aktualisieren
  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      const timer = setTimeout(() => refreshSubscription(), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refreshSubscription]);

  const handleCheckout = async (priceId: string) => {
    if (!session) return;
    setLoadingPriceId(priceId);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Checkout-Fehler:", err);
    } finally {
      setLoadingPriceId(null);
    }
  };

  const handlePortal = async () => {
    if (!session) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Portal-Fehler:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Premium</h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Wählen Sie den Plan, der zu Ihnen passt.
          </p>
          {searchParams.get("checkout") === "success" && (
            <div className="mt-4 inline-block bg-green-100 text-green-800 text-sm font-medium px-4 py-2 rounded-full">
              Zahlung erfolgreich! Ihr Plan wird aktualisiert…
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.planKey;
            const isLoading = loadingPriceId === plan.priceId;

            return (
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
                    {isCurrentPlan && (
                      <span className="text-xs bg-green-500 text-white font-semibold px-2 py-0.5 rounded-full">
                        Ihr Plan
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
                    {/* Free plan */}
                    {plan.planKey === "free" && (
                      <Link to={createPageUrl("Calculator")}>
                        <Button variant="outline" className="w-full">
                          Kostenlos starten
                        </Button>
                      </Link>
                    )}

                    {/* Aktueller bezahlter Plan → Portal */}
                    {plan.planKey !== "free" && isCurrentPlan && isPaid && (
                      <Button
                        className={`w-full ${plan.highlight ? "bg-blue-500 hover:bg-blue-400 text-white border-0" : "bg-slate-800 hover:bg-slate-700 text-white"}`}
                        onClick={handlePortal}
                        disabled={portalLoading}
                      >
                        {portalLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Abo verwalten
                      </Button>
                    )}

                    {/* Anderer bezahlter Plan → Portal (Plan wechseln) */}
                    {plan.planKey !== "free" && !isCurrentPlan && isPaid && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handlePortal}
                        disabled={portalLoading}
                      >
                        {portalLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Plan wechseln
                      </Button>
                    )}

                    {/* Free-Nutzer → Checkout */}
                    {plan.planKey !== "free" && !isPaid && plan.priceId && (
                      <Button
                        className={`w-full ${plan.highlight ? "bg-blue-500 hover:bg-blue-400 text-white border-0" : "bg-slate-800 hover:bg-slate-700 text-white"}`}
                        onClick={() => handleCheckout(plan.priceId!)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Jetzt abonnieren
                      </Button>
                    )}

                    {/* Fallback: kein priceId konfiguriert */}
                    {plan.planKey !== "free" && !isPaid && !plan.priceId && (
                      <Button variant="outline" className="w-full" disabled>
                        Demnächst verfügbar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ / Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Kündigung jederzeit möglich. Bezahlung über Stripe – sicher und verschlüsselt.
          </p>
        </div>
      </div>
    </div>
  );
}
