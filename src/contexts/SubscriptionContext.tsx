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

type Plan = "free" | "professional" | "business";

type SubscriptionContextType = {
  plan: Plan;
  isPaid: boolean;
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
        .select("plan, status, current_period_end, stripe_subscription_id")
        .eq("user_id", user.id)
        .single();

      // Bei Stripe-Abos ist der Status maßgeblich – das Enddatum kann kurz
      // veralten, wenn ein Webhook verzögert ankommt. Ohne Stripe-Abo (Testcode)
      // gibt es kein Ereignis, das den Zugang beendet: Da zählt das Enddatum.
      const perStripe = Boolean(sub?.stripe_subscription_id);
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
      const monatsStart = new Date();
      const monat = new Date(monatsStart.getFullYear(), monatsStart.getMonth(), 1)
        .toISOString()
        .slice(0, 10);

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
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        isPaid,
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
