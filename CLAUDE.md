# FASA Duit — CLAUDE.md

Persistent context and rules for Claude Code working on **FASA Duit**, a Malaysian-first personal budget tracker shipping as a **multi-user full-stack SaaS web app**.

> **Always read this file, [plan.md](plan.md), and [MEMORY.md](MEMORY.md) before responding to any task in this repo.** CLAUDE.md is the operational rulebook (how we build); [plan.md](plan.md) is the product + UX + business-model plan (what we're building and why); [MEMORY.md](MEMORY.md) is the running decisions log. Product brief lives in [Reference/budget-tracker-prompt.md](Reference/budget-tracker-prompt.md); treat it as the source of truth for feature scope and acceptance criteria (ignore the parts that describe it as a single Claude Artifact — those are superseded by this file). Visual reference: [Reference/FASA Duit Budget Tracker.html](Reference/FASA%20Duit%20Budget%20Tracker.html). The existing single-file prototype at [index.html](index.html) is now a **UX + design reference** for porting, not the shipping product.

## Workflow

- **Before implementing any non-trivial change, ask 3–4 clarifying questions** (scope, schema impact, RLS/auth implications, UX intent). Only proceed after the user answers.
- Every change that touches persisted data needs a matching Supabase migration (`supabase/migrations/*.sql`) — never mutate the schema through the dashboard alone. Regenerate `types/supabase.ts` after each migration.
- Every new table gets an RLS policy before it accepts a single row. Never disable RLS on a production table.
- Money is integer sen in the DB (`BIGINT` columns named `*_sen`); never store as `NUMERIC`/floats.

## Product goal

Full audience, distribution, success criteria, UX principles (instant loading / no-sign-up value / mobile-first / dark mode), and the two-phase Freemium Hybrid business model live in **[plan.md](plan.md)**. Read it before proposing anything user-facing. In short: Malaysian-first SaaS budget tracker, warm and calm, ships free-with-ads in beta, splits into Free + Premium at V1.0.

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

## Testing & QA

We ship without a Vitest/Playwright suite yet — until we do, every non-trivial slice gets these three passes before it's called done.

### 1. Local build gate (mandatory)

```bash
npm run typecheck   # tsc --noEmit — must be clean
npm run lint        # next lint — must be clean
npm run build       # next build — must succeed with no runtime errors
```

If any of these fail, do NOT push. `types/supabase.ts` is committed (not gitignored) so Vercel builds don't need a live DB — after a migration, regenerate it with `npm run db:types` and include it in the same commit.

### 2. Light + Dark theme check (mandatory)

Every visual change must be tested in **BOTH** the Light and Dark palette. Toggle at Settings → Theme, or emulate directly with the in-app browser's `resize_window({ colorScheme: "light" | "dark" })`. Common failures to watch for:

- **Invisible input text** — the text color and the parent background come from different token layers; a control that only used to render on `bg-card` may now sit on `bg-surface` in one theme and be unreadable. The 2026-09-11 MoneyInput slider bug was exactly this: overflow clipped the value in dark mode but stayed visible in light because the clipped area happened to fall over a different-colored region.
- **Focus rings disappearing** into the background — `focus-visible` uses `outline: 2px solid var(--brand)` which must survive both palettes.
- **Icons losing contrast** — `text-muted` on `bg-card` reads fine in light but can drop below WCAG AA in dark; check the muted secondary text on every card.
- **Charts (Recharts) reading the wrong tokens** — donut segments have a `var(--bg)`-colored stroke to look like slices; verify neither theme makes the stroke invisible.
- **Placeholder text** — inherits `color: rgba(muted, ...)`; verify it stays legible against the field's actual background in both themes.

If you shipped it and forgot to check the other theme, you shipped half the feature.

### 3. Mobile-first responsive check (mandatory)

Every screen must look right at **375 × 812** (iPhone SE / 13 mini floor). Use the browser dev tools' device toolbar or the in-app browser's `resize_window` at `preset: "mobile"`. Verify:

- **Nothing overflows horizontally** — the body should never scroll sideways. If a control clips off the right edge of its card, it's a bug. Common culprits: multi-column grids (`grid-cols-[1fr_auto_auto]` with wide native `<select>` options like "Savings & Debt" or "Investment"), fixed-width inputs (`w-36`, `min-w-[220px]`), and horizontal action clusters.
- **Every input, select, and button is fully visible and tappable** — currency-prefixed money inputs (RM chip + digits + `+` button) are the most-common victim.
- **The bottom tab bar doesn't cover the last row** — `pb-24` on the main content area is our current floor.
- **Fix pattern:** default to a stacked `flex-col` on mobile, promote to `sm:grid sm:grid-cols-[...]` from 640px+. Any control with a fixed width on desktop gets `w-full sm:w-auto`. For multi-column existing rows that must stay tabular on desktop, wrap sub-groups in a `<div class="flex sm:contents">` — that lets the mobile flex-col stack sub-groups while desktop's grid still sees each control as a direct grid child.
- **Breakpoints we ship for:** 375 (iPhone SE), 390 (iPhone 14), 414 (iPhone 14 Plus), 768 (iPad portrait), 1024+ (desktop). If it works at 375 and 1024 it works everywhere in between.

### 4. Production E2E smoke (mandatory after a deploy)

**Standing test account** — always use this for E2E on production. Do NOT create a new signup on every session; the shared account already has sample data, at least one debt, one recurring template, and one sinking fund from earlier passes, so you can jump straight to the smoke steps below.

```
email:    test@fasa.local
password: password123
```

The `.local` TLD is intentional — it can't receive real email, so nothing about the account is linkable to a person. Password is documented in the clear on purpose (this account owns nothing real; there is no threat model where its credentials matter). If Supabase ever forces email confirmation on this project, sign up once via the dashboard's `auth.users` insert instead of the signup flow. If the account is missing after a data-wipe test, sign it up again with the same credentials so the next session finds it.

After every push to `main`, once Vercel says "Ready", sign in as this user and walk the golden path on the live URL:

1. `/dashboard` — the 50/30/20 meters render, sample data is present
2. `/transactions` — the ledger loads; add one new transaction via QuickAdd, verify it appears and the dashboard meters move
3. `/recurring` — add one monthly template, hit "Post now", verify a transaction lands on `/transactions`
4. `/funds` — log one contribution, verify the progress bar moves
5. `/debts` — extra-payment slider works, both Snowball + Avalanche cards render, `RM` field shows the value as you drag
6. `/settings` → toggle language EN↔BM, verify every visible string swaps
7. Log out → the login page should render, not throw
8. Log back in → all data intact

Do this pass on **both** desktop viewport and 375×812 mobile — bugs specific to one usually show up here.

**If you need to test the fresh-signup flow itself** (onboarding wizard, first-transaction empty state, welcome copy) — sign up a throwaway user with a timestamped local address like `test-<Date.now()>@fasa.local`, walk the wizard, then close the account via Settings → Data → Delete all so the shared `test@fasa.local` stays clean for the next session.

### 5. Cron endpoint verification (only when the cron code changes)

The Vercel Cron at `17:00 UTC` (`01:00 MYT`) hits `/api/cron/recurring` with `Authorization: Bearer $CRON_SECRET`. To verify the endpoint answers correctly without waiting for the schedule:

```bash
# Should return {"error":"Unauthorized"} — proves the route deployed AND CRON_SECRET is set
curl.exe -i https://<domain>/api/cron/recurring

# Should return {"ok":true,"posted":N,"at":"..."} — the actual happy path
curl.exe -i -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/recurring
```

`curl.exe` (not `curl`) on Windows PowerShell — the alias `curl` is `Invoke-WebRequest`, which handles `-H` differently and will error. The middleware in `lib/supabase/middleware.ts` MUST skip `/api/*` — if that guard is missing, unauthenticated cron hits get redirected to `/login` and Vercel sees the sign-in HTML instead of the JSON response.

### 6. Accessibility spot-check (recommended per slice)

- Keyboard-only walk of any new form: Tab through every control, Enter to submit, Esc to close.
- Every actionable icon needs a `title` and `aria-label`. Every input needs a paired `<label>` or `aria-label`. No exceptions.
- Focus-visible ring must land on a warm terracotta outline, never disappear behind the control.

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
