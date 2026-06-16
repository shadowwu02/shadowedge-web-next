"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthRateLimitError, signInWithPassword } from "@/lib/auth-api";
import { getSafeAuthNext } from "@/lib/auth-routes";
import { useI18n } from "@/i18n/useI18n";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const nextPath = useMemo(() => getSafeAuthNext(searchParams.get("next"), "/workspace/video"), [searchParams]);
  const signUpHref = `/sign-up?next=${encodeURIComponent(nextPath)}`;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(searchParams.get("registered") === "1" ? t("auth.registeredSignInHint") : "");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setStatus(t("auth.enterEmailPassword"));
      return;
    }

    setIsLoading(true);

    try {
      await signInWithPassword(cleanEmail, password);
      setStatus(t("auth.signedInOpening"));
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus(isAuthRateLimitError(error) ? t("auth.tooManyAttempts") : error instanceof Error ? error.message : t("auth.signInFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[.045] p-6 shadow-2xl shadow-black/35 md:p-8">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[.22em] text-[#ffcf83]">{t("auth.accountLabel")}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">{t("auth.signIn")}</h1>
        <p className="mt-3 text-sm leading-6 text-white/58">{t("auth.signInIntro")}</p>
      </div>

      <form className="grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">{t("auth.email")}</span>
          <input
            autoComplete="email"
            className="h-12 rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#ffb44d]/65 focus:ring-4 focus:ring-[#ffb44d]/10"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={email}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[.16em] text-white/42">{t("auth.password")}</span>
          <div className="relative">
            <input
              autoComplete="current-password"
              className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 pr-20 text-sm font-semibold text-white outline-none transition placeholder:text-white/25 focus:border-[#ffb44d]/65 focus:ring-4 focus:ring-[#ffb44d]/10"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.currentPasswordPlaceholder")}
              type={showPassword ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-white/[.06] px-3 py-1 text-xs font-black text-[#ffcf83] transition hover:border-[#ffb44d]/50 hover:bg-[#ffb44d]/12 hover:text-[#ffe2ad]"
              onClick={() => setShowPassword((value) => !value)}
              type="button"
            >
              {showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
            </button>
          </div>
        </label>

        <button
          className="se-button-primary mt-2 h-12 rounded-2xl px-5 text-sm font-black focus:outline-none focus:ring-4 focus:ring-[#f6a935]/20"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? t("auth.signingIn") : t("auth.signIn")}
        </button>
      </form>

      {status ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/24 p-3 text-sm leading-6 text-white/72">
          {status}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 text-sm text-white/48 sm:flex-row sm:items-center sm:justify-between">
        <Link className="font-bold text-[#ffcf83] hover:text-[#ffc766]" href="/">
          ShadowEdge
        </Link>
        <Link className="font-bold text-[#ffcf83] hover:text-[#ffc766]" href={signUpHref}>
          {t("auth.dontHaveAccount")} {t("auth.signUp")}
        </Link>
        <span>{t("auth.continueAfterSignIn")}</span>
      </div>
    </div>
  );
}
