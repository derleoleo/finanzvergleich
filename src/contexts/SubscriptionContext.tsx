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
        .select("plan, status")
        .eq("user_id", user.id)
        .single();

      const activePlan =
        sub && (sub.status === "active" || sub.status === "trialing")
          ? (sub.plan as Plan)
          : "free";
      setPlan(activePlan);

      // Monatsbeginn für monatliche Zählung
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Gesamt- und Monats-Berechnungen parallel zählen (alle 4 Tabellen)
      const tables = [
        "finanzvergleich_calculations",
        "finanzvergleich_singlepayment",
        "finanzvergleich_bestadvice",
        "finanzvergleich_pensiongap",
      ] as const;

      const [totalResults, monthlyResults] = await Promise.all([
        Promise.all(
          tables.map((t) =>
            supabase.from(t).select("id", { count: "exact", head: true }).eq("user_id", user.id)
          )
        ),
        Promise.all(
          tables.map((t) =>
            supabase
              .from(t)
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .gte("created_at", monthStart)
          )
        ),
      ]);

      setTotalCalculationCount(totalResults.reduce((s, r) => s + (r.count ?? 0), 0));
      setMonthlyCalculationCount(monthlyResults.reduce((s, r) => s + (r.count ?? 0), 0));
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
    plan === "business"
      ? true
      : plan === "professional"
      ? monthlyCalculationCount < 10
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

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error(
      "useSubscription muss innerhalb von SubscriptionProvider verwendet werden"
    );
  return ctx;
}
