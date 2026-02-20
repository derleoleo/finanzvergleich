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

  PensionGapCalculator: "/pension-gap",
  PensionGapDetail: "/pension-gap/detail",

  WithdrawalPlan: "/withdrawal-plan",
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
