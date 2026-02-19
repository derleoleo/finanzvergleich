# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # TypeScript type check + Vite production build
npm run lint      # ESLint (flat config v9+)
npm run preview   # Preview production build locally
```

There are no tests in this project.

## Architecture

React 19 SPA (no backend) for comparing German life insurance (LV/Lebensversicherung) vs. direct fund investment (Depot) strategies. All calculations run client-side; data persists in `localStorage`.

**Stack:** React 19 + TypeScript 5.9, Vite 7, Tailwind CSS 4, React Router 7, Recharts, Shadcn UI components, Lucide icons.

**Path alias:** `@/` maps to `src/`.

## Key Structural Patterns

**Routing** (`src/App.tsx`, `src/utils/index.ts`): Centralized `routes` object + `createPageUrl()` helper for type-safe navigation. All pages are wrapped in `<Layout>` which provides the sidebar.

**Data layer** (`src/entities/`): No API — all entities provide CRUD helpers (`list()`, `get()`, `create()`, `update()`) backed by `localStorage`:
- `Calculation.ts` → `finanzvergleich_calculations` (Fonds-Sparvertrag)
- `SinglePaymentCalculation.ts` → `finanzvergleich_singlepayment` (Einmalanlage)
- `BestAdviceCalculation.ts` → `finanzvergleich_bestadvice` (BestAdvice)
- `PensionGapCalculation.ts` → `finanzvergleich_pensiongap` (Rentenlücke)
- `UserProfile.ts` → `finanzvergleich_userprofile` (simple load/save, no list)
- `Feedback.ts` → `finanzvergleich_feedback`

**Calculator state** (`src/pages/Calculator.tsx`): Controlled form with `formData` state and a single `updateFormData(field, value)` handler. Auto-saves drafts with 250ms debounce. `?resume=1` URL param loads the last draft.

**Calculation engine**: Month-by-month simulation loop comparing two products. Key complexity areas:
- LV acquisition costs distributed over max 60 months (Zillmer amortization)
- LV effective costs split 70/30 upfront/ongoing (60/40 if contract ≤ 60 months)
- Tax treatment: LV gets preferential half-income rule if contract ≥ 12 years and payout age ≥ 62
- Tax calculation helpers live in `src/components/shared/TaxCalculations.ts`

**UI components** (`src/components/ui/`): Shadcn-style components (Button, Card, Input, Select, Table, etc.) — extend these rather than creating new primitives.

**Language:** Comments and UI strings are in German (domain-specific financial terminology).
