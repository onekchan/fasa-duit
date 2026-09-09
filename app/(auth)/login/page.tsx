import Link from "next/link";
import { login } from "./actions";

/**
 * Login page. Server component + a Server Action for the submit.
 * Design pass lands in a later slice; scaffold shape only.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to FASA Duit.</p>

      <LoginForm searchParamsPromise={searchParams} />

      <p className="mt-6 text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-brand underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </main>
  );
}

async function LoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParamsPromise;
  return (
    <form action={login} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Email</span>
        <input
          name="email"
          type="email"
          required
          className="rounded-lg border border-divider bg-surface px-3 py-2 focus:border-brand focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="rounded-lg border border-divider bg-surface px-3 py-2 focus:border-brand focus:outline-none"
        />
      </label>

      {sp.error && <p className="text-sm text-danger">{sp.error}</p>}

      <button
        type="submit"
        className="mt-2 rounded-lg bg-brand px-4 py-2.5 font-semibold text-[color:#FFF6EC] shadow-sm transition hover:brightness-105"
      >
        Sign in
      </button>
    </form>
  );
}
