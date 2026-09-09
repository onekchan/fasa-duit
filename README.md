# FASA Duit

Malaysian-first personal budget tracker. Multi-user full-stack SaaS. Ringgit-first, English + Bahasa Malaysia. Free open beta.

## Stack

- **Next.js 15** App Router + React 19 + TypeScript strict
- **Supabase** (Postgres + Auth + Storage + Realtime) — Singapore region
- **Tailwind CSS** with warm design tokens
- **Recharts** for charts, **Lucide** for icons
- **Vercel** for hosting

See [CLAUDE.md](CLAUDE.md) for the full architecture rulebook and [MEMORY.md](MEMORY.md) for the running decisions log.

## Local development

### Prerequisites

- Node.js ≥ 20
- Docker Desktop (for the local Supabase stack)
- The Supabase CLI is installed as a dev dependency; use `npx supabase …`

### Setup

```bash
# 1. Install deps
npm install

# 2. Copy env template and fill in Supabase project values
cp .env.example .env.local
# — For local dev, `npx supabase start` prints the anon key + URL

# 3. Start the local Supabase stack (Postgres + Auth + Storage + Studio)
npm run db:start

# 4. Apply migrations + run seed
npm run db:reset

# 5. Generate typed DB types (for editor autocomplete + strict types)
npm run db:types

# 6. Run the Next.js dev server
npm run dev
```

Open http://localhost:3000. The local Supabase Studio is at http://127.0.0.1:54323.

### Common tasks

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # next lint
npm run format        # prettier --write .
npm test              # (Vitest, to be added)
npm run db:types      # regenerate types/supabase.ts after any schema change
```

### Schema changes

1. `npx supabase migration new <slug>` creates a new SQL file under `supabase/migrations/`.
2. Edit the SQL. Add RLS policies before the table takes rows.
3. `npm run db:reset` to re-apply everything locally.
4. `npm run db:types` to regenerate `types/supabase.ts`.
5. When merged to `main`, `npm run db:push` deploys to hosted Supabase.

## Deployment

- Push to `main` → Vercel deploys.
- Environment variables live in the Vercel dashboard. Never commit `.env.local`.
- Supabase project region: **ap-southeast-1 (Singapore)** for PDPA + latency.

## Design reference

`index.html` is the single-file React prototype we built before the SaaS pivot. Treat it as the **UX + design bible** when porting components. It is not the shipping product.
