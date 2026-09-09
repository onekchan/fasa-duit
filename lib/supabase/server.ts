import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Supabase client for use inside Server Components, Server Actions, and
 * Route Handlers. Reads/writes auth cookies via `next/headers`, so RLS
 * automatically sees the signed-in user's `auth.uid()`.
 *
 * Never import this from a "use client" file — it uses `next/headers` which
 * throws in the browser bundle.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase env is not configured. Copy .env.example to .env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  const cookieStore = await cookies();

  return createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
              cookieStore.set(name, value, options as CookieOptions),
            );
          } catch {
            // The `setAll` method is called from a Server Component.
            // Ignored when handled by middleware.
          }
        },
      },
    },
  );
}
