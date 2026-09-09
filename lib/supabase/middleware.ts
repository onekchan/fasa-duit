import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refresh the Supabase session on every request so cookies stay fresh. Called
 * from the top-level middleware.ts. Also gates the authenticated app shell:
 * unauthenticated visitors hitting /(app) routes get bounced to /login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // When env isn't configured yet (fresh clone, no .env.local), skip the auth
  // check and let public pages render. Auth-gated routes will still fail
  // fast when they actually hit Supabase — surface a clearer error there.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(
    url,
    anon,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = ["/login", "/signup", "/reset"].some((p) => path.startsWith(p));
  // API routes handle their own auth (cron uses a bearer secret, /auth/callback
  // exchanges an OAuth code). Never redirect them to /login — that turns a
  // legitimate 200/401 JSON response into an HTML sign-in page and breaks
  // both curl/Vercel Cron and the OAuth callback flow.
  const isApiRoute = path.startsWith("/api/");
  const isPublicRoute =
    path === "/" || path.startsWith("/auth") || isApiRoute || isAuthRoute;

  // Authenticated user visiting an auth page? Send them into the app.
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Unauthenticated user visiting an app route? Send them to login.
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return response;
}
