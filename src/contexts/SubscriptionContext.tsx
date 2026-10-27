import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ereignis } from "@/utils/messung";

type Plan = "free" | "professional" | "business";

type SubscriptionContextType = {
  plan: Plan;
  isPaid: boolean;
  /** Gibt es bei Stripe einen Kunden? Nur dann lässt sich dort etwas verwalten. */
  hatStripeKonto: boolean;
  totalCalculationCount: number;
  monthlyCalculationCount: number;
  canCreateCalculation: boolean;
  subscriptionLoading: boolean;
  refreshSubscription: () => Promise<void>;
  incrementCalculationCount: () => void;
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<Plan>("free");
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [hatStripeKonto, setHatStripeKonto] = useState(false);
  const [totalCalculationCount, setTotalCalculationCount] = useState(0);
  const [monthlyCalculationCount, setMonthlyCalculationCount] = useState(0);

  const loadSubscription = useCallback(async () => {
    if (!user) {
      setPlan("free");
      setTotalCalculationCount(0);
      setMonthlyCalculationCount(0);
      setSubscriptionLoading(false);
      return;
    }

    setSubscriptionLoading(true);
    try {
      // Plan laden
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end, stripe_subscription_id, stripe_customer_id")
        .eq("user_id", user.id)
        .single();

      // Bei Stripe-Abos ist der Status maßgeblich – das Enddatum kann kurz
      // veralten, wenn ein Webhook verzögert ankommt. Ohne Stripe-Abo (Testcode)
      // gibt es kein Ereignis, das den Zugang beendet: Da zählt das Enddatum.
      const perStripe = Boolean(sub?.stripe_subscription_id);
      // Nur wer bei Stripe geführt wird, kann dort auch etwas verwalten.
      // Von Hand vergebene Zugänge (Testcode, Eintrag im SQL-Editor) haben
      // keinen Kunden bei Stripe – für die ist das Abo-Portal leer.
      setHatStripeKonto(Boolean(sub?.stripe_customer_id));
      const nochGueltig =
        perStripe ||
        !sub?.current_period_end ||
        new Date(sub.current_period_end).getTime() > Date.now();
      const activePlan =
        sub && (sub.status === "active" || sub.status === "trialing") && nochGueltig
          ? (sub.plan as Plan)
          : "free";
      setPlan(activePlan);

      // Gesamtzahl gespeicherter Berechnungen (nur zur Anzeige)
      const tables = [
        "calculations",
        "single_payment_calculations",
        "best_advice_calculations",
        "pension_gap_calculations",
      ] as const;

      // Monatsstand kommt aus dem eigenen Zähler (Audit F17): Zeilen zu zählen
      // hieße, dass Löschen das Kontingent wieder freigibt.
      // Monatsschlüssel lokal bauen: toISOString() rechnet nach UTC um und
      // landet in Mitteleuropa auf dem Vormonat (z. B. 2026-08-31).
      const jetzt = new Date();
      const monat = `${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, "0")}-01`;

      const [totalResults, zaehler] = await Promise.all([
        Promise.all(
          tables.map((t) =>
            supabase.from(t).select("id", { count: "exact", head: true }).eq("user_id", user.id)
          )
        ),
        supabase
          .from("berechnungs_zaehler")
          .select("anzahl")
          .eq("user_id", user.id)
          .eq("monat", monat)
          .maybeSingle(),
      ]);

      setTotalCalculationCount(totalResults.reduce((s, r) => s + (r.count ?? 0), 0));
      setMonthlyCalculationCount(Number(zaehler.data?.anzahl ?? 0));
    } catch (err) {
      console.error("SubscriptionContext: Ladefehler", err);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const isPaid = plan === "professional" || plan === "business";

  const canCreateCalculation =
    plan === "business" || plan === "professional"
      ? true
      : monthlyCalculationCount < 3;

  const incrementCalculationCount = useCallback(() => {
    setTotalCalculationCount((n) => n + 1);
    setMonthlyCalculationCount((n) => n + 1);
    // Die eine Stelle, durch die jede gespeicherte Berechnung laeuft - egal
    // aus welchem Rechner. Gemeldet wird nur, dass es passiert ist.
    ereignis("berechnung_gespeichert");
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        isPaid,
        hatStripeKonto,
        totalCalculationCount,
        monthlyCalculationCount,
        canCreateCalculation,
        subscriptionLoading,
        refreshSubscription: loadSubscription,
        incrementCalculationCount,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- Hook gehört zum Provider-Pattern
export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error(
      "useSubscription muss innerhalb von SubscriptionProvider verwendet werden"
    );
  return ctx;
}
