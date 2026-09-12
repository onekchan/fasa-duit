import Link from "next/link";
import { login } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { LanguageToggle } from "@/components/app-shell/LanguageToggle";
import { getLangFromCookies } from "@/lib/lang";
import { t as tByLang } from "@/lib/i18n";

/**
 * Login page. Server component + a Server Action for the submit. Reads the
 * `lang` cookie so a visitor coming from the BM landing keeps their language
 * through the auth flow.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const lang = await getLangFromCookies();
  const s = tByLang(lang).auth.login;
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="mb-6 flex justify-end">
        <LanguageToggle current={lang} variant="compact" />
      </div>
      <h1 className="font-display text-3xl">{s.title}</h1>
      <p className="mt-2 text-muted">{s.sub}</p>

      <LoginForm searchParamsPromise={searchParams} strings={s} />

      <p className="mt-6 text-sm text-muted">
        {s.newHere}{" "}
        <Link href="/signup" className="font-semibold text-brand underline underline-offset-2">
          {s.signupLink}
        </Link>
      </p>
    </main>
  );
}

async function LoginForm({
  searchParamsPromise,
  strings,
}: {
  searchParamsPromise: Promise<{ next?: string; error?: string }>;
  strings: ReturnType<typeof tByLang>["auth"]["login"];
}) {
  const sp = await searchParamsPromise;
  return (
    <form action={login} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />

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
      </label>

      {sp.error && <p className="text-sm text-danger">{sp.error}</p>}

      <SubmitButton className="mt-2 !py-2.5" loadingLabel={strings.submitting}>
        {strings.submit}
      </SubmitButton>
    </form>
  );
}
