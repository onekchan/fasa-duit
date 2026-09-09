import type { Metadata } from "next";
import { Suspense } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { TopProgressBar } from "@/components/app-shell/TopProgressBar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Resolve the site URL for OG tags + metadata. Priority:
//   1. NEXT_PUBLIC_SITE_URL if you set it (e.g. a custom domain).
//   2. VERCEL_URL which Vercel automatically injects into every deployment
//      (like `fasa-duit-abc.vercel.app`). We prefix it with https.
//   3. Localhost for local dev.
// Uses `||` (not `??`) so an empty-string env var falls through to the next
// option instead of tripping `new URL("")`.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: "FASA Duit — Malaysian-first budget tracker",
    template: "%s · FASA Duit",
  },
  description:
    "A warm, calm budget tracker built for Malaysia. 50/30/20 by default, sinking funds, debt payoff, all in Ringgit. English + Bahasa Malaysia.",
  metadataBase: new URL(siteUrl),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
