// src/utils/index.ts
const routes: Record<string, string> = {
  Home: "/",
  Calculator: "/calculator",
  CalculatorDetail: "/calculator/detail",
  CalculatorCostsDetail: "/calculator/costs",

  SinglePaymentCalculator: "/single-payment",
  SinglePaymentDetail: "/single-payment/detail",

  BestAdviceCalculator: "/best-advice",
  BestAdviceDetail: "/best-advice/detail",

  NetPolicyCalculator: "/net-policy",

  AvdCalculator: "/altersvorsorgedepot",

  PensionGapCalculator: "/pension-gap",
  PensionGapDetail: "/pension-gap/detail",

  WithdrawalPlan: "/withdrawal-plan",
  WithdrawalPlanDetail: "/withdrawal-plan/detail",
  Results: "/results",
  Profile: "/profile",
  Defaults: "/defaults",
  Pricing: "/pricing",
  Impressum: "/impressum",
  Datenschutz: "/datenschutz",
  AGB: "/agb",
  AVV: "/legal/avv",
  Compliance: "/compliance",
};

export function createPageUrl(pageName: string): string {
  return routes[pageName] ?? `/page/${pageName}`;
}

export function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}
