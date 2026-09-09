# FASA Duit — Project Memory

Running index of decisions, context, and non-obvious facts about this project. One line per entry; expand into a dated section below when the reasoning matters.

## Index

- **Product:** Malaysian-first personal budget tracker **shipping as a multi-user full-stack SaaS web app** (Malaysia + global). English + Bahasa Malaysia. Free open beta first; add paid tier later.
- **Stack (locked 2026-09-08):** Next.js 15 App Router + TypeScript strict, Supabase (Postgres + Auth + Storage + Realtime) in `ap-southeast-1` (Singapore), Tailwind CSS, Recharts, Vercel hosting. Payments deferred.
- **Brief:** [Reference/budget-tracker-prompt.md](Reference/budget-tracker-prompt.md) is the source of truth for feature scope + acceptance criteria (ignore its Artifact / `data/users/me/…` framing — that's superseded by the SaaS pivot).
- **Design reference:** [index.html](index.html) is the single-file React prototype we already built — treat it as the UX + design bible when porting components. Not the shipping product.
- **Visual reference:** [Reference/FASA Duit Budget Tracker.html](Reference/FASA%20Duit%20Budget%20Tracker.html) — warm Etsy-ish palette, terracotta + sage + cream, serif headings.
- **Money invariant:** integer sen everywhere (DB `BIGINT`, `_sen` suffix). APR as basis points (`apr_bps` INT). All arithmetic goes through `lib/money.ts`.
- **RLS invariant:** every user-scoped table has `auth.uid() = user_id` policies. No table launches without them.
- **Regional constraint:** DB region = Singapore for PDPA + latency. Vercel edge covers Singapore/KL for reads.
- **Prototype status (as of pivot):** the single-file prototype ships four core modules already — 50/30/20 Dashboard, Expense Distribution (Recharts donut + top merchants + ranked list), Sinking Funds, Debt Calculator (Snowball vs Avalanche + Islamic mode + slider). Onboarding wizard, Settings v1 (Profile / Categories / Accounts), Transactions ledger with quick-add + undo, sidebar shell, BM catalog. Port these one by one.

## Decisions log

_(Add dated entries here as we make choices that aren't derivable from the brief.)_

### 2026-09-08 — Next.js scaffold landed
- **Deps pinned:** `next@15.0.0`, `react@19.0.0`, `@supabase/ssr@^0.5.2`, `@supabase/supabase-js@^2.45.4`, `@tanstack/react-query@^5.59.0`, `tailwindcss@^3.4.13`, `lucide-react`, `recharts`, `clsx`, `tailwind-merge`. Dev: `typescript@^5.6.3`, `eslint-config-next`, `prettier`, `supabase` CLI.
- **`tsconfig`** — strict + `noUncheckedIndexedAccess` + `noImplicitOverride` + `@/*` path alias. Excludes `index.html` and `Reference/` from the type-check.
- **Design tokens** ported verbatim from prototype to `app/globals.css` — palette, fonts, `overflow-x: clip` sticky-safe reset. Tailwind reads them via CSS variables so themes swap without a rebuild.
- **Fonts:** Fraunces (display) + Inter (body) via `next/font/google` — loaded once in the root layout, exposed as CSS variables to the token system.
- **Auth flow:** `(auth)/login` + `(auth)/signup` use Server Actions calling `supabase.auth.signInWithPassword` / `signUp`. Errors round-trip via query params (upgrade to `useFormState` later). Signup redirects to a "check your email" state; `app/auth/callback/route.ts` handles the confirmation link's `?code=` exchange.
- **Session refresh middleware:** top-level `middleware.ts` → `lib/supabase/middleware.ts` calls `updateSession()` on every request, gates all `(app)` routes for logged-in users, bounces authenticated visitors on `/login|/signup` back into `/dashboard`.
- **App shell:** `(app)/layout.tsx` renders the fixed left sidebar (220px reserved) + top-right log-out button (Server Action). Sidebar items: Dashboard / Transactions / Funds / Debts / Settings — all wired to placeholder pages ready to receive the ported components in later slices.
- **`lib/money.ts`** is the money helper ported to TypeScript with strict types (`Sen = number`). Covers `add / subtract / multiply / divide / percent / bankersRound / splitExact / parse / format / currencySymbol`.
- **Supabase clients:** `lib/supabase/{server,client,middleware}.ts`. Server client reads/writes cookies via `next/headers`; browser client for "use client" components; middleware client refreshes the session.
- **Initial migration** `supabase/migrations/20260908000000_initial_schema.sql`:
  - Enums: `bucket_kind`, `account_kind`, `debt_kind`.
  - Tables: `profiles` (1-1 with auth.users, auto-provisioned by trigger, `split_needs+wants+savings = 100` CHECK), `accounts`, `categories`, `transactions`, `recurring`, `sinking_funds` (contributions as JSONB for parity with prototype), `debts`.
  - Money columns are `BIGINT` with `_sen` suffix. APR is `apr_bps` (INT, 0..100000).
  - Indexes: `(user_id, date DESC)` on transactions, `(user_id, archived)` on accounts/categories, partial `WHERE archived = FALSE` on funds/debts/recurring.
  - **RLS enabled on every user-scoped table** with a single `FOR ALL USING (auth.uid() = user_id) WITH CHECK (…)` policy. Baseline for the whole schema.
  - Storage bucket `receipts` with private policies scoped by `<user_id>/…` path prefix.
- **`supabase/seed.sql`** creates a dev user (`dev@fasa.local` / `password`) for local iteration.
- **`.gitignore` + `.env.example`** in place. `types/supabase.ts` is gitignored (regenerated via `npm run db:types` after each migration).
- **`README.md`** walks through: `npm install → cp .env.example .env.local → npm run db:start → npm run db:reset → npm run db:types → npm run dev`.
- **Placeholder pages** at all five app routes so the shell + middleware can be exercised immediately after `npm install`.

### 2026-09-08 — Pivoted from Claude Artifact to full-stack SaaS
- **Objective:** publish FASA Duit as a real multi-user web app anyone can sign up for; Malaysia primary market, global secondary.
- **Locked choices (via question tool):**
  - **Frontend:** Next.js 15 App Router + TypeScript strict.
  - **Backend + DB:** Supabase (Postgres + Auth + Storage + Realtime), Singapore region.
  - **Payments:** deferred — ship free/open beta first; Stripe + Billplz/ToyyibPay are the tentative plan when we do add them.
  - **Hosting:** Vercel + Supabase Cloud, auto-deploy on push to `main`.
- **What changes for us:** the single-file HTML prototype becomes a UX/design reference; the shipping product is a proper Next.js app with typed DB, RLS auth, and multi-user data.
- **What survives the port:** the entire design system (palette, typography, components, layouts), the money helpers (integer sen + banker's rounding + `splitExact`), the debt simulator, `computeFundState`, and the string catalogs. The db-collection hook pattern gets replaced by TanStack Query + Supabase server clients.
- **Non-obvious data-model change:** every collection gains `user_id UUID REFERENCES auth.users(id)`. The old `data/users/me/…` framing is gone; RLS handles multi-user isolation. Contributions on funds move from an in-doc JSONB array to either JSONB (simple, matches current UX) or a separate `fund_contributions` table (better for indexing); to be decided when we build the migration.

### 2026-09-08 — Repo initialized
- Only content so far: the brief and the HTML visual reference under `Reference/`.
- No Artifact published yet.
- No git repo yet.

### 2026-09-08 — Skeleton landed at `index.html`
- Single-file Artifact-ready HTML (no `<!doctype>`/`<html>`/`<head>`/`<body>` wrapper — the Artifact tool adds those at publish time).
- Design tokens: warm cream `#FBF6EE` / terracotta `#C8553D` / sage `#6B8E5A` / ochre / rust; full dark set redefined in BOTH `@media (prefers-color-scheme: dark)` AND `[data-theme="dark"]`.
- Libraries loaded from cdnjs (pinned): React 18.3.1, ReactDOM 18.3.1, PropTypes 15.8.1, Recharts 2.12.7.
- `money.js` helper: `add`/`subtract`/`multiply`/`divide`/`percent`/`splitExact`/`parse`/`format`/`bankersRound`. Percent takes basis points (bps).
- `db` wrapper stubs `window.claude.db.{get,list,set,update,delete}` — marked `TODO(capabilities)` — falls back to an in-memory Map so the skeleton runs in plain preview. **Before first publish: load `artifact-capabilities` skill and rewire.**
- Debounced writer at 500ms per (collection, doc_id) key.
- Debt math: `amortMonthly_sen` (standard periodic formula) + `amortSchedule_sen` (month-by-month, integer sen).
- Sinking-fund required monthly = `ceil(remaining_sen / months_remaining)`.
- `/#debug/math` route runs 22 assertions across format/parse/rounding/split/amort/sinking — all green in local preview.
- App shell: hash router (dashboard/transactions/funds/debts/settings/debug/math), top tabs on desktop, bottom tab bar under 720px, EN↔BM toggle, string catalog for both.
- Keyboard shortcuts scaffolded: `g d / g t / g f / g x / g s` navigation; `n` and `/` reserved for quick-add + search (TODOs).
- Still stubbed: transactions ledger, quick-add, sinking-fund UI, debt comparator, settings, expense-distribution donut, onboarding wizard, CSV import/export, receipts, alerts, undo toasts.

## Open questions to raise before implementation

- Which font pairing — Fraunces + Inter, or DM Serif Display + Nunito? (Brief allows either — currently using Fraunces + Inter.)
- Do we ship BM translations at v1, or scaffold the catalog and fill EN-only first? (Currently: full BM catalog wherever strings are added.)
- Receipt image storage strategy: data URL inline (capped size) vs Artifact `assets` capability?

## Recent

### 2026-09-08 — Nav moved to left sidebar
- Sidebar (240px, sticky, warm-card bg) holds the primary tabs on desktop.
- Top bar shrunk to just the BM/EN toggle on the right.
- Mobile (<720px) keeps the bottom tab bar; brand moves into top bar next to language toggle.

### 2026-09-08 — Expense distribution on dashboard
- **Donut + ranked list + top merchants** in a single `ExpenseDistribution` component, wired into `Dashboard`.
- **Range toggle:** This month / Last month / Last 3 months / Last 12 months. Handled by `computeRange(kind)` returning `{from, to}` ISO dates.
- **Aggregation hook:** `useExpenseAggregations(transactions, categories, range)` returns `{byCategory, topMerchants, total}` over expenses only (`amount_sen < 0`). Categories grouped to top 8 + "Other" for the donut; merchants top 5.
- **Recharts UMD** already loaded (`Recharts 2.12.7`). Uses `PieChart / Pie / Cell / ResponsiveContainer / Tooltip`. Custom `.rchart-tip` tooltip that reads theme tokens for both light and dark.
- **Donut center callout:** total spent in the range + label ("total spent" / "jumlah dibelanja").
- **Warm palette:** `DIST_COLORS` — 10 hues cycling terracotta → sage → ochre → cocoa; segments have a `--bg`-colored stroke so they read as slices even in dark mode.
- **Interaction:** clicking any donut slice, ranked-list row, or top-merchant row calls `applyLedgerFilter({categoryId | merchant, range})`, which navigates to Transactions and seeds the ledger's own filter state (via a `ts` bump so re-clicks re-apply).
- **Transactions ledger** gained `dateFrom` / `dateTo` filter fields (populated by chart-driven navigation) and a `Clear filters` button that resets query + account + category + date range.
- **BM strings:** `t.dist.*` covers title, subhead, four range labels, "Other", "Top merchants", empty state.
- Sparklines per category and the 12-month stacked bar were deferred (not selected for this slice).

### 2026-09-08 — Debt Calculator shipped (fourth core module)
- **Collection:** `debts` — `{name, type (credit|ptptn|personal|car|mortgage|asb|family|other), balance_sen, apr_bps, min_payment_sen}`. APR stored as basis points (integer) so no float drift.
- **Simulator (`simulateDebts`):** month-by-month integer-sen simulation. Each month: accrue interest (banker's rounding), pay minimums bounded by balance/budget, apply remaining budget to focus debt (snowball=smallest balance, avalanche=highest APR). Freed minimums roll to focus automatically because monthly budget stays fixed at `sum(minimums) + extra`. Safety cap 600 months.
- **Comparator:** two side-by-side cards; the strategy with less total interest (tie-break: fewer months) gets the `winner` outline + terracotta `Winner` pill.
- **Plain-English primer (per your ask):** a top-of-view card with badge + one-line hook + explainer paragraph for each strategy. Snowball = "Pay the smallest first — great for motivation." Avalanche = "Pay the highest rate first — mathematically optimal." Full BM translation.
- **Extra-payment slider:** 0 → RM 3,000 range, step RM 50, default 0. Number input alongside for direct typing; both stay in sync.
- **Savings callout:** `RM X` you save with the winning method vs the other. When both cost the same (extra=0 or trivial debts), shows a neutral "Both strategies finish at the same cost" line.
- **Debt list:** each row shows Balance / Rate / Min/mo + edit + delete. `Show payoff schedule` toggle expands a first-12 + last-12 amortization mini-table (from the winning strategy's `perDebt.schedule`), with a `… X more months …` gap row when the payoff exceeds 24 months.
- **Islamic mode toggle** (per your ask) — segmented `APR / Profit rate` in the view header, persisted to `profile.islamic_mode`. Flips the editor label + row header terminology. Math is unchanged.
- **BM parity:** full `t.debts.*` catalog: primer text, strategy names, editor labels, type labels, empty state, savings copy, confirmation strings.
- **Empty state:** simple lock illustration + note + `Add your first debt` CTA.

### 2026-09-08 — Sinking Funds module shipped
- **Collection:** `sinking_funds` under `data/users/me/…`. Doc fields: `name, target_sen, target_date (ISO), icon, linked_category_id?, contributions[] {date, amount_sen}, created_at (ISO)`.
- **Icons:** 10 Lucide-inspired thin-stroke SVGs baked in (`FUND_ICONS`): `piggy, moon, car, laptop, baby, shield, cap, heart, plane, home`. Picker row in the editor.
- **Math (`computeFundState`):**
  - `saved_sen = manual + linked` (linked = |sum of transactions in the linked category|).
  - `remaining_sen` = max(0, target − saved).
  - `required_monthly_sen` = `sinkingRequiredMonthly_sen(remaining, max(1, months_remaining))` (uses existing helper).
  - **Status heuristic:** compare `actual_pct` (saved / target) to `expected_pct` (elapsed_months / total_months). `done | ahead (≥ expected+5%) | on-track | behind (< expected-5%)`.
  - **Projected completion:** `today + ceil(remaining / monthly_pace) months` where `monthly_pace = saved / elapsed_months` (only when there's real pace data).
- **Editor:** inline card at top of view (per pre-decision), `+ New fund` in the header opens it. Name / Target (money-input) / Target date / Linked category (savings-bucket only) / Icon picker. Same editor handles new + edit.
- **Fund card:** icon chip + name + target date + linked-cat label. Progress bar (sage → warning when behind), saved / target amounts, three stat tiles (required-per-month, left-to-save, projected date), status badge, `Log` toggle.
- **Contribution log** (per-card, collapsed by default): reverse-chronological list with per-row `×` remove; add-row (date + amount + `+`) at the bottom; when a linked category is set and has hits, shows a summary line with the auto-contributed total.
- **Delete** goes through `confirm()` then an undo toast wired to `fundsCol.restore(fund)`.
- **Empty state:** custom piggy-bank illustration + copy + single `Create your first fund` CTA.
- **Totals strip** above the list: total saved / combined target / active fund count.
- **Dashboard nudge card:** picks the first not-done fund with a positive required monthly, shows `Contribute {amount} to {name} this month to stay on pace.` Click → `funds` view. Uses the fund's own icon.
- **BM parity:** full `t.funds.*` catalog (totals, editor labels, stats, status, log, empty state, nudge).

### 2026-09-08 — Sinking Funds slice pre-decisions (for next slice)
- Contributions: **manual log + optional linked category** (both roll into the same progress).
- Empty state: **illustration + single 'Create your first fund' CTA**.
- Editor: **inline card at the top of the Funds view** (toggled by "+ New fund").

### 2026-09-08 — Settings module (v1) shipped
- **Three panels:** Profile & Budget, Categories, Accounts. **Not** in v1: Data panel (export JSON / replay onboarding / delete all) — will come as a follow-up slice.
- **Profile & Budget:** Income (blur-commits, re-formats), Currency (dropdown of the 10 supported), Language (segmented EN / BM), Theme (segmented System / Light / Dark). Live splits editor: three number inputs, running sum shown; `Save split` button disabled unless the three sum to exactly 100. Uses `--warning` for `< 100`, `--danger` for `> 100`, `--accent` for `== 100`.
- **Categories manager:** grouped by bucket (needs / wants / savings), alphabetical inside each group. Rename inline on blur/Enter. Rebucket via per-row dropdown. Archive toggle (icon-only). Add-row at the bottom with name + bucket + `Add`. Bucket badge chips reuse the wizard palette. `Show archived` toggle above the list.
- **Accounts manager:** same shape as categories but grouped by type (`current`, `savings`, `credit`, `ewallet`, `cash`, `investment`). Extra column: opening balance with currency prefix, blur-commits parsed sen. Add-row includes type dropdown.
- **Alphabetical + bucket grouping only** — no drag reorder in v1.
- **BM catalog:** all Settings strings translated, including `types.{cash,current,savings,credit,ewallet,investment}` and the split validation messages.

### 2026-09-08 — Quick-add sample loader fixed
- Was filtering `raw.filter(r => r.day <= today)` which killed 12/20 entries early in the month. Now spreads all 20 entries across the last 20 calendar days ending today, salary on the earliest date. All 20 always land.

### 2026-09-08 — Topbar + button + tooltip
- Terracotta Lucide-style `+` icon in the topbar (right, next to BM/EN). CSS `::after` tooltip with arrow shows `Quick add · N`. Hidden while wizard is up. Clicking calls the same `openQuickAdd` as the `n` shortcut; if the wizard is still up, `openQuickAdd` also flips `skippedThisSession` so the row is actually reachable.

### 2026-09-08 — Quick-add + transactions ledger shipped
- **Data hooks:** `useCollection(pathKey)` gives `{rows, loaded, add, update, remove, restore}` over `db`. Used for `accounts`, `categories`, `transactions`. Restore is used by undo (writes the same id back).
- **`useToasts()`** returns `{toasts, push, dismiss}`. Auto-expire via `durationMs` (default 5000). `ToastRegion` is portalled into the pre-existing `#toast-region` div via `ReactDOM.createPortal` (not `createRoot` — that would remount every render).
- **QuickAdd:** slide-down under topbar, opens on `+` button or `n` shortcut. Fields: Expense/Income toggle → Amount (auto-focus) → Category → Account (defaults to first) → Merchant. Enter saves and refocuses Amount for the next entry; Esc closes. Amount stored signed: negative for expense, positive for income.
- **Ledger:** date DESC, columns Date/Merchant/Category/Account/Amount/×. Sample rows show a small "sample" tag next to the merchant. Delete pushes a 5-second Undo toast (`restore` re-adds with the same id).
- **Search + filters:** live search across merchant/notes/tags; account and category dropdowns. `/` focuses the search field (auto-navigates to Transactions first).
- **Empty state:** custom SVG wallet illustration + "Add transaction" + "Load sample month" (20 realistic MY entries scoped to days ≤ today).
- **Sample month generator:** 20 entries (1 salary + 19 spend) with Petronas, Village Grocer, Astro, TNB, Unifi, PTPTN, Shopee, SmartTAG, ASNB, KFC, etc. Only days ≤ today land, so dashboard totals stay realistic. Uses category name → id and account name → id lookups from the seeded onboarding data.
- **Dashboard wired to real spend:** `Dashboard` now receives `transactions` + `categories` and rolls up current-month expense per bucket (`YYYY-MM` prefix match, income skipped, category→bucket lookup). Meters, remaining, over-color all reactive.
- **Keyboard shortcuts (final):** `n` opens quick-add, `/` focuses search, `g d/t/f/x/s` navigation. All ignored while typing in an input/select/textarea.
- **Date format:** `DD/MM/YYYY` via `formatDate(iso)` — week-start-Monday not yet exposed (no calendar view yet).

### 2026-09-08 — Onboarding wizard shipped
- **Decisions locked (all recommended options taken):** preset chips + custom for accounts; full MY category seed on Finish; income is the only required step; "Skip for now" is per-session (doesn't set `onboarding_done`, resurfaces on next visit).
- Gate: shows whenever `!profile.onboarding_done && !skippedThisSession && route !== 'debug/math'`.
- Step 1 — income: `RM`-prefixed money input, blurred-format on blur, validated non-zero to advance; inline error uses `--danger` token.
- Step 2 — currency: 10 currencies (MYR default, then SGD/USD/AUD/GBP/EUR/IDR/THB/PHP/JPY).
- Step 3 — accounts: `ACCOUNT_PRESETS` constant covers 10 MY banks + 7 eWallets + Cash/Credit/Savings. Selection toggles a chip; selected accounts appear in a list with per-account opening balance and `×` to remove. Custom accounts added via a name input (Enter to commit).
- Step 4 — categories: preview grouped by bucket with color-coded badges (needs=sage, wants=ochre, savings=terracotta). Seeds 27 categories from `DEFAULTS.categoriesSeed` on Finish.
- Persistence: `updateProfile({income_sen})` and `{currency}` write on Next; accounts + categories batch-write via `db.set` on Finish; then `onboarding_done: true`.
- BM catalog fully covered for the wizard.
- Small utility: `fmt(str, vars)` interpolates `{n}` placeholders (used for step count + category count strings).
- `currencySymbol(code)` helper renders the prefix in money inputs.
