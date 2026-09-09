# FASA Duit — CLAUDE.md

Persistent context and rules for Claude Code working on **FASA Duit**, a Malaysian-first personal budget tracker shipping as a **multi-user full-stack SaaS web app**.

> **Always read this file (and [MEMORY.md](MEMORY.md)) before responding to any task in this repo.** Product brief lives in [Reference/budget-tracker-prompt.md](Reference/budget-tracker-prompt.md); treat it as the source of truth for feature scope and acceptance criteria (ignore the parts that describe it as a single Claude Artifact — those are superseded by this file). Visual reference: [Reference/FASA Duit Budget Tracker.html](Reference/FASA%20Duit%20Budget%20Tracker.html). The existing single-file prototype at [index.html](index.html) is now a **UX + design reference** for porting, not the shipping product.

## Workflow

- **Before implementing any non-trivial change, ask 3–4 clarifying questions** (scope, schema impact, RLS/auth implications, UX intent). Only proceed after the user answers.
- Every change that touches persisted data needs a matching Supabase migration (`supabase/migrations/*.sql`) — never mutate the schema through the dashboard alone. Regenerate `types/supabase.ts` after each migration.
- Every new table gets an RLS policy before it accepts a single row. Never disable RLS on a production table.
- Money is integer sen in the DB (`BIGINT` columns named `*_sen`); never store as `NUMERIC`/floats.

## Product goal

- **Audience:** Malaysian professionals + freelancers + young families primary, English-speaking global users secondary.
- **Distribution:** Public multi-user SaaS. Anyone can sign up, land in the app in under 30 seconds, own their own data, and come back to find it exactly as they left it.
- **Business model:** Free open beta first — no paywall. Add subscription tier later (Stripe + Billplz/ToyyibPay was the plan; not implemented yet).
- **Success looks like:** a KL professional signs up on Sunday night, does the 4-step wizard, adds a week of transactions, and next weekend logs back in from their phone to reconcile — everything intact, dashboard warm and inviting, feels like coming home.

## Tech Stack

- **Frontend:** Next.js 15 (App Router) + React 19 + **TypeScript strict**.
- **Styling:** Tailwind CSS + CSS custom properties (carry over the warm palette from the prototype). Fraunces (display) + Inter (body) via `next/font/google`.
- **Icons:** `lucide-react` — thin-stroke line icons only, never emoji in the chrome.
- **Charts:** Recharts (donut, stacked bar, sparkline), theme-aware via CSS variables.
- **State:** React Server Components for the initial data load, `useState`/`useReducer` for client interactions, TanStack Query (`@tanstack/react-query`) for client-side mutations + optimistic updates with Supabase.
- **Backend + DB:** **Supabase** (Postgres + Auth + Storage + Realtime), Singapore region (`ap-southeast-1`).
  - **Auth:** email/password + Google OAuth to start; add Apple later.
  - **Row Level Security (RLS):** every user-scoped table gates by `auth.uid() = user_id`. This is non-negotiable and enforced at the DB level.
  - **Storage:** private bucket `receipts/` for receipt image uploads (per-user prefix).
  - **Realtime:** subscribe to transactions/accounts for live updates across tabs/devices.
- **Deployment:** **Vercel** (hobby tier), auto-deploy on push to `main`. Preview deploys on every PR. Env vars in Vercel dashboard; local `.env.local` (never committed).
- **Regional considerations:** Vercel edge in Singapore, Supabase DB in Singapore. PDPA-mindful — all user data stays in ap-southeast-1.

## Build & Development Commands

_(To be filled in once the Next.js project is scaffolded — placeholders below.)_

```bash
# Install deps
npm install

# Local dev (Next.js dev server)
npm run dev

# Type-check
npm run typecheck   # tsc --noEmit

# Lint / format
npm run lint        # next lint
npm run format      # prettier --write .

# Tests (Vitest for units, Playwright for E2E)
npm test            # vitest
npm run e2e         # playwright test

# Build for production
npm run build

# Supabase — local stack + migrations
npx supabase start                              # local Postgres + Studio on :54323
npx supabase db reset                           # wipe + re-run migrations + seed
npx supabase migration new <slug>               # create a new migration
npx supabase gen types typescript --local > types/supabase.ts   # regenerate types

# Deploy
git push origin main    # Vercel picks it up
npx supabase db push    # push migrations to hosted Supabase
```

## Code Style & Conventions

- **TypeScript strict.** Never `any`; use `unknown` + narrowing. `satisfies` over type assertions.
- **Server components by default.** A component becomes `'use client'` only when it needs state, an effect, or a browser API. Data fetching stays on the server via `createServerClient` from `@supabase/ssr`.
- **File layout inside `app/`:** kebab-case route folders, PascalCase component files. Colocate: `app/(app)/transactions/page.tsx` + `TransactionsClient.tsx` + `columns.ts`.
- **Money is integer sen.** DB columns `BIGINT NOT NULL` (`amount_sen`, `balance_sen`, `opening_balance_sen`, `target_sen`, `min_payment_sen`, `income_sen`). APR is `apr_bps` (basis points integer, 0–100000). All arithmetic goes through `lib/money.ts` — carry over `add / subtract / multiply / divide / percent / splitExact / parse / format / bankersRound`.
- **Formatting:** `RM 1,234.56` for MYR, appropriate locale formatting for others. Format only at display time.
- **Dates:** ISO `YYYY-MM-DD` in the DB; format `DD/MM/YYYY` in the UI (both languages). Week starts Monday.
- **BM (`ms`) and English (`en`) catalogs.** Full parity — never a half-translated screen. Store user's language preference on `profiles.language`. Consider `next-intl` when it grows past ~200 strings.
- **Errors:** every async DB call wraps in try/catch, logs to `logger.error()`, surfaces a user-friendly toast. Never throw unhandled from a server action.
- **RSC + Client boundary:** never import a server-only module from a client component. Fetch on the server, pass typed props down.
- **Design tokens:** the warm palette from the prototype ports to `app/globals.css` as CSS custom properties, plus `tailwind.config.ts` reads from those tokens. Never hard-code hex in components.
- **Accessibility:** WCAG AA contrast, visible focus rings, `aria-live` toasts, labeled form fields, semantic tables. Test with keyboard only during PR review.
- **Responsive:** 360px → up. Nav collapses to bottom tab bar under 720px.

## Data Model (Supabase Postgres)

All tables have `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `created_at`, `updated_at`. Every user-owned table has RLS:

```sql
-- Standard RLS policy applied to every user-scoped table
CREATE POLICY "own rows only"
  ON <table> FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Tables (all `_sen` columns are `BIGINT`):

| Table | Key columns |
| --- | --- |
| `profiles` | `user_id` (PK), `currency`, `language`, `theme`, `income_sen`, `split_needs`, `split_wants`, `split_savings`, `onboarding_done`, `islamic_mode` |
| `accounts` | `name`, `type`, `institution`, `opening_balance_sen`, `currency`, `archived` |
| `categories` | `name`, `bucket` (enum needs/wants/savings), `icon`, `color`, `archived` |
| `transactions` | `date`, `account_id`, `category_id`, `amount_sen` (signed), `merchant`, `notes`, `tags TEXT[]`, `receipt_path TEXT`, `recurring_id` |
| `recurring` | `schedule` (JSONB — rrule-ish subset), `template` (JSONB txn), `next_run` (DATE) |
| `sinking_funds` | `name`, `target_sen`, `target_date`, `icon`, `linked_category_id`, `contributions JSONB` |
| `debts` | `name`, `type`, `balance_sen`, `apr_bps`, `min_payment_sen` |

- Indexes: `(user_id, date DESC)` on `transactions`, `(user_id, archived)` on accounts/categories.
- Amount storage: **sen only**, never Numeric/decimal. APR as bps.
- Receipts: uploaded to Supabase Storage bucket `receipts` at path `<user_id>/<uuid>.<ext>`; store the path in `transactions.receipt_path`.

## Repo Structure (target)

```
FASA/
├── CLAUDE.md
├── MEMORY.md
├── Reference/                              ← product brief + visual mock (untouched)
├── index.html                              ← legacy single-file prototype (design reference only)
├── app/                                    ← Next.js App Router
│   ├── (marketing)/                        ← public landing, pricing, FAQ
│   ├── (auth)/login|signup|reset/
│   ├── (app)/                              ← authenticated shell
│   │   ├── layout.tsx                      ← sidebar + topbar + toasts
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/page.tsx
│   │   ├── funds/page.tsx
│   │   ├── debts/page.tsx
│   │   └── settings/page.tsx
│   ├── api/                                ← route handlers (webhooks etc.)
│   └── globals.css                         ← design tokens
├── components/                             ← reusable client + server components
├── lib/
│   ├── supabase/{server,client,middleware}.ts
│   ├── money.ts                            ← integer-sen helpers
│   ├── debt.ts                             ← simulateDebts, amortization
│   ├── funds.ts                            ← computeFundState
│   └── i18n/{en,ms}.ts
├── types/supabase.ts                       ← generated
├── supabase/
│   ├── config.toml
│   ├── migrations/*.sql
│   └── seed.sql
├── public/
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local  (gitignored)
```

## API Rules

- **No public unauthenticated endpoints for user data.** RLS handles it at the DB layer.
- **Route handlers under `app/api/v1/`** if we need custom endpoints (Stripe webhooks eventually).
- **Server Actions** for mutations from forms; call Supabase via the server client so RLS applies.
- **Never expose the Supabase service role key to the client.** Only used inside secured route handlers or server actions where absolutely required.

## Warnings / Anti-patterns

- ❌ Storing money as float or `NUMERIC`. Always `BIGINT` sen; APR in bps.
- ❌ Turning off RLS "just to debug." Fix the policy instead.
- ❌ Emoji in chrome. Use `lucide-react`.
- ❌ Assuming a US context — no `$`, no `MM/DD/YYYY`, no "checking account".
- ❌ Scolding copy. "You're 12% over on Wants — RM 180 above plan," not "You failed."
- ❌ Modals for destructive actions without a 5-second undo toast.
- ❌ Client-side data fetching for the initial render. Fetch on the server, hydrate.
- ❌ Half-translated screens. Full BM catalog or nothing.
- ❌ Exposing `SUPABASE_SERVICE_ROLE_KEY` to any client bundle.
- ❌ Committing `.env.local`, keys, or generated `types/supabase.ts` with sensitive artifacts.
