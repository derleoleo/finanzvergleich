import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReactNode } from "react";

import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PaidRoute from "@/components/PaidRoute";
import Layout from "@/Layout";

import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Calculator from "@/pages/Calculator";
import CalculatorDetail from "@/pages/CalculatorDetail";
import CalculatorCostsDetail from "@/pages/CalculatorCostsDetail";
import WithdrawalPlan from "@/pages/WithdrawalPlan";

import AllResults from "@/pages/AllResults";
import SinglePaymentCalculator from "@/pages/SinglePaymentCalculator";
import SinglePaymentDetail from "@/pages/SinglePaymentDetail";
import BestAdviceCalculator from "@/pages/BestAdviceCalculator";
import BestAdviceDetail from "@/pages/BestAdviceDetail";
import PensionGapCalculator from "@/pages/PensionGapCalculator";
import PensionGapDetail from "@/pages/PensionGapDetail";
import Profile from "@/pages/Profile";
import Defaults from "@/pages/Defaults";
import Pricing from "@/pages/Pricing";

import SimplePage from "@/pages/SimplePage";

/**
 * Wrapper für alle geschützten Seiten
 */
function PageShell({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
        <Routes>
          {/* Login (nicht geschützt, kein Layout) */}
          <Route path="/login" element={<Login />} />

          {/* Home */}
          <Route
            path="/"
            element={
              <PageShell>
                <Home />
              </PageShell>
            }
          />

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
                <WithdrawalPlan />
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
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
