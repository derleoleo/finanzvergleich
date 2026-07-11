import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactNode, Suspense, lazy } from "react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/button";

import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PaidRoute from "@/components/PaidRoute";
import Layout from "@/Layout";
import { useAuth } from "@/contexts/AuthContext";
import ConsentGate from "@/components/ConsentGate";
import CookieBanner from "@/components/CookieBanner";

// Seiten lazy laden → jede Route wird ein eigener Chunk,
// das Initial-Bundle bleibt klein (v.a. Recharts-lastige Detail-Seiten)
const Login                   = lazy(() => import("@/pages/Login"));
const ResetPassword           = lazy(() => import("@/pages/ResetPassword"));
const Landing                 = lazy(() => import("@/pages/Landing"));
const Home                    = lazy(() => import("@/pages/Home"));
const Impressum               = lazy(() => import("@/pages/Impressum"));
const Datenschutz             = lazy(() => import("@/pages/Datenschutz"));
const AGB                     = lazy(() => import("@/pages/AGB"));
const AVV                     = lazy(() => import("@/pages/AVV"));
const Compliance              = lazy(() => import("@/pages/Compliance"));
const Calculator              = lazy(() => import("@/pages/Calculator"));
const CalculatorDetail        = lazy(() => import("@/pages/CalculatorDetail"));
const CalculatorCostsDetail   = lazy(() => import("@/pages/CalculatorCostsDetail"));
const WithdrawalPlan          = lazy(() => import("@/pages/WithdrawalPlan"));
const WithdrawalPlanDetail    = lazy(() => import("@/pages/WithdrawalPlanDetail"));
const AllResults              = lazy(() => import("@/pages/AllResults"));
const SinglePaymentCalculator = lazy(() => import("@/pages/SinglePaymentCalculator"));
const SinglePaymentDetail     = lazy(() => import("@/pages/SinglePaymentDetail"));
const BestAdviceCalculator    = lazy(() => import("@/pages/BestAdviceCalculator"));
const BestAdviceDetail        = lazy(() => import("@/pages/BestAdviceDetail"));
const NetPolicyCalculator     = lazy(() => import("@/pages/NetPolicyCalculator"));
const PensionGapCalculator    = lazy(() => import("@/pages/PensionGapCalculator"));
const PensionGapDetail        = lazy(() => import("@/pages/PensionGapDetail"));
const Profile                 = lazy(() => import("@/pages/Profile"));
const Defaults                = lazy(() => import("@/pages/Defaults"));
const Pricing                 = lazy(() => import("@/pages/Pricing"));
const SimplePage              = lazy(() => import("@/pages/SimplePage"));

/** Dezenter Ladeindikator während ein Seiten-Chunk nachgeladen wird */
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
    </div>
  );
}

/**
 * Fallback-Seite bei unerwarteten Render-Fehlern (Sentry ErrorBoundary)
 */
function ErrorFallback() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">
          Etwas ist schiefgelaufen
        </h1>
        <p className="text-slate-600">
          Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite
          neu. Sollte das Problem bestehen bleiben, kontaktieren Sie uns über
          das Feedback-Formular.
        </p>
        <Button
          className="bg-slate-800 hover:bg-slate-700 text-white"
          onClick={() => window.location.reload()}
        >
          Seite neu laden
        </Button>
      </div>
    </div>
  );
}

/**
 * Wrapper für alle geschützten Seiten
 */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <ConsentGate>
        <Layout>{children}</Layout>
      </ConsentGate>
    </ProtectedRoute>
  );
}

/**
 * / → Landing für Gäste, Übersicht für eingeloggte Nutzer
 */
function SmartRoot() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Landing />;
  return <PageShell><Home /></PageShell>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
        <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Login (nicht geschützt, kein Layout) */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Root: Landing (Gast) oder Übersicht (eingeloggt) */}
          <Route path="/" element={<SmartRoot />} />

          {/* Rechtliches – öffentlich */}
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/agb" element={<AGB />} />
          <Route path="/legal/avv" element={<AVV />} />
          <Route path="/compliance" element={<Compliance />} />

          {/* Fonds-Sparvertrag */}
          <Route
            path="/calculator"
            element={
              <PageShell>
                <Calculator />
              </PageShell>
            }
          />
          <Route
            path="/calculator/detail"
            element={
              <PageShell>
                <CalculatorDetail />
              </PageShell>
            }
          />
          <Route
            path="/calculator/costs"
            element={
              <PageShell>
                <CalculatorCostsDetail />
              </PageShell>
            }
          />

          {/* Einmalanlage */}
          <Route
            path="/single-payment"
            element={
              <PageShell>
                <SinglePaymentCalculator />
              </PageShell>
            }
          />
          <Route
            path="/single-payment/detail"
            element={
              <PageShell>
                <SinglePaymentDetail />
              </PageShell>
            }
          />

          {/* BestAdvice */}
          <Route
            path="/best-advice"
            element={
              <PageShell>
                <PaidRoute featureName="BestAdvice Analyse">
                  <BestAdviceCalculator />
                </PaidRoute>
              </PageShell>
            }
          />
          <Route
            path="/best-advice/detail"
            element={
              <PageShell>
                <PaidRoute featureName="BestAdvice Analyse">
                  <BestAdviceDetail />
                </PaidRoute>
              </PageShell>
            }
          />

          {/* Netto- vs. Bruttopolice (Honorarberatung, per Voreinstellung freigeschaltet) */}
          <Route
            path="/net-policy"
            element={
              <PageShell>
                <PaidRoute featureName="Netto- vs. Bruttopolice">
                  <NetPolicyCalculator />
                </PaidRoute>
              </PageShell>
            }
          />

          {/* Rentenlücke */}
          <Route
            path="/pension-gap"
            element={
              <PageShell>
                <PaidRoute featureName="Rentenlücken-Rechner">
                  <PensionGapCalculator />
                </PaidRoute>
              </PageShell>
            }
          />
          <Route
            path="/pension-gap/detail"
            element={
              <PageShell>
                <PaidRoute featureName="Rentenlücken-Rechner">
                  <PensionGapDetail />
                </PaidRoute>
              </PageShell>
            }
          />

          {/* Entnahmeplan */}
          <Route
            path="/withdrawal-plan"
            element={
              <PageShell>
                <PaidRoute featureName="Entnahmeplan">
                  <WithdrawalPlan />
                </PaidRoute>
              </PageShell>
            }
          />
          <Route
            path="/withdrawal-plan/detail"
            element={
              <PageShell>
                <PaidRoute featureName="Entnahmeplan">
                  <WithdrawalPlanDetail />
                </PaidRoute>
              </PageShell>
            }
          />

          {/* Ergebnisse */}
          <Route
            path="/results"
            element={
              <PageShell>
                <AllResults />
              </PageShell>
            }
          />

          {/* Profil / Pricing */}
          <Route
            path="/profile"
            element={
              <PageShell>
                <Profile />
              </PageShell>
            }
          />
          <Route
            path="/defaults"
            element={
              <PageShell>
                <PaidRoute featureName="Voreinstellungen">
                  <Defaults />
                </PaidRoute>
              </PageShell>
            }
          />
          <Route
            path="/pricing"
            element={
              <PageShell>
                <Pricing />
              </PageShell>
            }
          />

          {/* Fallback */}
          <Route
            path="*"
            element={
              <PageShell>
                <SimplePage
                  title="404"
                  hint="Diese Seite existiert noch nicht."
                />
              </PageShell>
            }
          />
        </Routes>
        </Suspense>
        </Sentry.ErrorBoundary>
        </SubscriptionProvider>
        <CookieBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
