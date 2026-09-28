import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true } });
try {
  const m = await server.ssrLoadModule('/src/lib/finance/simulation.ts');
  const r = await server.ssrLoadModule('/src/lib/finance/riy.ts');
  const input = { months: 360, annual_return_percent: 6, monthly_contribution: 300, funds: [{ allocation_eur: 300, ongoing_costs_percent: 0 }], cost: { type: 'percent', effective_costs_percent: 1 } };
  const result = m.simulateLv(input);
  const negative = m.simulateLv({ ...input, months: 12, monthly_contribution: 1, funds: [{ allocation_eur: 1, ongoing_costs_percent: 1 }], cost: { type: 'eur', acquisition_costs_eur: 1200, admin_costs_monthly_eur: 0 } });
  console.log(JSON.stringify({ effectiveCostInput: 1, calculatedRIY: r.reductionInYield(result.gross_capital, 6, input), splitAtFiveYears: m.splitLvEffectiveCosts(1000, 5), splitAtSixYears: m.splitLvEffectiveCosts(1000, 6), negativeCapitalCase: { capital: negative.gross_capital, fundCosts: negative.costs.fund }, feeFutureValueIllustration: 1500 * Math.pow(1.06, 30) }, null, 2));
} finally { await server.close(); }
