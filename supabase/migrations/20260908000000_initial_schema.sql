-- =============================================================================
-- FASA Duit — Initial schema
-- =============================================================================
-- Design invariants:
--   * Money is integer sen (BIGINT). Never NUMERIC/decimal for money.
--   * APR is basis points (INT, 0..100000 == 0..1000%).
--   * Every user-scoped table has a `user_id UUID REFERENCES auth.users(id)`
--     with an RLS policy `auth.uid() = user_id` (SELECT + INSERT + UPDATE +
--     DELETE via one FOR ALL policy). This is non-negotiable.
--   * Dates stored as DATE (YYYY-MM-DD). Timestamps as TIMESTAMPTZ.
-- =============================================================================

-- Extensions we rely on
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ─── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE bucket_kind AS ENUM ('needs', 'wants', 'savings');

CREATE TYPE account_kind AS ENUM (
  'cash', 'current', 'savings', 'credit', 'ewallet', 'investment'
);

CREATE TYPE debt_kind AS ENUM (
  'credit', 'ptptn', 'personal', 'car', 'mortgage', 'asb', 'family', 'other'
);

-- ─── Shared updated_at trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────
-- One row per auth.users row. Auto-provisioned by trigger on user creation.
CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'MYR',
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ms')),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
  income_sen BIGINT NOT NULL DEFAULT 0 CHECK (income_sen >= 0),
  split_needs INT NOT NULL DEFAULT 50 CHECK (split_needs BETWEEN 0 AND 100),
  split_wants INT NOT NULL DEFAULT 30 CHECK (split_wants BETWEEN 0 AND 100),
  split_savings INT NOT NULL DEFAULT 20 CHECK (split_savings BETWEEN 0 AND 100),
  onboarding_done BOOLEAN NOT NULL DEFAULT FALSE,
  islamic_mode BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT split_sums_to_100 CHECK (split_needs + split_wants + split_savings = 100)
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a profile row on new auth user. Runs with SECURITY DEFINER so it
-- can bypass RLS on insert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── accounts ────────────────────────────────────────────────────────────────
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_kind NOT NULL DEFAULT 'cash',
  institution TEXT,
  opening_balance_sen BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MYR',
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX accounts_user_archived_idx
  ON public.accounts(user_id, archived);

CREATE TRIGGER accounts_set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── categories ──────────────────────────────────────────────────────────────
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bucket bucket_kind NOT NULL,
  icon TEXT,
  color TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX categories_user_archived_idx
  ON public.categories(user_id, archived);

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── transactions ────────────────────────────────────────────────────────────
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  amount_sen BIGINT NOT NULL,          -- signed: expense NEGATIVE, income POSITIVE
  merchant TEXT,
  notes TEXT,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  receipt_path TEXT,                    -- Supabase Storage path <user_id>/<uuid>.<ext>
  recurring_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transactions_user_date_idx
  ON public.transactions(user_id, date DESC);
CREATE INDEX transactions_user_category_idx
  ON public.transactions(user_id, category_id);
CREATE INDEX transactions_user_account_idx
  ON public.transactions(user_id, account_id);

CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── recurring (schedule + template txn) ─────────────────────────────────────
CREATE TABLE public.recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule JSONB NOT NULL,      -- rrule-ish subset
  template JSONB NOT NULL,      -- shape mirrors transactions row
  next_run DATE NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX recurring_user_nextrun_idx
  ON public.recurring(user_id, next_run) WHERE archived = FALSE;

CREATE TRIGGER recurring_set_updated_at
  BEFORE UPDATE ON public.recurring
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── sinking_funds ───────────────────────────────────────────────────────────
CREATE TABLE public.sinking_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_sen BIGINT NOT NULL CHECK (target_sen >= 0),
  target_date DATE NOT NULL,
  icon TEXT NOT NULL DEFAULT 'piggy',
  linked_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  contributions JSONB NOT NULL DEFAULT '[]'::JSONB,   -- [{date, amount_sen}]
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX sinking_funds_user_idx
  ON public.sinking_funds(user_id) WHERE archived = FALSE;

CREATE TRIGGER sinking_funds_set_updated_at
  BEFORE UPDATE ON public.sinking_funds
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── debts ───────────────────────────────────────────────────────────────────
CREATE TABLE public.debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type debt_kind NOT NULL DEFAULT 'credit',
  balance_sen BIGINT NOT NULL CHECK (balance_sen >= 0),
  apr_bps INT NOT NULL DEFAULT 0 CHECK (apr_bps BETWEEN 0 AND 100000),
  min_payment_sen BIGINT NOT NULL DEFAULT 0 CHECK (min_payment_sen >= 0),
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX debts_user_idx
  ON public.debts(user_id) WHERE archived = FALSE;

CREATE TRIGGER debts_set_updated_at
  BEFORE UPDATE ON public.debts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Row Level Security
-- Every user-scoped table gets exactly one policy: you can only touch rows
-- where auth.uid() matches user_id. Enforced for SELECT/INSERT/UPDATE/DELETE.
-- =============================================================================

ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sinking_funds  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own row only" ON public.profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own rows only" ON public.accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own rows only" ON public.categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own rows only" ON public.transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own rows only" ON public.recurring
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own rows only" ON public.sinking_funds
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own rows only" ON public.debts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Storage bucket for receipt images
-- Path convention: <user_id>/<uuid>.<ext>
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('receipts', 'receipts', FALSE, 5242880)  -- 5 MiB
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "own files only — read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "own files only — insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "own files only — update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "own files only — delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]
  );
