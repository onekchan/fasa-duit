import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the browser. Use inside "use client" components for
 * mutations, realtime subscriptions, and file uploads. Auth cookies are
 * managed by @supabase/ssr and remain synced with the server client.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
