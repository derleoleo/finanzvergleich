import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Check, Zap, Loader2, Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Consent } from "@/entities/Consent";
import { LEGAL_DOC_VERSION, REQUIRED_CONSENT_TYPES } from "@/utils/legalVersion";

type Billing = "monthly" | "yearly";

const PREMIUM_FEATURES = [
  "Fonds-Sparvertrag (LV vs. Depot)",
  "Fonds-Einmalanlage",
  "Kostenaufschlüsselung",
  "BestAdvice Analyse",
  "Rentenlücken-Rechner",
  "Entnahmeplan",
  "PDF-Export",
  "Voreinstellungen",
  "Unbegrenzte Berechnungen",
  "Eigenes Logo auf PDFs",
  "Berater-Profil auf Auswertungen",
  "30 Tage kostenlos testen",
];

const PRICE_IDS = {
  monthly: (import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY as string) || null,
  yearly:  (import.meta.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY  as string) || null,
};

export default function Pricing() {
  const { session } = useAuth();
  const { isPaid, refreshSubscription } = useSubscription();
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Consent-Gate
  const [consentGateOpen, setConsentGateOpen] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentOkCached, setConsentOkCached] = useState(false);
  const [gateConsentB2B, setGateConsentB2B] = useState(false);
  const [gateConsentAVV, setGateConsentAVV] = useState(false);
  const [gateConsentAGB, setGateConsentAGB] = useState(false);
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [gateError, setGateError] = useState("");

  // Code-Einlösung
  const [codeInput, setCodeInput] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [codeSuccess, setCodeSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      const timer = setTimeout(() => refreshSubscription(), 2000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refreshSubscription]);

  const priceId = PRICE_IDS[billing];

  const handleCheckout = async () => {
    if (!session || !priceId) return;
    setLoadingCheckout(true);
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
      setLoadingCheckout(false);
    }
  };

  const handleUpgradeClick = async () => {
    if (!session) return;

    if (consentChecked && consentOkCached) {
      await handleCheckout();
      return;
    }
    if (consentChecked && !consentOkCached) {
      setConsentGateOpen(true);
      return;
    }

    try {
      const ok = await Consent.hasRequiredConsents(
        session.user.id,
        LEGAL_DOC_VERSION,
        REQUIRED_CONSENT_TYPES
      );
      setConsentChecked(true);
      setConsentOkCached(ok);
      if (ok) {
        await handleCheckout();
      } else {
        setConsentGateOpen(true);
      }
    } catch {
      await handleCheckout();
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

  const handleGateSubmit = async () => {
    if (!session) return;
    setGateSubmitting(true);
    setGateError("");
    try {
      await Consent.saveConsents(
        [...REQUIRED_CONSENT_TYPES].map((t) => ({
          consent_type: t,
          document_version: LEGAL_DOC_VERSION,
        })),
        session
      );
      setConsentOkCached(true);
      setConsentGateOpen(false);
      await handleCheckout();
    } catch {
      setGateError("Fehler beim Speichern der Zustimmung. Bitte versuchen Sie es erneut.");
    } finally {
      setGateSubmitting(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!session || !codeInput.trim()) return;
    setCodeLoading(true);
    setCodeError("");
    setCodeSuccess(false);
    try {
      const res = await fetch("/api/redeem-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: codeInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error ?? "Ungültiger Code");
      } else {
        setCodeSuccess(true);
        setCodeInput("");
        await refreshSubscription();
      }
    } catch {
      setCodeError("Verbindungsfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setCodeLoading(false);
    }
  };

  const gateCanSubmit = gateConsentB2B && gateConsentAVV && gateConsentAGB;

  const monthlyEquivalent = billing === "yearly" ? "50 €" : null;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Premium</h1>
          <p className="text-lg text-slate-600">
            Alle Rechner, unbegrenzte Simulationen, eigenes Branding.
          </p>
          {searchParams.get("checkout") === "success" && (
            <div className="mt-4 inline-block bg-green-100 text-green-800 text-sm font-medium px-4 py-2 rounded-full">
              Zahlung erfolgreich! Ihr Plan wird aktualisiert…
            </div>
          )}
          {codeSuccess && (
            <div className="mt-4 inline-block bg-green-100 text-green-800 text-sm font-medium px-4 py-2 rounded-full">
              Code eingelöst! Premium-Zugang für 30 Tage aktiviert.
            </div>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
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

        {/* Premium Card */}
        <div className="relative rounded-2xl bg-slate-800 ring-2 ring-blue-500 shadow-xl flex flex-col">
          <div className="p-6 pb-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/10 text-white">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-xs bg-blue-500 text-white font-semibold px-2 py-0.5 rounded-full">
                Alle Funktionen
              </span>
              {isPaid && (
                <span className="text-xs bg-green-500 text-white font-semibold px-2 py-0.5 rounded-full">
                  Ihr Plan
                </span>
              )}
            </div>

            <h3 className="text-2xl font-bold text-white">Premium</h3>

            <div className="flex items-end gap-1 mt-2">
              <span className="text-3xl font-bold text-white">
                {billing === "monthly" ? "59 €" : "599,99 €"}
              </span>
              <span className="text-sm mb-1 text-slate-300">
                {billing === "monthly" ? "/ pro Monat" : "/ pro Jahr"}
              </span>
            </div>

            {billing === "yearly" && monthlyEquivalent && (
              <p className="text-xs mt-1 font-medium text-blue-300">
                entspricht {monthlyEquivalent}/Monat – spare 108 €
              </p>
            )}
            {billing === "monthly" && (
              <p className="text-xs mt-1 text-slate-400">zzgl. MwSt.</p>
            )}
            {billing === "yearly" && (
              <p className="text-xs mt-1 text-slate-400">zzgl. MwSt. · statt 708 €</p>
            )}
          </div>

          <div className="px-6 pb-6 flex flex-col flex-1 space-y-4">
            <div className="space-y-2 flex-1">
              {PREMIUM_FEATURES.map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                  <span className="text-sm text-slate-200">{f}</span>
                </div>
              ))}
            </div>

            <div className="pt-2">
              {isPaid ? (
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white border-0"
                  onClick={handlePortal}
                  disabled={portalLoading}
                >
                  {portalLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Abo verwalten
                </Button>
              ) : priceId ? (
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white border-0"
                  onClick={handleUpgradeClick}
                  disabled={loadingCheckout}
                >
                  {loadingCheckout && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  30 Tage kostenlos testen
                </Button>
              ) : (
                <Button variant="outline" className="w-full" disabled>
                  Demnächst verfügbar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Code einlösen */}
        {!isPaid && (
          <div className="mt-8 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Zugangscode einlösen</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Sie haben einen Testcode erhalten? Geben Sie ihn hier ein und erhalten Sie 30 Tage Premium-Zugang.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleRedeemCode()}
                placeholder="XXXX-XXXX-XXXX"
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 font-mono tracking-widest"
              />
              <Button
                onClick={handleRedeemCode}
                disabled={codeLoading || !codeInput.trim()}
                className="bg-slate-800 hover:bg-slate-700 text-white shrink-0"
              >
                {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Einlösen"}
              </Button>
            </div>
            {codeError && (
              <p className="text-xs text-red-600 mt-2">{codeError}</p>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Kündigung jederzeit möglich. Bezahlung über Stripe – sicher und verschlüsselt.
          </p>
        </div>
      </div>

      {/* Consent-Gate-Modal */}
      {consentGateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Vertragsbedingungen bestätigen</h2>
            <p className="text-sm text-slate-600">
              Bitte bestätigen Sie die Vertragsbedingungen, bevor Sie fortfahren.
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gateConsentB2B}
                  onChange={(e) => setGateConsentB2B(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-slate-800 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  Ich bestätige, dass ich als Unternehmer im Sinne des § 14 BGB handle und die
                  Plattform ausschließlich zu gewerblichen Zwecken nutze.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gateConsentAVV}
                  onChange={(e) => setGateConsentAVV(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-slate-800 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  Ich stimme dem{" "}
                  <Link to="/legal/avv" target="_blank" className="text-blue-600 hover:underline">
                    Auftragsverarbeitungsvertrag (AVV)
                  </Link>{" "}
                  gemäß Art. 28 DSGVO zu.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gateConsentAGB}
                  onChange={(e) => setGateConsentAGB(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 accent-slate-800 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  Ich habe die{" "}
                  <Link to="/agb" target="_blank" className="text-blue-600 hover:underline">
                    AGB
                  </Link>{" "}
                  gelesen und stimme diesen zu.
                </span>
              </label>
            </div>

            {gateError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{gateError}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setConsentGateOpen(false)}>
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                disabled={!gateCanSubmit || gateSubmitting}
                onClick={handleGateSubmit}
              >
                {gateSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Weiter zu Stripe"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
