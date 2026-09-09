import type { Config } from "tailwindcss";

/**
 * FASA Duit design tokens. All colors reference CSS custom properties in
 * `app/globals.css` so theme (light/dark/system) swap happens via [data-theme]
 * without rebuilding Tailwind.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        card: "var(--card)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        brand: "var(--brand)",
        accent: "var(--accent)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        divider: "var(--divider)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(62,42,31,.06)",
        md: "0 1px 2px rgba(62,42,31,.06), 0 8px 24px rgba(62,42,31,.06)",
      },
      transitionTimingFunction: {
        calm: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
