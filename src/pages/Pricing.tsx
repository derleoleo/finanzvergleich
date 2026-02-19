import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Check, TrendingUp, Star, Zap, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

type Billing = "monthly" | "yearly";

const plans = [
  {
    name: "Free",
    description: "Grundlegende Vergleichsrechner für den Einstieg.",
    icon: TrendingUp,
    iconColor: "bg-slate-100 text-slate-600",
    highlight: false,
    planKey: "free" as const,
    monthly: { price: "0 €", period: "für immer", priceId: null as string | null },
    yearly:  { price: "0 €", period: "für immer", priceId: null as string | null },
    features: [
      "Fonds-Sparvertrag (LV vs. Depot)",
      "Fonds-Einmalanlage",
      "Kostenaufschlüsselung",
      "3 Berechnungen pro Monat",
    ],
    locked: [
      "BestAdvice Analyse",
      "Rentenlücken-Rechner",
      "Entnahmeplan",
      "PDF-Export",
      "10+ Berechnungen pro Monat",
    ],
  },
  {
    name: "Pro",
    description: "Alle Rechner und erweiterte Analysen für Berater und Selbstentscheider.",
    icon: Star,
    iconColor: "bg-blue-100 text-blue-600",
    highlight: true,
    planKey: "professional" as const,
    monthly: {
      price: "19,99 €",
      period: "pro Monat",
      priceId: (import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY as string) || null,
    },
    yearly: {
      price: "199,99 €",
      period: "pro Jahr",
      priceId: (import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY as string) || null,
    },
    features: [
      "Fonds-Sparvertrag (LV vs. Depot)",
      "Fonds-Einmalanlage",
      "Kostenaufschlüsselung",
      "BestAdvice Analyse",
      "Rentenlücken-Rechner",
      "Entnahmeplan",
      "PDF-Export",
      "Voreinstellungen",
      "10 Berechnungen pro Monat",
      "14 Tage kostenlos testen",
    ],
    locked: [],
  },
  {
    name: "Unlimited",
    description: "Für Finanzberater und Agenturen mit eigenem Branding.",
    icon: Zap,
    iconColor: "bg-purple-100 text-purple-600",
    highlight: false,
    planKey: "business" as const,
    monthly: {
      price: "34,99 €",
      period: "pro Monat",
      priceId: (import.meta.env.VITE_STRIPE_PRICE_UNLIMITED_MONTHLY as string) || null,
    },
    yearly: {
      price: "349,99 €",
      period: "pro Jahr",
      priceId: (import.meta.env.VITE_STRIPE_PRICE_UNLIMITED_YEARLY as string) || null,
    },
    features: [
      "Alles aus Pro",
      "14 Tage kostenlos testen",
      "Unbegrenzte Berechnungen",
      "Eigenes Logo auf PDF-Exporten",
      "Berater-Profil auf Auswertungen",
      "Prioritäts-Support",
    ],
    locked: [],
  },
];

export default function Pricing() {
  const { session } = useAuth();
  const { plan: currentPlan, isPaid, refreshSubscription } = useSubscription();
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [pendingPriceId, setPendingPriceId] = useState<string | null>(null);
  const [widerrufsChecked, setWiderrufsChecked] = useState(false);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      const timer = setTimeout(() => refreshSubscription(), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refreshSubscription]);

  const openWiderrufsModal = (priceId: string) => {
    setWiderrufsChecked(false);
    setPendingPriceId(priceId);
  };

  const confirmCheckout = async () => {
    if (!pendingPriceId) return;
    const priceId = pendingPriceId;
    setPendingPriceId(null);
    await handleCheckout(priceId);
  };

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
        <div className="text-center mb-10">
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

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`text-sm font-medium ${billing === "monthly" ? "text-slate-900" : "text-slate-400"}`}>
            Monatlich
          </span>
          <button
            onClick={() => setBilling(billing === "monthly" ? "yearly" : "monthly")}
            className={`relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none ${
              billing === "yearly" ? "bg-slate-800" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                billing === "yearly" ? "translate-x-7" : "translate-x-0"
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${billing === "yearly" ? "text-slate-900" : "text-slate-400"}`}>
              Jährlich
            </span>
            <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
              2 Monate gratis
            </span>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => {
            const current = plan[billing];
            const isCurrentPlan = currentPlan === plan.planKey;
            const isLoading = loadingPriceId === current.priceId;
            const dark = plan.highlight;

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl shadow-lg flex flex-col ${
                  dark
                    ? "bg-slate-800 ring-2 ring-blue-500"
                    : "bg-white border border-slate-200"
                }`}
              >
                {plan.planKey === "business" && (
                  <div className="absolute -top-4 right-4 z-10 rotate-2 bg-amber-400 text-amber-900 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-md whitespace-nowrap">
                    💡 1 LV im Jahr mehr → Jahresbeitrag drin
                  </div>
                )}
                <div className="p-6 pb-3">
                  {/* Icon + Badges */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      dark ? "bg-white/10 text-white" : plan.iconColor
                    }`}>
                      <plan.icon className="w-5 h-5" />
                    </div>
                    {dark && (
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

                  {/* Plan name */}
                  <h3 className={`text-2xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="flex items-end gap-1 mt-2">
                    <span className={`text-3xl font-bold ${dark ? "text-white" : "text-slate-900"}`}>
                      {current.price}
                    </span>
                    <span className={`text-sm mb-1 ${dark ? "text-slate-300" : "text-slate-500"}`}>
                      / {current.period}
                    </span>
                  </div>

                  {/* Savings hint */}
                  {billing === "yearly" && plan.planKey !== "free" && (
                    <p className={`text-xs mt-1 font-medium ${dark ? "text-blue-300" : "text-green-600"}`}>
                      {plan.planKey === "professional"
                        ? "statt 239,88 € – spare 39,89 €"
                        : "statt 419,88 € – spare 69,89 €"}
                    </p>
                  )}

                  {/* Description */}
                  <p className={`text-sm mt-2 ${dark ? "text-slate-300" : "text-slate-600"}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="px-6 pb-6 flex flex-col flex-1 space-y-4">
                  {/* Features */}
                  <div className="space-y-2 flex-1">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${dark ? "text-blue-400" : "text-green-500"}`} />
                        <span className={`text-sm ${dark ? "text-slate-200" : "text-slate-700"}`}>{feature}</span>
                      </div>
                    ))}
                    {plan.locked.map((feature) => (
                      <div key={feature} className="flex items-start gap-2 opacity-40">
                        <div className={`w-4 h-4 mt-0.5 shrink-0 rounded-full border-2 ${dark ? "border-slate-500" : "border-slate-300"}`} />
                        <span className={`text-sm line-through ${dark ? "text-slate-400" : "text-slate-400"}`}>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="pt-2">
                    {plan.planKey === "free" && (
                      <Link to={createPageUrl("Calculator")}>
                        <Button variant="outline" className="w-full">
                          Kostenlos starten
                        </Button>
                      </Link>
                    )}

                    {plan.planKey !== "free" && isCurrentPlan && isPaid && (
                      <Button
                        className={`w-full ${dark ? "bg-blue-500 hover:bg-blue-400 text-white border-0" : "bg-slate-800 hover:bg-slate-700 text-white"}`}
                        onClick={handlePortal}
                        disabled={portalLoading}
                      >
                        {portalLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Abo verwalten
                      </Button>
                    )}

                    {plan.planKey !== "free" && !isCurrentPlan && isPaid && (
                      <Button
                        variant="outline"
                        className={`w-full ${dark ? "border-white/30 text-white hover:bg-white/10" : ""}`}
                        onClick={handlePortal}
                        disabled={portalLoading}
                      >
                        {portalLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Plan wechseln
                      </Button>
                    )}

                    {plan.planKey !== "free" && !isPaid && current.priceId && (
                      <Button
                        className={`w-full ${dark ? "bg-blue-500 hover:bg-blue-400 text-white border-0" : "bg-slate-800 hover:bg-slate-700 text-white"}`}
                        onClick={() => openWiderrufsModal(current.priceId!)}
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        14 Tage kostenlos testen
                      </Button>
                    )}

                    {plan.planKey !== "free" && !isPaid && !current.priceId && (
                      <Button variant="outline" className="w-full" disabled>
                        Demnächst verfügbar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-slate-500">
            Kündigung jederzeit möglich. Bezahlung über Stripe – sicher und verschlüsselt.
          </p>
        </div>
      </div>

      {/* Widerrufsrecht-Modal */}
      {pendingPriceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Bestellung bestätigen</h2>
            <p className="text-sm text-slate-600">
              Sie starten jetzt einen <strong>14-tägigen kostenlosen Testzeitraum</strong>.
              Nach Ablauf beginnt das Abonnement automatisch, sofern Sie nicht vorher kündigen.
            </p>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={widerrufsChecked}
                onChange={(e) => setWiderrufsChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-slate-800 cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                Ich verlange ausdrücklich, dass mit der Ausführung des Vertrags vor Ablauf der
                Widerrufsfrist begonnen wird. Mir ist bekannt, dass ich dadurch mein{" "}
                <strong>Widerrufsrecht verliere</strong>.
              </span>
            </label>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPendingPriceId(null)}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                disabled={!widerrufsChecked || !!loadingPriceId}
                onClick={confirmCheckout}
              >
                {loadingPriceId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Weiter zu Stripe"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
