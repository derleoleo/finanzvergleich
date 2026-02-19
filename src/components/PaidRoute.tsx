import type { ReactNode } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import UpgradePrompt from "@/components/UpgradePrompt";

type Props = {
  featureName: string;
  children: ReactNode;
};

export default function PaidRoute({ featureName, children }: Props) {
  const { isPaid, subscriptionLoading } = useSubscription();

  if (subscriptionLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPaid) {
    return (
      <UpgradePrompt
        title={`${featureName} – Premium-Funktion`}
        description={`${featureName} ist ab dem Professional-Plan verfügbar. Upgraden Sie jetzt, um alle Rechner und den PDF-Export zu nutzen.`}
      />
    );
  }

  return <>{children}</>;
}
