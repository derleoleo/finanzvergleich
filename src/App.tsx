import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Component, ReactNode, Suspense, lazy } from "react";
import { Button } from "@/components/ui/button";

import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PaidRoute from "@/components/PaidRoute";
import { useAuth } from "@/contexts/AuthContext";
import { vielleichtAngemeldet } from "@/utils/vielleichtAngemeldet";
import CookieBanner from "@/components/CookieBanner";
import { werbecodeAusAdresseMerken } from "@/utils/werbung";
import { fehlerMelden } from "@/utils/fehlermelder";

/*
 * Auch der Rahmen der geschuetzten Seiten wird nachgeladen.
 *
 * `Layout` und `ConsentGate` greifen beide auf Supabase zu. Statisch
 * importiert hielten sie damit 212,7 kB im Eintrittsbuendel - fuer Seiten, die
 * ohnehin nur hinter der Anmeldung erscheinen (gemessen, siehe
 * docs/startseite-buendel.md). Sie liegen innerhalb des `Suspense` weiter
 * unten, der Ladeindikator gilt also auch fuer sie.
 */
const Layout      = lazy(() => import("@/Layout"));
const ConsentGate = lazy(() => import("@/components/ConsentGate"));

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
const FassungAnsicht          = lazy(() => import("@/pages/FassungAnsicht"));
const AllResults              = lazy(() => import("@/pages/AllResults"));
const SinglePaymentCalculator = lazy(() => import("@/pages/SinglePaymentCalculator"));
const SinglePaymentDetail     = lazy(() => import("@/pages/SinglePaymentDetail"));
const Beispiel                = lazy(() => import("@/pages/Beispiel"));
const BestAdviceCalculator    = lazy(() => import("@/pages/BestAdviceCalculator"));
const BestAdviceDetail        = lazy(() => import("@/pages/BestAdviceDetail"));
const NetPolicyCalculator     = lazy(() => import("@/pages/NetPolicyCalculator"));
const AvdCalculator           = lazy(() => import("@/pages/AvdCalculator"));
const PensionGapCalculator    = lazy(() => import("@/pages/PensionGapCalculator"));
const PensionGapDetail        = lazy(() => import("@/pages/PensionGapDetail"));
const Profile                 = lazy(() => import("@/pages/Profile"));
const Defaults                = lazy(() => import("@/pages/Defaults"));
const Pricing                 = lazy(() => import("@/pages/Pricing"));
const NotFound                = lazy(() => import("@/pages/NotFound"));

/** Dezenter Ladeindikator während ein Seiten-Chunk nachgeladen wird */
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
    </div>
  );
}

/**
 * Fallback-Seite bei unerwarteten Render-Fehlern
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
 * Fehlergrenze für Render-Fehler.
 *
 * Vorher war das `Sentry.ErrorBoundary`. Die zog `@sentry/react` statisch in
 * das Eintrittsbuendel - 45,1 kB gzip von 137,0 kB, vor dem ersten Bild (siehe
 * docs/startseite-buendel.md). Sentry wird jetzt nachgeladen, und diese Grenze
 * meldet ueber `fehlerMelden`: Tritt der Fehler auf, bevor Sentry da ist,
 * wartet die Meldung in der Warteschlange und geht danach raus.
 *
 * React bietet fuer Render-Fehler nur Klassenkomponenten an - deshalb hier
 * eine, obwohl das Projekt sonst keine hat.
 */
class Fehlergrenze extends Component<{ children: ReactNode }, { gefallen: boolean }> {
  state = { gefallen: false };

  static getDerivedStateFromError() {
    return { gefallen: true };
  }

  componentDidCatch(fehler: Error, info: { componentStack?: string | null }) {
    fehlerMelden(fehler, {
      quelle: "react.render",
      // Dieselbe Angabe, die Sentrys eigene Grenze mitgeschickt hat.
      componentStack: info.componentStack ?? undefined,
    });
  }

  render() {
    return this.state.gefallen ? <ErrorFallback /> : this.props.children;
  }
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
/**
 * Preise fuer alle sichtbar.
 *
 * Die Seite lag hinter `PageShell` und damit hinter `ProtectedRoute`: Jeder
 * Besucher, der von einer Anzeige oder aus der Suche auf die Preise kam,
 * landete im Login. Gaeste bekommen sie jetzt ohne Seitenleiste, Angemeldete
 * unveraendert im gewohnten Rahmen - dasselbe Muster wie `SmartRoot`.
 */
/*
 * Warten nur, wenn eine Anmeldung ueberhaupt in Frage kommt.
 *
 * Beide Seiten gaben waehrend `loading` `null` zurueck. Geladen wurde dafuer
 * Supabase - und damit sah ein Besucher aus der Suche nichts, bis 212,7 kB
 * geladen und ausgefuehrt waren, obwohl Landingpage und Preisseite von der
 * Anmeldung nichts brauchen.
 *
 * `vielleichtAngemeldet()` beantwortet synchron und ohne eine Zeile
 * Supabase-Code, ob im Browser ueberhaupt eine Sitzung liegen kann. Ist keine
 * da, erscheint die oeffentliche Seite sofort. Liegt eine da, wird wie bisher
 * gewartet - fuer Angemeldete aendert sich also nichts, und das Flackern,
 * wegen dem hier `null` stand, entsteht nicht.
 */
function SmartPricing() {
  const { user, loading } = useAuth();
  if (loading) return vielleichtAngemeldet() ? null : <Pricing />;
  if (!user) return <Pricing />;
  return <PageShell><Pricing /></PageShell>;
}

/**
 * Die 404-Ansicht war fuer Gaeste unerreichbar.
 *
 * Sie lag hinter `PageShell` und damit hinter `ProtectedRoute`: Ein Gast auf
 * einer unbekannten Adresse landete nicht auf „nicht gefunden", sondern im
 * Login - ohne jeden Hinweis darauf, dass die Adresse selbst falsch war.
 * Dasselbe Muster, aus demselben Grund wie `SmartPricing` darueber.
 *
 * Seit dem harten 404 (siehe `src/utils/adressen.ts`) erscheint diese Ansicht
 * nur noch nach einer Navigation innerhalb der Anwendung; wer die Adresse
 * eintippt, bekommt die statische `404.html` mit Status 404. Beide zeigen
 * denselben Text und dieselben vier Wege.
 */
function SmartNotFound() {
  const { user, loading } = useAuth();
  if (loading) return vielleichtAngemeldet() ? null : <NotFound />;
  if (!user) return <NotFound />;
  return <PageShell><NotFound /></PageShell>;
}

function SmartRoot() {
  const { user, loading } = useAuth();
  if (loading) return vielleichtAngemeldet() ? null : <Landing />;
  if (!user) return <Landing />;
  return <PageShell><Home /></PageShell>;
}

export default function App() {
  // Empfehlungslink: ?ref= einmal beim Start merken. Die Zuordnung passiert
  // erst nach der Anmeldung (src/contexts/AuthContext.tsx).
  werbecodeAusAdresseMerken();

  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
        <Fehlergrenze>
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

          {/* Altersvorsorgedepot (gefördert, ab Beitragsjahr 2027) */}
          <Route
            path="/altersvorsorgedepot"
            element={
              <PageShell>
                <PaidRoute featureName="Altersvorsorgedepot-Rechner">
                  <AvdCalculator />
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
          {/* Gespeicherte Fassung – zeigt nur Festgehaltenes, rechnet nichts */}
          <Route
            path="/fassung"
            element={
              <PageShell>
                <FassungAnsicht />
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
          <Route path="/pricing" element={<SmartPricing />} />

          {/* Beispielfall - oeffentlich, Zielseite fuer Suche und Anzeigen */}
          <Route path="/beispiel" element={<Beispiel />} />

          {/* Fallback */}
          <Route path="*" element={<SmartNotFound />} />
        </Routes>
        </Suspense>
        </Fehlergrenze>
        </SubscriptionProvider>
        <CookieBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
