import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Coins,
  Landmark,
  LineChart,
  PiggyBank,
  Sparkles,
} from "lucide-react";

/**
 * Public marketing landing. Server Component only (no client state) so it
 * prerenders on Vercel and stays fast. Copy leans Malaysian-first — Hari Raya,
 * PTPTN, EPF, Ringgit-first — so a KL professional lands and immediately feels
 * this app was made for them.
 *
 * Design tokens are the same warm palette used inside the app, so the whole
 * page themes automatically in light and dark.
 */
export default function LandingPage() {
  return (
    <>
      <TopNav />
      <Hero />
      <FeatureStrip />
      <DashboardMockup />
      <TrustStrip />
      <Faq />
      <Footer />
    </>
  );
}

// ─── Top nav ────────────────────────────────────────────────────────────────
function TopNav() {
  return (
    <header className="sticky top-0 z-10 border-b border-divider/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-xl font-bold text-brand">
          FASA Duit
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-ink transition-colors hover:bg-card"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand px-4 py-2 text-[color:#FFF6EC] shadow-sm transition hover:brightness-105"
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-14 sm:pt-24">
      <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Made for Malaysia — free open beta
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            A warm, calm budget tracker built for{" "}
            <span className="text-brand">Ringgit-first</span> life.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            50/30/20 by default. Sinking funds for Hari Raya, Umrah, or a new
            laptop. Snowball vs Avalanche for PTPTN and credit cards. English
            and Bahasa Malaysia. All in RM, all in your pocket.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-semibold text-[color:#FFF6EC] shadow-sm transition hover:brightness-105"
            >
              Start free
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-divider px-5 py-3 font-semibold text-ink transition-colors hover:bg-card"
            >
              Log in
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted">
            Your data stays in Singapore (ap-southeast-1) and belongs to you.
            Nothing sold, nothing shared.
          </p>
        </div>

        {/* Hero art — soft calm coins / bar-y motif done with just SVG + tokens */}
        <div className="relative">
          <HeroArt />
        </div>
      </div>
    </section>
  );
}

function HeroArt() {
  return (
    <div className="relative aspect-square w-full max-w-[420px] mx-auto">
      <div className="absolute inset-0 rounded-[32%] bg-card" />
      <div className="absolute inset-6 rounded-[30%] bg-surface shadow-md" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid w-3/4 gap-4">
          <FakeBar label="Needs" pct={40} tone="accent" />
          <FakeBar label="Wants" pct={22} tone="warning" />
          <FakeBar label="Savings" pct={65} tone="brand" />
        </div>
      </div>
    </div>
  );
}

function FakeBar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "accent" | "warning" | "brand";
}) {
  const fill =
    tone === "accent" ? "bg-accent" : tone === "warning" ? "bg-warning" : "bg-brand";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-muted tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-pill bg-divider">
        <div
          className={`h-full rounded-pill ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────
function FeatureStrip() {
  const items = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "50/30/20 that fits KL life",
      body: "Needs, Wants, Savings & Debt — track them at a glance, override the split for high cost-of-living months, and see how much runway you have left.",
    },
    {
      icon: <PiggyBank className="h-5 w-5" />,
      title: "Sinking funds for real goals",
      body: "Hari Raya 2027. Umrah. Baby. New MacBook. Set a target and date, log contributions, and know exactly how much per month to stay on pace.",
    },
    {
      icon: <Coins className="h-5 w-5" />,
      title: "Snowball vs Avalanche for debt",
      body: "PTPTN, credit cards, ASB loans — see both payoff strategies side-by-side, drag a slider to see 'what if I threw an extra RM 500', and pick the winner.",
    },
    {
      icon: <Landmark className="h-5 w-5" />,
      title: "Malaysian banks + eWallets",
      body: "Maybank, CIMB, Public, RHB, Hong Leong, Bank Islam, and every major eWallet — TnG, MAE, Boost, GrabPay, ShopeePay — one-tap during onboarding.",
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl sm:text-4xl">
          Everything you need. Nothing you don&apos;t.
        </h2>
        <p className="mt-3 text-muted">
          Four modules — plus a sidebar full of small niceties that make daily
          logging feel like a hobby, not a chore.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <div
            key={it.title}
            className="rounded-card border border-divider bg-surface p-6 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
              {it.icon}
            </div>
            <h3 className="mt-4 font-display text-lg">{it.title}</h3>
            <p className="mt-2 text-sm text-muted">{it.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Dashboard mockup ────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <section className="border-y border-divider bg-card/40 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl sm:text-4xl">
            One warm dashboard. Everything visible.
          </h2>
          <p className="mt-3 text-muted">
            50/30/20 meters at the top. Sinking-fund nudges next. Then the
            distribution donut and top merchants — click any slice to see the
            transactions behind it.
          </p>
        </div>

        {/* Fake dashboard — mirrors the real one at a glance */}
        <div className="mx-auto mt-12 max-w-4xl rounded-card border border-divider bg-surface p-6 shadow-md">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="font-display text-2xl">This month</div>
            <div className="text-xs text-muted">21 days left</div>
          </div>

          <div className="space-y-3">
            <MockMeter label="Needs" spent="RM 506.20 spent" pct={20} />
            <MockMeter label="Wants" spent="RM 137.30 spent" pct={9} />
            <MockMeter label="Savings & Debt" spent="RM 500.00 spent" pct={50} />
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-card border border-divider bg-card px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-brand">
              <PiggyBank className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-ink">Hari Raya 2027</div>
              <div className="text-muted">
                Contribute RM 454.55 this month to stay on pace.
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-card border border-divider bg-card p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="font-display text-lg">Where your money went</div>
                <div className="rounded-lg border border-divider bg-surface px-2 py-1 text-[11px] font-semibold text-ink">
                  This month
                </div>
              </div>
              <MockDonut />
            </div>
            <div className="rounded-card border border-divider bg-card p-5">
              <div className="font-display text-lg">Top merchants</div>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {[
                  ["ASNB", "RM 500.00"],
                  ["PTPTN", "RM 300.00"],
                  ["Village Grocer", "RM 156.20"],
                  ["Shopee", "RM 89.90"],
                  ["Netflix", "RM 55.00"],
                ].map(([name, amt]) => (
                  <li key={name} className="flex justify-between">
                    <span className="text-ink">{name}</span>
                    <span className="font-semibold tabular-nums">{amt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockMeter({
  label,
  spent,
  pct,
}: {
  label: string;
  spent: string;
  pct: number;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-semibold">{label}</span>
        <span className="text-xs text-muted">
          {spent} · {pct}% used
        </span>
      </div>
      <div className="h-2 rounded-pill bg-divider">
        <div
          className="h-full rounded-pill bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Static SVG donut in the warm palette. Pure decoration. */
function MockDonut() {
  const segments = [
    { color: "var(--brand)", pct: 40.5, label: "ASB / ASNB" },
    { color: "var(--accent)", pct: 24.3, label: "PTPTN" },
    { color: "var(--warning)", pct: 12.7, label: "Groceries" },
    { color: "#8C5A3C", pct: 7.3, label: "Shopping" },
    { color: "#A03E2F", pct: 6.2, label: "Subscriptions" },
    { color: "#5F7A6B", pct: 5.0, label: "Other" },
    { color: "#B08056", pct: 4.0, label: " " },
  ];
  const total = segments.reduce((a, s) => a + s.pct, 0);
  let acc = 0;
  const R = 45;
  const C = 2 * Math.PI * R;

  return (
    <div className="mt-2 flex items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          {segments.map((s) => {
            const len = (s.pct / total) * C;
            const gap = C - len;
            const off = -acc;
            acc += len;
            return (
              <circle
                key={s.label}
                cx={60}
                cy={60}
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={16}
                strokeDasharray={`${len} ${gap}`}
                strokeDashoffset={off}
              />
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="font-display text-lg font-semibold tabular-nums text-ink">
            RM 1,233
          </div>
          <div className="text-[10px] text-muted">total spent</div>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs">
        {segments.slice(0, 4).map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-sm"
              style={{ background: s.color }}
            />
            <span className="text-ink">{s.label}</span>
            <span className="ml-auto text-muted tabular-nums">
              {s.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Trust ───────────────────────────────────────────────────────────────────
function TrustStrip() {
  const points = [
    { title: "Ringgit-first", body: "RM 1,234.56 formatting from day one." },
    { title: "English + BM", body: "Toggle between English and Bahasa Malaysia — complete UI." },
    { title: "Singapore region", body: "Data lives in ap-southeast-1. PDPA-aware." },
    { title: "Yours to own", body: "One click to export everything as JSON." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {points.map((p) => (
          <div key={p.title} className="flex items-start gap-3">
            <BadgeCheck className="h-5 w-5 shrink-0 text-accent" />
            <div>
              <div className="font-semibold text-ink">{p.title}</div>
              <div className="mt-1 text-sm text-muted">{p.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function Faq() {
  const items = [
    {
      q: "How much does it cost?",
      a: "Free while we're in open beta. Once we launch a paid tier, existing beta users keep everything free for the current release cycle. No surprises.",
    },
    {
      q: "Does it work for freelancers with irregular income?",
      a: "Yes. Set your typical monthly take-home, and override the 50/30/20 split during rough months. Sinking funds recalculate 'required per month' automatically.",
    },
    {
      q: "Do you support Islamic finance?",
      a: "Yes. Flip the Debts view to Islamic mode — 'interest' becomes 'profit rate', debts get a Shariah-aligned pill, and the amortisation table's Interest column becomes Profit. Same math, correct framing.",
    },
    {
      q: "Where is my data?",
      a: "Postgres in Singapore (Supabase, ap-southeast-1). Every table has row-level security so your data is walled off from other users at the database level, not just in the app.",
    },
    {
      q: "Can I export it?",
      a: "One click. Settings → Your data → Export as JSON downloads a single .json file with every collection. You can also close your account entirely if you'd like — everything gets deleted.",
    },
  ];
  return (
    <section className="border-t border-divider bg-card/40 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="font-display text-3xl sm:text-4xl">Common questions</h2>
        <div className="mt-8 flex flex-col divide-y divide-divider">
          {items.map((it) => (
            <div key={it.q} className="py-5">
              <h3 className="font-display text-lg">{it.q}</h3>
              <p className="mt-2 text-muted">{it.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-card border border-divider bg-surface p-6 shadow-sm">
          <LineChart className="h-6 w-6 text-brand" aria-hidden="true" />
          <div className="flex-1">
            <div className="font-display text-lg">Ready to give it a run?</div>
            <div className="text-sm text-muted">
              Sign up in under 30 seconds. Free open beta.
            </div>
          </div>
          <Link
            href="/signup"
            className="rounded-lg bg-brand px-5 py-3 font-semibold text-[color:#FFF6EC] shadow-sm transition hover:brightness-105"
          >
            Start free
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-divider bg-bg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted">
        <div>
          © {new Date().getFullYear()} FASA Duit · Made for Malaysia.
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/login" className="hover:text-ink">
            Log in
          </Link>
          <Link href="/signup" className="hover:text-ink">
            Sign up
          </Link>
          <a href="#privacy" className="hover:text-ink" aria-disabled>
            Privacy
          </a>
          <a href="#terms" className="hover:text-ink" aria-disabled>
            Terms
          </a>
          <a href="mailto:hello@fasa.duit" className="hover:text-ink">
            hello@fasa.duit
          </a>
        </div>
      </div>
    </footer>
  );
}
