-- =============================================================================
-- FASA Duit — Recurring transactions v1
-- =============================================================================
-- Adds the columns + auto-post SQL function needed to ship monthly recurring
-- templates (salary, rent, Netflix, TNB, Unifi, insurance, etc.).
--
-- Schedule shape (JSONB, enforced in TS not DB):
--   { "freq": "monthly", "day": 1..31 }
--
-- Template shape (JSONB, mirrors transactions Insert minus user_id/date/id):
--   { "amount_sen": <signed>, "account_id": uuid|null, "category_id": uuid|null,
--     "merchant": text, "notes": text, "tags": text[] }
-- =============================================================================

-- ─── Column additions ────────────────────────────────────────────────────────
ALTER TABLE public.recurring
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled',
  ADD COLUMN IF NOT EXISTS auto_post BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS last_run DATE;

-- Drop the DEFAULT so future inserts must supply a name explicitly.
ALTER TABLE public.recurring
  ALTER COLUMN name DROP DEFAULT;

-- ─── Auto-post function ──────────────────────────────────────────────────────
-- Called by the daily cron route (with the service role key). Iterates every
-- non-archived recurring row whose next_run <= today AND auto_post = TRUE,
-- inserts the corresponding transaction, and advances next_run one month
-- forward. Idempotent-ish via the last_run guard so a double-run in one day
-- doesn't double-post.
--
-- End-of-month clamping: if `day` is 31 but the target month only has 30 days,
-- the transaction posts on the last day of that month. Then next_run advances
-- to the same `day` in the following month (clamped again if needed).
CREATE OR REPLACE FUNCTION public.post_due_recurring()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  post_date DATE;
  target_day INT;
  next_month DATE;
  next_day INT;
  new_next_run DATE;
  posted_count INT := 0;
BEGIN
  FOR rec IN
    SELECT *
    FROM public.recurring
    WHERE archived = FALSE
      AND auto_post = TRUE
      AND next_run <= CURRENT_DATE
      AND (last_run IS NULL OR last_run < next_run)
  LOOP
    post_date := rec.next_run;

    -- Insert the transaction using the template.
    INSERT INTO public.transactions (
      user_id,
      date,
      account_id,
      category_id,
      amount_sen,
      merchant,
      notes,
      tags,
      recurring_id
    )
    VALUES (
      rec.user_id,
      post_date,
      NULLIF(rec.template ->> 'account_id', '')::UUID,
      NULLIF(rec.template ->> 'category_id', '')::UUID,
      (rec.template ->> 'amount_sen')::BIGINT,
      COALESCE(rec.template ->> 'merchant', rec.name),
      COALESCE(rec.template ->> 'notes', ''),
      COALESCE(
        ARRAY(SELECT jsonb_array_elements_text(rec.template -> 'tags')),
        ARRAY[]::TEXT[]
      ),
      rec.id
    );

    -- Advance next_run one month, clamping day at month-end.
    target_day := COALESCE((rec.schedule ->> 'day')::INT, EXTRACT(DAY FROM post_date)::INT);
    next_month := (date_trunc('month', post_date) + INTERVAL '1 month')::DATE;
    next_day := LEAST(
      target_day,
      EXTRACT(DAY FROM (next_month + INTERVAL '1 month - 1 day')::DATE)::INT
    );
    new_next_run := (next_month + (next_day - 1) * INTERVAL '1 day')::DATE;

    UPDATE public.recurring
    SET last_run = post_date,
        next_run = new_next_run
    WHERE id = rec.id;

    posted_count := posted_count + 1;
  END LOOP;

  RETURN posted_count;
END;
$$;

-- Only the service role can invoke this — never expose it to anon or authenticated.
REVOKE EXECUTE ON FUNCTION public.post_due_recurring() FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_due_recurring() TO service_role;

-- ─── Realtime ────────────────────────────────────────────────────────────────
-- So the /recurring page updates in real time as the cron posts.
ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring;
