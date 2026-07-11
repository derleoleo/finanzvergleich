# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # TypeScript type check + Vite production build
npm run lint       # ESLint (flat config v9+)
npm run test       # Vitest (unit tests for the calculation engine)
npm run test:watch # Vitest in watch mode
npm run preview    # Preview production build locally
```

CI (`.github/workflows/ci.yml`) runs lint + test + build on pushes to main and PRs.

## Architecture

React 19 SPA for comparing German life insurance (LV/Lebensversicherung) vs. direct fund investment (Depot) strategies. All calculations run client-side.

**Stack:** React 19 + TypeScript 5.9, Vite 7, Tailwind CSS 4, React Router 7, Recharts, Shadcn-style UI components, Lucide icons, Supabase (Auth + Postgres), Sentry, Stripe/Resend via Vercel functions in `api/`.

**Path alias:** `@/` maps to `src/`.

## Key Structural Patterns

**Routing** (`src/App.tsx`, `src/utils/index.ts`): Centralized `routes` object + `createPageUrl()` helper for type-safe navigation. Protected pages are wrapped in `PageShell` (`ProtectedRoute` → `ConsentGate` → `Layout`); paid features additionally in `PaidRoute`. A Sentry `ErrorBoundary` wraps the routes.

**Data layer** (`src/entities/`): Entities are thin static-class wrappers over the Supabase client (`src/lib/supabase.ts`) with `list(sort?)`, `get()`, `create()`, `update()`, `delete()`:
- `Calculation.ts` → table `calculations` (Fonds-Sparvertrag)
- `SinglePaymentCalculation.ts` → `single_payment_calculations` (Einmalanlage)
- `BestAdviceCalculation.ts` → `best_advice_calculations` (BestAdvice)
- `PensionGapCalculation.ts` → `pension_gap_calculations` (Rentenlücke)
- `UserProfile.ts`, `Consent.ts` → Supabase

localStorage is only used for drafts (`fv_*_draft_v1`), `UserDefaults.ts` (`fv_user_defaults_v1`) and the one-time migration flag (`src/utils/migrateLocalData.ts`).

**Calculator state** (`src/pages/Calculator.tsx`): Controlled form with `formData` state and a single `updateFormData(field, value)` handler. Auto-saves drafts with 250ms debounce. `?resume=1` URL param loads the last draft.

**Calculation engine** (`src/lib/finance/`): The single source of truth for the month-by-month simulation. Do NOT reimplement simulation loops in pages — use the engine:
- `simulation.ts`: `simulateLv()` / `simulateDepot()` (savings plan and single payment via `monthly_contribution` / `initial_capital`), `weightedFundCosts()` (multi-fund weighted TER/AA), `splitLvEffectiveCosts()`
- `series.ts`: `buildYearlySeries()` (chart data), `buildComparisonResults()` (persisted results shape), `buildGuaranteedSeries()` (BestAdvice interpolation)
- Key rules: LV acquisition costs zillmered over max 60 months (upfront deduction for single payments); LV effective costs split by the sliding rule — years ≤ 5: 60/40 acquisition/admin, years > 5: `adminShare = 0.3·(years−5)/years`
- Tax helpers in `src/components/shared/TaxCalculations.ts`: LV gets the Halbeinkünfte rule (42.5% of gains × personal rate) if contract ≥ 12 years and payout age ≥ 62, otherwise 25% Abgeltungsteuer on 85% of gains (15% Teilfreistellung for fund-linked policies); Depot pays Abgeltungsteuer with configurable Teilfreistellung. SolZ (default on — always due on capital gains) and Kirchensteuer apply to both LV and Depot tax (`DepotTaxOptions`/`LifeInsuranceTaxOptions`, defaults from `UserDefaults` via `depotTaxOptionsFromDefaults()`/`lvTaxOptionsFromDefaults()`). Deliberate simplifications: no Vorabpauschale, no Sparerpauschbetrag (may already be used elsewhere by the client).
- Unit tests (`*.test.ts` next to the modules) include golden parity tests; run `npm test` after touching the engine or tax logic.

**UI components** (`src/components/ui/`): Shadcn-style components (Button, Card, Input, Select, Table, etc.) — extend these rather than creating new primitives.

**Language:** Comments and UI strings are in German (domain-specific financial terminology).
