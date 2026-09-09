# Prompt — Build "FASA Duit" (Malaysian‑first Budget Tracker SaaS)

> Paste everything below into a new Claude conversation. It's written for Claude Sonnet / Opus and assumes Claude will publish the app as an Artifact with the `db` and `user` runtime capabilities (Claude's built‑in auth + database), so the login and "get my data back on next visit" behavior works out of the box with no external backend.

---

## Role & mission

You are a senior product designer + full‑stack engineer. Build me a polished, production‑feeling personal budget tracker web app called **FASA Duit** (Malay for "money"). It must be something a person would happily pay a monthly subscription for — not a demo. Publish it as a single Claude Artifact using the `db` capability (shared database, per‑user private subtree under `data/users/me/…`) and the `user` capability (so `me` resolves to the signed‑in Claude account). Before you write the page, load the `artifact-capabilities` skill and follow its current contract for `db` + `user` verbatim.

Every returning visit must feel like coming home: the user signs in with their Claude account, their data loads, and they pick up exactly where they left off.

## Target user

- **Primary:** Malaysian professionals, freelancers, and young families managing household finances in Ringgit (RM). Think a KL‑based 28‑year‑old with a Maybank current account, a TnG eWallet, EPF contributions, a PTPTN balance, one credit card, and a Hari Raya sinking fund.
- **Secondary:** English‑speaking users anywhere. Localization must not get in the way of a user in Singapore, Australia, or the US using the app comfortably.

## Core features — MUST ship all four, fully working

### 1. 50/30/20 Dashboard
- User sets **monthly take‑home income** (after tax + EPF + SOCSO + EIS).
- Auto‑derives the three buckets: **Needs 50%**, **Wants 30%**, **Savings & Debt 20%**. Let the user override the split (e.g. 60/20/20 for high cost‑of‑living months).
- Every expense category is tagged Needs / Wants / Savings so transactions auto‑roll up.
- Three horizontal progress meters (spent vs allotted), each showing RM spent, RM remaining, % used, and days left in the cycle.
- When a bucket goes over, the meter shifts to a warning color and shows the overshoot in RM.
- Small "insight" strip under the meters — e.g. *"You're pacing 12% under Needs this month — RM 240 headroom."*
- Month picker so users can look back at any previous cycle.

### 2. Expense Distribution
- Donut chart of the current month's spend by category, hover shows RM and %.
- Ranked category list beside the donut (top 8 + "Other"), with a small sparkline of the last 6 months per category.
- Toggle between **This month / Last month / Last 3 months / Last 12 months / Custom range**.
- Second view: stacked monthly bar (last 12 months) so trend is visible at a glance.
- "Top merchants" widget (top 5 payees by RM this month, e.g. *Petronas, Village Grocer, Grab, Astro, Shopee*).
- Every chart segment is clickable → filters the transaction list underneath.

### 3. Sinking Funds
- Create named goals with target amount, target date, and optional icon (Hari Raya, Umrah, Car down payment, MacBook, Baby, Emergency Fund, PTPTN payoff, Wedding).
- App calculates the **required monthly contribution** to hit the goal on time and displays "on track / behind / ahead" against actual contributions.
- Users log contributions manually or link a category so tagged transactions auto‑contribute.
- Progress bar, RM saved, RM to go, months remaining, and the projected completion date at the current pace.
- Support many funds in parallel; total across all funds visible at the top.
- A gentle nudge card ("Contribute RM 350 to Hari Raya 2027 this month to stay on pace") on the dashboard.

### 4. Debt Calculator
- Add multiple debts with: name, type (credit card, PTPTN, personal loan, car loan, mortgage, ASB loan, family), current balance, APR / profit rate, minimum monthly payment.
- Side‑by‑side comparison of **Snowball** (smallest balance first) vs **Avalanche** (highest rate first): debt‑free date, total interest paid, total months to freedom for each strategy — with the difference highlighted in RM.
- Extra‑payment slider ("If I put an extra RM ___ per month toward debt…") that updates both strategies live.
- Per‑debt amortization mini‑table (first 12 months + last 12 months, collapsible full schedule).
- Islamic finance mode: label rate as "profit rate" instead of "interest" and hide compounding language when toggled.

## Subscription‑tier feature set (all included; this is a paid app)

Ship these on top of the four core modules:

- Multi‑account ledger (cash, current, savings, credit card, eWallet, investment) with running balances and reconciliation.
- Recurring transactions (salary, rent, Astro, Unifi, insurance premiums, zakat).
- Quick‑add transaction (single input row, sensible defaults, keyboard `n` to open).
- Search + filter (date range, account, category, merchant, amount range, tag, notes).
- Tags, notes, and optional receipt image (data URL, capped size).
- Budget alerts (in‑app, threshold configurable per bucket and per category).
- Reports: month‑over‑month, year‑to‑date, category deep‑dive, cash‑flow (income − expenses per month).
- CSV export of transactions; CSV import with column mapping.
- Dark mode that respects OS preference and a manual toggle that overrides it.
- Onboarding: 4‑step wizard on first login (income, currency, accounts, starter categories) that pre‑fills sensible Malaysian defaults.
- Settings: rename buckets, edit categories, manage accounts, delete all my data (with confirmation), export everything as JSON.

## Malaysian localization (default; user can change)

- **Currency:** MYR default, formatted `RM 1,234.56` (space after RM, comma thousands, always 2 decimals). User can switch to SGD, USD, AUD, GBP, EUR, IDR, THB, PHP, JPY — formatting adjusts.
- **Language:** English + Bahasa Malaysia. Full string catalog for both; toggle in settings persists per user.
- **Date format:** `DD/MM/YYYY`; week starts Monday.
- **Financial instruments** appear as first‑class account types / savings categories: **EPF** (including i‑Saraan for gig workers), **ASB / ASNB** (with variable/fixed variants), **Tabung Haji**, **PRS**, **ASM**, **unit trusts**, **Sukuk**, **Amanah Saham**, plus generic "brokerage".
- **Banks & payment methods** as selectable account presets: Maybank, CIMB, Public Bank, RHB, Hong Leong, AmBank, Bank Islam, Bank Rakyat, BSN, MBSB, Alliance, HSBC MY, Standard Chartered MY, OCBC MY, UOB MY — plus **TnG eWallet, Boost, GrabPay, ShopeePay, MAE, BigPay, Setel, DuitNow QR**.
- **Default expense categories** (editable): Groceries, Mamak & Kopitiam, Dining Out, Coffee, Transport — Grab, Transport — Petrol, Transport — Tolls (SmartTAG/RFID), Public Transport (LRT/MRT/KTM), Utilities — TNB, Utilities — Water (SYABAS/Air Selangor/Indah Water), Telco (Maxis/Digi/CelcomDigi/U Mobile/Yes/Unifi Mobile), Internet (Unifi/Time/Maxis Home), Rent / Mortgage, Insurance & Takaful, Medical & Panel Clinic, Education, Childcare, PTPTN, Zakat, Sedekah, Tithe, Subscriptions (Netflix/Spotify/Astro/iQIYI), Shopping (Shopee/Lazada/TikTok Shop), Travel, Personal Care, Gifts, Charity, Others.
- **Sensible starter buckets:** Needs = Groceries, Rent/Mortgage, Utilities, Water, Telco, Transport (petrol/tolls/public), Insurance, Medical, PTPTN, Childcare. Wants = Mamak, Dining Out, Coffee, Shopping, Subscriptions, Travel, Personal Care, Gifts. Savings = EPF top‑up, ASB, Tabung Haji, PRS, Sinking Funds, Debt payments beyond minimum, Zakat.

## Design system — Etsy warm, calm, tactile

- **Palette (light):**
  - Background `#FBF6EE` (warm cream)
  - Surface `#FFFFFF` on cream, cards use `#F5EBDA` for elevated warmth
  - Ink (primary text) `#3E2A1F` (deep espresso)
  - Muted text `#7A6B5F`
  - Primary / brand `#C8553D` (terracotta)
  - Accent `#6B8E5A` (sage) for positive / on‑track states
  - Warning `#D98E3A` (amber ochre)
  - Danger `#A03E2F` (deep rust)
  - Divider `#E8DCC7`
- **Palette (dark):** dark cocoa background `#1F1712`, warm ink `#F5EBDA`, cards `#2A211B`, keep terracotta / sage / ochre accents. Provide the full dark set as CSS custom properties and swap under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark):not([data-theme="light"])`.
- **Type:** headings in a warm serif (Fraunces or DM Serif Display), body in a clean humanist sans (Inter or Nunito). Load from Google Fonts with a proper system fallback stack.
- **Shape:** rounded‑2xl (16–20px radius) cards, generous 20–28px padding, soft 1px inner borders in `#E8DCC7`, and gentle drop shadows (`0 1px 2px rgba(62,42,31,.06), 0 8px 24px rgba(62,42,31,.06)`).
- **Motion:** 150–200ms ease for hover and state changes. No bounce, no parallax. Numbers count up on load for the dashboard KPIs (300ms max).
- **Icons:** thin‑stroke line icons (Lucide). Never emoji in the chrome.
- **Empty states:** a small warm illustration mood (SVG, hand‑drawn feel) + one‑line invitation + one primary CTA button.

## Math accuracy — non‑negotiable

- Store **all monetary amounts as integer sen** (1 RM = 100 sen). Never store money as JS floats.
- All arithmetic goes through a small `money.js` helper with `add`, `subtract`, `multiply`, `divide`, `percent`, `format`, `parse`. Round using **banker's rounding** at display time only.
- Debt amortization uses the standard periodic formula `M = P·r·(1+r)^n / ((1+r)^n − 1)` with `r = APR / 12`; iterate month‑by‑month for schedules (do not close‑form when the user is comparing snowball vs avalanche — you need the interaction between debts).
- Sinking‑fund required monthly = `ceil(remaining_sen / months_remaining)` in sen. Show the exact RM figure and, separately, "you'd finish X days early / late" at current pace.
- Percentages of budget buckets are computed off the sen total, rounded for display only. The three bucket allocations must always sum exactly to the income to the last sen — put any rounding remainder into the largest bucket.
- Include a hidden `/#debug/math` route with 30+ unit assertions that run in‑page and show pass/fail; this is your own regression net and a trust signal for me.

## Data model (Claude Artifact db)

Use the private per‑user subtree; every collection path below is under `data/users/me/…`:

- `data/users/me/profile` (doc `settings`) — currency, language, theme, income_sen, split (needs/wants/savings percentages), onboarding_done.
- `data/users/me/accounts` — one doc per account: name, type, institution, opening_balance_sen, currency, archived.
- `data/users/me/categories` — one doc per category: name, bucket (needs|wants|savings), icon, color, archived.
- `data/users/me/transactions` — one doc per txn: date (ISO), account_id, category_id, amount_sen (signed: expenses negative, income positive), merchant, notes, tags[], receipt_data_url?, recurring_id?.
- `data/users/me/recurring` — schedule (rrule‑ish subset), template txn, next_run.
- `data/users/me/sinking_funds` — name, target_sen, target_date, icon, linked_category_id?, contributions[]{date, amount_sen}.
- `data/users/me/debts` — name, type, balance_sen, apr_bps (basis points), min_payment_sen, extra_payment_sen.

Read/write through the tool's `read_db` / `write_db` actions. Debounce writes (500ms) and batch on save. Every list view paginates with `query.limit` + `query.cursor` — never fetch everything at once.

## UX principles

- **One thing per screen.** The dashboard is a summary; drill‑ins are separate views.
- **Quick‑add is sacred.** Adding a transaction takes ≤ 4 keystrokes for the amount, and Tab moves through amount → category → account → save. `Enter` saves and reopens for the next.
- **No modals for destructive actions without an Undo toast.** Deleting a transaction shows a 5‑second undo.
- **All numbers are inspectable.** Click any RM figure on the dashboard to see the transactions behind it.
- **Never lose a keystroke.** Autosave on blur for every form field.
- **Friendly copy, never scolding.** "You're 12% over on Wants this month — RM 180 above plan." Not "You failed your budget."
- **Full keyboard support** for power users: `n` new txn, `/` search, `g d` go dashboard, `g t` transactions, `g f` funds, `g x` debts.

## Tech approach

- Single self‑contained HTML file, no build step. Inline all CSS and JS. Load React 18, ReactDOM 18, and Recharts from `cdnjs.cloudflare.com` (pin exact versions, UMD builds). Fonts from Google Fonts. No other external hosts.
- State: React with a small `useReducer` store per collection, hydrated from `read_db` on mount and rehydrated on the `user` capability's sign‑in event.
- Charts: Recharts (donut, stacked bar, sparkline). Make them fully theme‑aware by reading CSS custom properties.
- Accessibility: WCAG AA color contrast, focus rings visible on the warm palette, `aria-live` for toast messages, form labels associated with inputs, tables have proper headers.
- Responsive: works from 360px (phone) up. Nav collapses to a bottom tab bar under 720px.
- Zero horizontal page scroll. Wide tables scroll inside their own `overflow-x:auto` container.

## What to deliver in your reply

1. A one‑paragraph plan of what you're building and the choices you made.
2. The Artifact, published via the Artifact tool with `capabilities: { db: {…}, user: {…} }` per the current `artifact-capabilities` contract.
3. A short "How to use FASA Duit" section covering: signing in, first‑run wizard, adding a transaction, creating a sinking fund, using the debt comparator, switching to BM, and enabling dark mode.
4. A "What I'd add next" list of 5 sharp ideas beyond this brief (e.g. shared household budgets, bank statement OCR, zakat calculator, portfolio tracker for ASB/EPF/PRS, spending forecasts).

## Acceptance criteria (you must satisfy all)

- I can sign in, add transactions, close the tab, and come back tomorrow to find everything intact.
- The 50/30/20 meters, distribution donut, sinking‑fund progress, and debt payoff dates all update within one animation frame of any change.
- Every RM figure formats as `RM 1,234.56` — never `1234.5` or `RM1234.56`.
- The `/#debug/math` route reports all assertions green.
- Switching to Bahasa Malaysia translates the entire UI (not just some strings).
- The app looks and feels calm, warm, and inviting — not spreadsheet‑cold and not neon‑fintech.
- Nothing about the app assumes the user lives in the US.

Begin.
