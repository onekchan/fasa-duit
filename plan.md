# FASA Duit — Plan

Product, UX, and business-model planning for **FASA Duit**. Everything here is forward-looking (what we want the app to be and how we make it sustainable). Operational rules for actually building the code live in [CLAUDE.md](CLAUDE.md); running decisions log lives in [MEMORY.md](MEMORY.md).

Whenever a slice's priorities are unclear, come back here first.

---

## Product goal

- **Audience:** Malaysian professionals + freelancers + young families primary; English-speaking global users secondary.
- **Distribution:** Public multi-user SaaS. Anyone can sign up, land in the app in under 30 seconds, own their own data, and come back to find it exactly as they left it.
- **Success looks like:** a KL professional signs up on Sunday night, does the 4-step wizard, adds a week of transactions, and next weekend logs back in from their phone to reconcile — everything intact, dashboard warm and inviting, feels like coming home.
- **Regional constraint:** DB region = Singapore for PDPA + latency. Vercel edge covers Singapore/KL for reads.

---

## UX principles (the four rules we ship to)

Every feature, page, and interaction is judged against these four. If a change makes any of them worse, we don't ship it without a reason we can explain in one sentence.

| Rule | Why users love it | Where we stand (2026-09-11) |
| --- | --- | --- |
| **Instant loading** | If it takes more than 3 seconds, users leave. | **Shipping** — Server Components fetch on the edge, Supabase in Singapore, route-level skeletons, top progress bar on transitions. Verify: TTI < 3s on 4G at 375×812 for every authenticated route. |
| **No-sign-up value** | Let people use the core feature before asking them to create an account. | **Gap** — the app fully gates behind sign-up right now. Plan below covers how we open a demo path without breaking RLS. |
| **Mobile-first design** | 60%+ of traffic surfs on a phone; it must feel like an app. | **Shipping** — bottom tab bar (6 tabs), 375×812 audit passed 2026-09-10, calc-style money input with mobile keypad, safe-area padding on iOS home indicator. |
| **Dark mode** | A simple toggle that saves eyes during late-night surfing. | **Shipping** — Settings → Theme → System / Light / Dark applies to `<html data-theme>` before hydration (no FOUC), persists to `profiles.theme` + `localStorage`. Landed 2026-09-10. |

### How we plan to close the "no-sign-up value" gap

- **Public demo route `/demo`:** a read-only sandbox seeded with sample MY data (same 20-transaction fixture we already use in `lib/sample-data.ts`), rendered from a signed cookie instead of `auth.uid()`. All mutations are no-ops that show a toast: "Sign up to save".
- **Marketing landing page shows the actual dashboard mock** — already done at `app/page.tsx` — so a visitor sees the product before the CTA.
- **Signup ask lands at step 3 of the wizard**, not before. Steps 1–2 (income + currency) work anonymously via `sessionStorage`; step 3 asks for the account and carries the anonymous data across.

Not built yet. Prioritize once V1.0 features are close.

### UX invariants (the small stuff that also matters)

- **Warm, calm copy.** "You're 12% over on Wants — RM 180 above plan." Never "You failed."
- **Every destructive action gets a 5-second undo toast.** No dead-modal "Are you sure" without a way back.
- **Focus rings are always visible** (`:focus-visible` outline: 2px terracotta).
- **No emoji in the chrome.** `lucide-react` line icons only.
- **BM and EN full parity.** Every string in EN has a BM twin — a half-translated screen ships nothing.

---

## Business model — Freemium Hybrid

Two-phase rollout. Beta first (build audience + data), then V1.0 splits into Free-with-ads and Premium-ad-free-with-extras.

### Phase 1 — Beta launch (now → V1.0)

**Goal:** user acquisition + data on which features actually matter.

- **User experience:** everyone gets the full core engine, free.
- **Monetization:** clean, non-intrusive banner ads on the site.
- **Ad platforms to test (in order of feasibility for our traffic level):**
  1. **EthicalAds** — great fit if our audience skews tech / financially literate; low barrier. **We ship placements against EthicalAds attribute names.**
  2. **Media.net** — Yahoo/Bing contextual ads; less strict than AdSense on early traffic.
  3. **BuySellAds** — direct-sold ad space; best CPM once we have consistent audience.
  4. **Google AdSense** — deferred. Strict traffic requirements and slow approval; revisit after 5k MAU.
- **Ad rules (non-negotiable):**
  - **No ads on the auth flow, the wizard, or the calc-style money inputs.** Anywhere the user is entering their real financial data is ad-free.
  - **No interstitials, no pop-ups, no auto-play video.** Static banners only.
  - **Above-the-fold on mobile stays ad-free** — the dashboard's 50/30/20 meters land in the first paint uninterrupted.

#### Ad-slot infrastructure (shipped 2026-09-11)

We built `components/ads/AdSlot.tsx` as the single reusable slot. It renders one of three states:

1. **Premium bypass** — subscribed users get `null` so the third-party script never loads. Speed becomes a hidden bonus of paying.
2. **Placeholder** — when `NEXT_PUBLIC_ADS_ENABLED !== "1"` (default in dev + preview + production-until-approved), a subtle warm dashed-outline card reading "Ad space · beta". Lets us design without loading trackers.
3. **Live** — when the env flag is set AND EthicalAds has approved us, `<div data-ea-publisher="…" data-ea-slot="…">` is rendered and the root layout injects the EthicalAds loader script (`data-ea-npa="1"` = no personalized ads, so no cookies, PDPA-safe).

**Placements shipped so far** (3 slots, all against these rules):

| Slot id | Location | Why |
| --- | --- | --- |
| `txn-below-ledger` | `/transactions` — below the last row | Highest-viewed page in the app; user must scroll past their data to see it |
| `debts-between-primer-and-slider` | `/debts` — between the Snowball/Avalanche primer card and the extra-payment slider | Natural pause in the reading flow; money inputs stay ad-free |
| `landing-above-footer` | `/` — above the actual footer | Public page, counts anonymous impressions too |

**Env vars to flip when EthicalAds approves us:**

```bash
# In Vercel → Production only. Preview and dev stay in placeholder mode.
NEXT_PUBLIC_ADS_ENABLED=1
NEXT_PUBLIC_ETHICALADS_PUBLISHER=fasa-duit    # or whatever slug they assign
```

No code change to switch — just set the two env vars, redeploy. Every existing `<AdSlot>` picks it up.

**Next placements to consider once we have data:** dashboard between "Where your money went" and the Snowball nudge card (public site low-viewed page, so tricky), and settings-page bottom (very low value, low CTR). Both deferred until EthicalAds tells us where fill is strong.

### Phase 2 — V1.0 rollout (paywall split)

Two tiers, cleanly separated by a `profiles.subscription_status` column.

| Feature | **Free (Beta Legacy)** | **Premium (V1.0)** |
| --- | --- | --- |
| Cost | RM 0 / month | RM 20–60 / month (target: RM 29) |
| Core tools | All beta features | All beta features + V1.0 tools |
| Ad experience | Standard banner ads | 100% ad-free |
| Recurring templates | Up to 5 | Unlimited |
| Sinking funds | Up to 3 | Unlimited |
| Debt payoff comparator | 3 debts | Unlimited |
| CSV import | Manual paste | Bank-format autodetect (Maybank/CIMB/HLB) |
| Export | JSON only | JSON + CSV + PDF report |
| Budget alerts | — | Email + push (via Edge Function) |
| Receipt OCR | — | Automatic amount + merchant extraction |
| Multi-account currency conversion | — | Live rates |
| Historical dashboards | Last 3 months | Unlimited |
| Priority support | — | Direct email |

(Numbers are anchors — set based on Beta usage data before launch.)

### Payment + auth stack (implementation notes)

- **Auth:** we already use Supabase Auth (email/password + Google OAuth planned). Do NOT re-platform to Clerk/Auth0 for V1.0 — Supabase Auth handles the tier check via a `profiles.subscription_status` column just fine. Only move if we hit a concrete Supabase Auth limit.
- **Subscriptions:** **Stripe Billing** — hosted checkout + webhook to a Supabase Edge Function that updates `profiles.subscription_status`.
- **Malaysian payment rails:** add **Billplz** or **ToyyibPay** alongside Stripe for FPX (Malaysian bank transfer) — Malaysian users use FPX more than cards.
- **Ad-free conditional loading:** the ad script is loaded from a `<Ads>` client component that reads `profile.subscription_status`. Premium users get an early return → no ad script runs → page is instantly faster. That speed becomes a hidden bonus of paying.

### Schema additions needed for Phase 2 (deferred until we build it)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'trialing', 'active', 'past_due', 'canceled')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_subscription_status_idx
  ON public.profiles(subscription_status)
  WHERE subscription_status != 'free';
```

Don't run this yet — write it when we build Phase 2.

---

## Roadmap (next slices, in priority order)

| # | Slice | Why | Blocked on |
| --- | --- | --- | --- |
| 1 | **CSV import/export** | Data portability = PDPA-friendly + power-user unlock | — |
| 2 | **Budget alerts** | Passive engagement between visits | Edge Function cron pattern |
| 3 | **BM landing page** | Currently only `/` is EN — BM users bounce | — |
| 4 | **Custom domain** | `fasa.my` reads better than `fasa-duit-pink.vercel.app` | Domain purchase + DNS |
| 5 | **`/demo` sandbox** | Closes the "no-sign-up value" UX gap | Signed-cookie session pattern |
| 6 | **Per-debt `is_islamic` flag** | Mixed conventional + Islamic portfolios need per-row labels | Small migration |
| 7 | **Receipt OCR** | Big Premium differentiator | Choose OCR vendor |
| 8 | **Phase 2 subscription infra** | Business-model launch | Stripe + Billplz setup |

---

## Open questions

- What's the actual RM anchor for Premium? Survey Beta users at ~1000 MAU.
- Do we ship a family plan (2–5 accounts) or defer? Malaysian couples often budget together.
- Which ad network do we start with? Test EthicalAds first with a placeholder page and measure fill rate before wiring into the app.
- Do we send a "your monthly recap" email? Premium-only or free too? (Retention lever either way.)
