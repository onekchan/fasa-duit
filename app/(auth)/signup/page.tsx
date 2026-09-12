import Link from "next/link";
import { signup } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { LanguageToggle } from "@/components/app-shell/LanguageToggle";
import { getLangFromCookies } from "@/lib/lang";
import { t as tByLang } from "@/lib/i18n";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const lang = await getLangFromCookies();
  const s = tByLang(lang).auth.signup;
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="mb-6 flex justify-end">
        <LanguageToggle current={lang} variant="compact" />
      </div>
      <h1 className="font-display text-3xl">{s.title}</h1>
      <p className="mt-2 text-muted">{s.sub}</p>

      <SignupForm searchParamsPromise={searchParams} strings={s} />

      <p className="mt-6 text-sm text-muted">
        {s.already}{" "}
        <Link href="/login" className="font-semibold text-brand underline underline-offset-2">
          {s.loginLink}
        </Link>
      </p>
    </main>
  );
}

async function SignupForm({
  searchParamsPromise,
  strings,
}: {
  searchParamsPromise: Promise<{ error?: string; sent?: string }>;
  strings: ReturnType<typeof tByLang>["auth"]["signup"];
}) {
  const sp = await searchParamsPromise;

  if (sp.sent) {
    return (
      <div className="mt-8 rounded-card border border-divider bg-card p-6">
        <p className="font-semibold">{strings.confirmTitle}</p>
        <p className="mt-2 text-sm text-muted">{strings.confirmBody}</p>
      </div>
    );
  }

  return (
    <form action={signup} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{strings.email}</span>
        <input
          name="email"
          type="email"
          required
          className="rounded-lg border border-divider bg-surface px-3 py-2 focus:border-brand focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">{strings.password}</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="rounded-lg border border-divider bg-surface px-3 py-2 focus:border-brand focus:outline-none"
        />
        <span className="text-xs text-muted">{strings.passwordHint}</span>
      </label>

      {sp.error && <p className="text-sm text-danger">{sp.error}</p>}

      <SubmitButton className="mt-2 !py-2.5" loadingLabel={strings.submitting}>
        {strings.submit}
      </SubmitButton>
    </form>
  );
}
