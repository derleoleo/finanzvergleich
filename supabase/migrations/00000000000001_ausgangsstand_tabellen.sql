-- Ausgangsstand der Tabellen (Audit D02).
--
-- Abgezogen am 27.10.2026 aus der Produktivdatenbank mit
-- `supabase/schema-abzug.sql`. Das Schema entstand ursprünglich im Dashboard,
-- nicht als Migration – ohne diese Datei ließ sich aus `migrations/` keine
-- leere Datenbank aufbauen, und damit war auch keine Wiederherstellung
-- geprobt.
--
-- Der Zeitstempel ist der kleinste im Ordner: Dieser Stand muss vor allen
-- anderen Migrationen laufen.
--
-- Zwei Dinge gehören dazu, stehen aber nicht hier:
--   * Die Zugriffsregeln selbst (`supabase/zugriffsregeln-stand.sql`). Der
--     Schalter für die Zeilensicherheit steht unten, die Regeln dort. Ohne
--     sie ist eine Tabelle mit Zeilensicherheit vollständig gesperrt – für
--     Nutzer sicher, aber unbenutzbar.
--   * Die Funktionen des Schemas; die liegen in ihren eigenen Migrationen.
--
-- Voraussetzung: `auth.users` muss existieren. Alle Fremdschlüssel zeigen
-- dorthin. Auf einem Supabase-Projekt ist das gegeben (auch bei
-- `supabase start` lokal); auf einem nackten Postgres nicht.
--
-- Enthalten ist nur Struktur: keine Daten, keine Rollen, keine Schlüssel.

create table if not exists public.api_aufrufe (
  user_id uuid not null,
  endpunkt text not null,
  fenster timestamp with time zone not null,
  anzahl integer default 0 not null
);

alter table public.api_aufrufe add constraint api_aufrufe_pkey PRIMARY KEY (user_id, endpunkt, fenster);
alter table public.api_aufrufe add constraint api_aufrufe_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS api_aufrufe_fenster_idx ON public.api_aufrufe USING btree (fenster);

alter table public.api_aufrufe enable row level security;

create table if not exists public.avd_calculations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  created_date timestamp with time zone default now() not null,
  name text not null,
  form jsonb not null,
  results jsonb
);

alter table public.avd_calculations add constraint avd_calculations_pkey PRIMARY KEY (id);
alter table public.avd_calculations add constraint avd_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS avd_calculations_user_idx ON public.avd_calculations USING btree (user_id, created_date DESC);

alter table public.avd_calculations enable row level security;

create table if not exists public.berechnungs_zaehler (
  user_id uuid not null,
  monat date not null,
  anzahl integer default 0 not null
);

alter table public.berechnungs_zaehler add constraint berechnungs_zaehler_pkey PRIMARY KEY (user_id, monat);
alter table public.berechnungs_zaehler add constraint berechnungs_zaehler_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.berechnungs_zaehler enable row level security;

create table if not exists public.best_advice_calculations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  created_date timestamp with time zone default now(),
  name text,
  current_monthly_contribution numeric,
  current_product_tax_free boolean,
  contract_duration_years integer,
  current_capital numeric,
  guaranteed_end_capital numeric,
  birth_year integer,
  assumed_annual_return numeric,
  lv_cost_type text,
  life_insurance_acquisition_costs_eur numeric,
  lv_admin_costs_monthly_eur numeric,
  lv_effective_costs_percent numeric,
  lv_fund_ongoing_costs_percent numeric,
  results jsonb
);

alter table public.best_advice_calculations add constraint best_advice_calculations_pkey PRIMARY KEY (id);
alter table public.best_advice_calculations add constraint best_advice_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.best_advice_calculations enable row level security;

create table if not exists public.calculations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  created_date timestamp with time zone default now(),
  name text,
  monthly_contribution numeric,
  contract_duration_years integer,
  lv_cost_type text,
  life_insurance_acquisition_costs_eur numeric,
  lv_effective_costs_percent numeric,
  lv_fund_identifier text,
  lv_fund_ongoing_costs_percent numeric,
  depot_fund_identifier text,
  depot_fund_initial_charge_percent numeric,
  depot_fund_ongoing_costs_percent numeric,
  depot_costs_annual numeric,
  depot_provider text,
  assumed_annual_return numeric,
  birth_year integer,
  annual_withdrawal numeric,
  results jsonb,
  lv_admin_costs_monthly_eur numeric default 0 not null,
  lv_funds jsonb,
  depot_funds jsonb,
  dynamik_percent numeric default 0
);

alter table public.calculations add constraint calculations_pkey PRIMARY KEY (id);
alter table public.calculations add constraint calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.calculations enable row level security;

create table if not exists public.fall_versionen (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  fall_tabelle text not null,
  fall_id uuid not null,
  version integer not null,
  name text not null,
  form jsonb not null,
  results jsonb not null,
  reihen jsonb,
  created_at timestamp with time zone default now() not null
);

alter table public.fall_versionen add constraint fall_versionen_fall_tabelle_fall_id_version_key UNIQUE (fall_tabelle, fall_id, version);
alter table public.fall_versionen add constraint fall_versionen_pkey PRIMARY KEY (id);
alter table public.fall_versionen add constraint fall_versionen_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.fall_versionen add constraint fall_versionen_fall_tabelle_check CHECK ((fall_tabelle = ANY (ARRAY['calculations'::text, 'single_payment_calculations'::text, 'best_advice_calculations'::text, 'pension_gap_calculations'::text, 'avd_calculations'::text, 'net_policy_calculations'::text, 'withdrawal_plans'::text])));
alter table public.fall_versionen add constraint fall_versionen_version_check CHECK ((version > 0));

CREATE INDEX IF NOT EXISTS fall_versionen_fall_idx ON public.fall_versionen USING btree (fall_tabelle, fall_id, version DESC);

alter table public.fall_versionen enable row level security;

create table if not exists public.finanzvergleich_consents (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  consent_type text not null,
  document_version text not null,
  accepted_at timestamp with time zone default now() not null,
  ip_address inet,
  user_agent text
);

alter table public.finanzvergleich_consents add constraint uq_user_consent_version UNIQUE (user_id, consent_type, document_version);
alter table public.finanzvergleich_consents add constraint finanzvergleich_consents_pkey PRIMARY KEY (id);
alter table public.finanzvergleich_consents add constraint finanzvergleich_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);
alter table public.finanzvergleich_consents add constraint finanzvergleich_consents_consent_type_check CHECK ((consent_type = ANY (ARRAY['avv'::text, 'agb'::text, 'b2b_confirm'::text, 'privacy_notice'::text])));

alter table public.finanzvergleich_consents enable row level security;

create table if not exists public.net_policy_calculations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  created_date timestamp with time zone default now() not null,
  name text not null,
  form jsonb not null,
  results jsonb
);

alter table public.net_policy_calculations add constraint net_policy_calculations_pkey PRIMARY KEY (id);
alter table public.net_policy_calculations add constraint net_policy_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS net_policy_calculations_user_idx ON public.net_policy_calculations USING btree (user_id, created_date DESC);

alter table public.net_policy_calculations enable row level security;

create table if not exists public.pension_gap_calculations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  created_date timestamp with time zone default now(),
  name text,
  birth_year integer,
  retirement_age integer,
  desired_monthly_income numeric,
  expected_statutory_pension numeric,
  occupational_pension_bav numeric,
  basis_rente numeric,
  rental_income numeric,
  existing_capital numeric,
  assumed_annual_return numeric,
  results jsonb
);

alter table public.pension_gap_calculations add constraint pension_gap_calculations_pkey PRIMARY KEY (id);
alter table public.pension_gap_calculations add constraint pension_gap_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.pension_gap_calculations enable row level security;

create table if not exists public.redeemed_codes (
  id uuid default gen_random_uuid() not null,
  code text not null,
  user_id uuid,
  redeemed_at timestamp with time zone
);

alter table public.redeemed_codes add constraint redeemed_codes_code_key UNIQUE (code);
alter table public.redeemed_codes add constraint redeemed_codes_pkey PRIMARY KEY (id);
alter table public.redeemed_codes add constraint redeemed_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.redeemed_codes enable row level security;

create table if not exists public.single_payment_calculations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  created_date timestamp with time zone default now(),
  name text,
  lump_sum numeric,
  contract_duration_years integer,
  birth_year integer,
  assumed_annual_return numeric,
  lv_cost_type text,
  life_insurance_acquisition_costs_eur numeric,
  lv_admin_costs_monthly_eur numeric,
  lv_effective_costs_percent numeric,
  lv_fund_ongoing_costs_percent numeric,
  depot_fund_initial_charge_percent numeric,
  depot_fund_ongoing_costs_percent numeric,
  depot_costs_annual numeric,
  results jsonb
);

alter table public.single_payment_calculations add constraint single_payment_calculations_pkey PRIMARY KEY (id);
alter table public.single_payment_calculations add constraint single_payment_calculations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.single_payment_calculations enable row level security;

create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free'::text not null,
  status text default 'active'::text not null,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

alter table public.subscriptions add constraint subscriptions_user_id_key UNIQUE (user_id);
alter table public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
alter table public.subscriptions add constraint subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.subscriptions add constraint subscriptions_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'professional'::text, 'business'::text])));
alter table public.subscriptions add constraint subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text, 'incomplete'::text])));

alter table public.subscriptions enable row level security;

create table if not exists public.user_profiles (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  updated_at timestamp with time zone default now(),
  name text,
  company text,
  email text,
  phone text,
  address text,
  city text,
  zip text
);

alter table public.user_profiles add constraint user_profiles_user_id_key UNIQUE (user_id);
alter table public.user_profiles add constraint user_profiles_pkey PRIMARY KEY (id);
alter table public.user_profiles add constraint user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table public.user_profiles enable row level security;

create table if not exists public.werbe_codes (
  user_id uuid not null,
  code text not null,
  created_at timestamp with time zone default now() not null
);

alter table public.werbe_codes add constraint werbe_codes_code_key UNIQUE (code);
alter table public.werbe_codes add constraint werbe_codes_pkey PRIMARY KEY (user_id);
alter table public.werbe_codes add constraint werbe_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table public.werbe_codes enable row level security;

create table if not exists public.werbungen (
  id uuid default gen_random_uuid() not null,
  werber_user_id uuid not null,
  geworbener_user_id uuid not null,
  code text not null,
  status text default 'registriert'::text not null,
  stripe_coupon_id text,
  belohnt_am timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  qualifiziert_am timestamp with time zone,
  in_arbeit_seit timestamp with time zone
);

alter table public.werbungen add constraint werbungen_geworbener_user_id_key UNIQUE (geworbener_user_id);
alter table public.werbungen add constraint werbungen_pkey PRIMARY KEY (id);
alter table public.werbungen add constraint werbungen_geworbener_user_id_fkey FOREIGN KEY (geworbener_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.werbungen add constraint werbungen_werber_user_id_fkey FOREIGN KEY (werber_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.werbungen add constraint werbung_nicht_selbst CHECK ((werber_user_id <> geworbener_user_id));
alter table public.werbungen add constraint werbungen_status_check CHECK ((status = ANY (ARRAY['registriert'::text, 'in_arbeit'::text, 'belohnt'::text, 'abgelehnt'::text])));

CREATE INDEX IF NOT EXISTS werbungen_in_arbeit_idx ON public.werbungen USING btree (in_arbeit_seit) WHERE (status = 'in_arbeit'::text);
CREATE INDEX IF NOT EXISTS werbungen_offen_idx ON public.werbungen USING btree (werber_user_id) WHERE ((status = 'registriert'::text) AND (qualifiziert_am IS NOT NULL));
CREATE INDEX IF NOT EXISTS werbungen_werber_idx ON public.werbungen USING btree (werber_user_id);

alter table public.werbungen enable row level security;

create table if not exists public.withdrawal_plans (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  created_date timestamp with time zone default now() not null,
  name text not null,
  form jsonb not null,
  results jsonb
);

alter table public.withdrawal_plans add constraint withdrawal_plans_pkey PRIMARY KEY (id);
alter table public.withdrawal_plans add constraint withdrawal_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS withdrawal_plans_user_idx ON public.withdrawal_plans USING btree (user_id, created_date DESC);

alter table public.withdrawal_plans enable row level security;
