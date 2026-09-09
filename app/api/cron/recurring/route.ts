import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily cron — posts every due recurring template. Triggered by Vercel Cron at
 * 17:00 UTC (01:00 MYT) — see /vercel.json. Uses the service role client because
 * it iterates every user's rows, but the actual iteration + insert lives inside
 * the `post_due_recurring` SQL function (SECURITY DEFINER) so the logic is
 * transactional and the transaction inserts respect the same shape the app
 * would produce for a manual post.
 *
 * Auth: Vercel Cron injects `Authorization: Bearer <CRON_SECRET>` — we compare
 * against the CRON_SECRET env var. Anything else is rejected as 401 so an
 * unauthenticated hit to the endpoint can't spam-post transactions.
 */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on the server." },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("post_due_recurring");
    if (error) {
      // Service-role should always succeed; surface anything unexpected.
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      posted: typeof data === "number" ? data : 0,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
