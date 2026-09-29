import { createServer } from 'vite';
const server = await createServer({ server: { middlewareMode: true } });
try {
  const w = await server.ssrLoadModule('/src/lib/finance/entnahmeplan.ts');
  const p = await server.ssrLoadModule('/src/lib/finance/rentenluecke.ts');
  const b = await server.ssrLoadModule('/src/lib/finance/bestadvice.ts');
  const s = await server.ssrLoadModule('/src/lib/finance/simulation.ts');
  const plan = w.baueEntnahmeplan({startCapital:100000,annualWithdrawal:10000,annualReturnPercent:0,startAge:65,endAge:70});
  const basis = {birth_year:1951,retirement_age:67,withdrawal_end_age:90,desired_monthly_income:1000,expected_statutory_pension:0,occupational_pension_bav:0,basis_rente:0,rental_income:0,existing_capital:0,assumed_annual_return:0,inflation_percent:0};
  const lv = {months:240,monthly_contribution:200,initial_capital:30000,funds:[{allocation_eur:200,ongoing_costs_percent:0}],cost:{type:'percent',effective_costs_percent:1}};
  const ziel = s.simulateLv({...lv,annual_return_percent:4}).gross_capital;
  console.log(JSON.stringify({entnahme:{zeilen:plan.length,entnommen:plan.at(-1).totalWithdrawn,rest:plan.at(-1).endCapital},rentenlueckeMit75:p.berechneRentenluecke(basis,new Date('2026-09-29T12:00:00Z')),breakEven:b.breakEvenEinordnung(b.breakEvenRendite(lv,ziel)),kostenSplit5:s.splitLvEffectiveCosts(1000,5),kostenSplit6:s.splitLvEffectiveCosts(1000,6)},null,2));
} finally { await server.close(); }
