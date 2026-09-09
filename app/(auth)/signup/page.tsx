import Link from "next/link";
import { signup } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl">Start FASA Duit</h1>
      <p className="mt-2 text-muted">Free open beta. Your data stays yours.</p>

      <SignupForm searchParamsPromise={searchParams} />

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand underline underline-offset-2">
          Log in
        </Link>
      </p>
    </main>
  );
}

async function SignupForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ error?: string; sent?: string }>;
}) {
  const sp = await searchParamsPromise;

  if (sp.sent) {
    return (
      <div className="mt-8 rounded-card border border-divider bg-card p-6">
        <p className="font-semibold">Check your email</p>
        <p className="mt-2 text-sm text-muted">
          We sent you a confirmation link. Click it to finish setting up your
          account, then come back and log in.
        </p>
      </div>
    );
  }

  return (
    <form action={signup} className="mt-8 flex flex-col gap-4">
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
        <span className="text-xs text-muted">At least 8 characters.</span>
      </label>

      {sp.error && <p className="text-sm text-danger">{sp.error}</p>}

      <SubmitButton className="mt-2 !py-2.5" loadingLabel="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
