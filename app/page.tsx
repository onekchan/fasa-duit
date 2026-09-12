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
import { AdSlot } from "@/components/ads/AdSlot";
import { LanguageToggle } from "@/components/app-shell/LanguageToggle";
import { t as tByLang } from "@/lib/i18n";
import { getLangFromCookies } from "@/lib/lang";

/**
 * Public marketing landing. Server Component that reads the `lang` cookie so
 * anonymous visitors see the language they picked last time — no client-side
 * hydration flip. Copy leans Malaysian-first — Hari Raya, PTPTN, EPF,
 * Ringgit-first — so a KL professional lands and immediately feels this app
 * was made for them.
 *
 * Design tokens are the same warm palette used inside the app, so the whole
 * page themes automatically in light and dark.
 */
export default async function LandingPage() {
  const lang = await getLangFromCookies();
  const l = tByLang(lang).landing;
  return (
    <>
      <TopNav strings={l} lang={lang} />
      <Hero strings={l} />
      <FeatureStrip strings={l} />
      <DashboardMockup strings={l} />
      <TrustStrip strings={l} />
      <Faq strings={l} />
      {/* Non-intrusive ad slot — public landing, above the footer, well below
          the hero + CTA so the signup story stays clean. Visible to anonymous
          visitors too, so we count impressions from the start. */}
      <div className="mx-auto max-w-[1120px] px-6 md:px-10">
        <AdSlot slotId="landing-above-footer" placeholderLabel="Ad space · above footer" />
      </div>
      <Footer strings={l} />
    </>
  );
}

type L = ReturnType<typeof tByLang>["landing"];

// ─── Top nav ────────────────────────────────────────────────────────────────
function TopNav({ strings, lang }: { strings: L; lang: "en" | "ms" }) {
  return (
    <header className="sticky top-0 z-10 border-b border-divider/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-bold text-brand">
          FASA Duit
        </Link>
        <nav className="flex items-center gap-2 text-sm font-semibold">
          <LanguageToggle current={lang} variant="compact" />
          <Link
            href="/login"
            className="hidden rounded-lg px-4 py-2 text-ink transition-colors hover:bg-card sm:inline"
          >
            {strings.topnav.login}
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-brand px-4 py-2 text-[color:#FFF6EC] shadow-sm transition hover:brightness-105"
          >
            {strings.topnav.signup}
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero({ strings }: { strings: L }) {
  const h = strings.hero;
  return (
    <section className="mx-auto max-w-6xl px-5 pt-10 sm:px-6 sm:pt-24">
      <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {h.badge}
          </span>
          <h1 className="mt-5 font-display text-[2.25rem] leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            {h.headlinePart1}
            <span className="text-brand">{h.headlineHighlight}</span>
            {h.headlinePart2}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{h.sub}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-3 font-semibold text-[color:#FFF6EC] shadow-sm transition hover:brightness-105"
            >
              {h.ctaStart}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-divider px-5 py-3 font-semibold text-ink transition-colors hover:bg-card"
            >
              {h.ctaLogin}
            </Link>
          </div>

          <p className="mt-6 text-sm text-muted">{h.dataNote}</p>
        </div>

        {/* Hero art — soft calm coins / bar-y motif done with just SVG + tokens */}
        <div className="relative">
          <HeroArt strings={strings} />
        </div>
      </div>
    </section>
  );
}

function HeroArt({ strings }: { strings: L }) {
  return (
    <div className="relative aspect-square w-full max-w-[420px] mx-auto">
      <div className="absolute inset-0 rounded-[32%] bg-card" />
      <div className="absolute inset-6 rounded-[30%] bg-surface shadow-md" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid w-3/4 gap-4">
          <FakeBar label={strings.hero.artNeeds} pct={40} tone="accent" />
          <FakeBar label={strings.hero.artWants} pct={22} tone="warning" />
          <FakeBar label={strings.hero.artSavings} pct={65} tone="brand" />
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
function FeatureStrip({ strings }: { strings: L }) {
  const f = strings.features;
  const items = [
    { icon: <BarChart3 className="h-5 w-5" />, title: f.f1Title, body: f.f1Body },
    { icon: <PiggyBank className="h-5 w-5" />, title: f.f2Title, body: f.f2Body },
    { icon: <Coins className="h-5 w-5" />, title: f.f3Title, body: f.f3Body },
    { icon: <Landmark className="h-5 w-5" />, title: f.f4Title, body: f.f4Body },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl sm:text-4xl">{f.heading}</h2>
        <p className="mt-3 text-muted">{f.sub}</p>
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
function DashboardMockup({ strings }: { strings: L }) {
  const m = strings.mockup;
  return (
    <section className="border-y border-divider bg-card/40 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl sm:text-4xl">{m.heading}</h2>
          <p className="mt-3 text-muted">{m.sub}</p>
        </div>

        {/* Fake dashboard — mirrors the real one at a glance */}
        <div className="mx-auto mt-12 max-w-4xl rounded-card border border-divider bg-surface p-6 shadow-md">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="font-display text-2xl">{m.thisMonth}</div>
            <div className="text-xs text-muted">{m.daysLeft}</div>
          </div>

          <div className="space-y-3">
            <MockMeter label={m.needs} spent={m.spentNeeds} pct={20} usedLabel={m.used} />
            <MockMeter label={m.wants} spent={m.spentWants} pct={9} usedLabel={m.used} />
            <MockMeter label={m.savings} spent={m.spentSavings} pct={50} usedLabel={m.used} />
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-card border border-divider bg-card px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-brand">
              <PiggyBank className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-semibold text-ink">{m.hariRayaName}</div>
              <div className="text-muted">{m.hariRayaNudge}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-card border border-divider bg-card p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <div className="font-display text-lg">{m.whereMoneyWent}</div>
                <div className="rounded-lg border border-divider bg-surface px-2 py-1 text-[11px] font-semibold text-ink">
                  {m.thisMonthPill}
                </div>
              </div>
              <MockDonut totalSpentLabel={m.totalSpent} />
            </div>
            <div className="rounded-card border border-divider bg-card p-5">
              <div className="font-display text-lg">{m.topMerchants}</div>
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
  usedLabel,
}: {
  label: string;
  spent: string;
  pct: number;
  usedLabel: string;
}) {
  return (
    <div>
      <div className="mb-1 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
        <span className="font-semibold">{label}</span>
        <span className="text-xs text-muted">
          {spent} · {pct}% {usedLabel}
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
function MockDonut({ totalSpentLabel }: { totalSpentLabel: string }) {
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
          <div className="text-[10px] text-muted">{totalSpentLabel}</div>
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
function TrustStrip({ strings }: { strings: L }) {
  const points = [
    { title: strings.trust.p1Title, body: strings.trust.p1Body },
    { title: strings.trust.p2Title, body: strings.trust.p2Body },
    { title: strings.trust.p3Title, body: strings.trust.p3Body },
    { title: strings.trust.p4Title, body: strings.trust.p4Body },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
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
function Faq({ strings }: { strings: L }) {
  const f = strings.faq;
  const items = [
    { q: f.q1, a: f.a1 },
    { q: f.q2, a: f.a2 },
    { q: f.q3, a: f.a3 },
    { q: f.q4, a: f.a4 },
    { q: f.q5, a: f.a5 },
  ];
  return (
    <section className="border-t border-divider bg-card/40 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        <h2 className="font-display text-3xl sm:text-4xl">{f.heading}</h2>
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
            <div className="font-display text-lg">{f.ctaTitle}</div>
            <div className="text-sm text-muted">{f.ctaSub}</div>
          </div>
          <Link
            href="/signup"
            className="rounded-lg bg-brand px-5 py-3 font-semibold text-[color:#FFF6EC] shadow-sm transition hover:brightness-105"
          >
            {f.ctaBtn}
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer({ strings }: { strings: L }) {
  const f = strings.footer;
  return (
    <footer className="border-t border-divider bg-bg">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-sm text-muted">
        <div>
          © {new Date().getFullYear()} FASA Duit · {f.tagline}
        </div>
        <div className="flex flex-wrap gap-5">
          <Link href="/login" className="hover:text-ink">
            {f.login}
          </Link>
          <Link href="/signup" className="hover:text-ink">
            {f.signup}
          </Link>
          <a href="#privacy" className="hover:text-ink" aria-disabled>
            {f.privacy}
          </a>
          <a href="#terms" className="hover:text-ink" aria-disabled>
            {f.terms}
          </a>
          <a href="mailto:hello@fasa.duit" className="hover:text-ink">
            hello@fasa.duit
          </a>
        </div>
      </div>
    </footer>
  );
}
