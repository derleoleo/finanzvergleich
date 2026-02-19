import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";

type Props = {
  title: string;
  description: string;
  onClose?: () => void;
};

export default function UpgradePrompt({ title, description, onClose }: Props) {
  const { plan, monthlyCalculationCount } = useSubscription();

  const inner = (
    <Card className="border-0 shadow-xl bg-white max-w-sm w-full">
      <CardContent className="p-8 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
          <Lock className="w-7 h-7 text-slate-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{title}</h2>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
        <p className="text-xs text-slate-500">
          {monthlyCalculationCount} von {plan === "professional" ? 10 : 3} Berechnungen diesen Monat verwendet
        </p>
        <Link to={createPageUrl("Pricing")} className="w-full">
          <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white">
            Jetzt upgraden
          </Button>
        </Link>
        {onClose && (
          <Button
            variant="ghost"
            className="w-full text-slate-500"
            onClick={onClose}
          >
            Abbrechen
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (onClose) {
    return (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative">
          <button
            className="absolute -top-3 -right-3 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center z-10"
            onClick={onClose}
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16 px-4">
      {inner}
    </div>
  );
}
