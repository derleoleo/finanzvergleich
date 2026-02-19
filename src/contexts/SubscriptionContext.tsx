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

  const loadSubscription = useCallback(async () => {
    if (!user) {
      setPlan("free");
      setTotalCalculationCount(0);
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

      // Berechnungen zählen (alle 4 Tabellen parallel)
      const [calc, single, best, pension] = await Promise.all([
        supabase
          .from("finanzvergleich_calculations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("finanzvergleich_singlepayment")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("finanzvergleich_bestadvice")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("finanzvergleich_pensiongap")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

      const total =
        (calc.count ?? 0) +
        (single.count ?? 0) +
        (best.count ?? 0) +
        (pension.count ?? 0);
      setTotalCalculationCount(total);
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
  const canCreateCalculation = isPaid || totalCalculationCount < 3;

  const incrementCalculationCount = useCallback(() => {
    setTotalCalculationCount((n) => n + 1);
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        isPaid,
        totalCalculationCount,
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
